import { describe, expect, it } from "vitest";
import type { Account, Transaction } from "../../../types";
import {
  buildAccountFlow,
  buildCategoryBreakdown,
  buildMonthlySeries,
  buildRecurringSplit,
  buildReportsKpis,
  buildTopMerchants,
} from "./reportsAnalytics";

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: overrides.id ?? "t1",
  name: overrides.name ?? "Coffee",
  category: overrides.category ?? "Food",
  amount: overrides.amount ?? 0,
  type: overrides.type ?? "expense",
  date: overrides.date ?? "2026-04-10T10:00:00",
  accountId: overrides.accountId ?? "acc-1",
  accountName: overrides.accountName ?? "BCA",
  isRecurring: overrides.isRecurring ?? false,
  note: "",
});

const accounts: Account[] = [
  { id: "acc-1", name: "BCA", color: "#1a4d2e" },
  { id: "acc-2", name: "Jago", color: "#c29b38" },
];

describe("reportsAnalytics", () => {
  const currentMonth = new Date(2026, 3, 1).toISOString(); // April 2026

  const sampleTxs: Transaction[] = [
    // March 2026
    tx({ id: "m1", name: "Salary", category: "Salary", type: "income", amount: 10_000_000, date: "2026-03-05T10:00:00" }),
    tx({ id: "m2", name: "Starbucks", category: "Food", type: "expense", amount: 2_000_000, date: "2026-03-10T10:00:00" }),
    // April 2026
    tx({ id: "a1", name: "Salary", category: "Salary", type: "income", amount: 12_000_000, date: "2026-04-05T10:00:00" }),
    tx({ id: "a2", name: "Starbucks", category: "Food", type: "expense", amount: 1_500_000, date: "2026-04-08T10:00:00" }),
    tx({ id: "a3", name: "starbucks", category: "Food", type: "expense", amount: 500_000, date: "2026-04-14T10:00:00" }),
    tx({ id: "a4", name: "Rent", category: "Bills", type: "expense", amount: 3_000_000, isRecurring: true, date: "2026-04-02T10:00:00", accountId: "acc-2", accountName: "Jago" }),
    // Transfer (Debt + isRecurring) -> must be excluded
    tx({ id: "a5", name: "Transfer to Jago", category: "Debt", isRecurring: true, type: "expense", amount: 2_500_000, date: "2026-04-06T10:00:00" }),
  ];

  it("builds trailing monthly series and MoM KPIs while excluding transfers", () => {
    const series = buildMonthlySeries(sampleTxs, currentMonth, "1-30", 3, "");
    expect(series).toHaveLength(3);

    const mar = series[1];
    const apr = series[2];
    expect(mar.income).toBe(10_000_000);
    expect(mar.expense).toBe(2_000_000);
    expect(apr.income).toBe(12_000_000);
    expect(apr.expense).toBe(5_000_000);
    expect(apr.net).toBe(7_000_000);

    const kpis = buildReportsKpis(series);
    expect(kpis.incomeDeltaPct).toBe(20);
    expect(kpis.expenseDeltaPct).toBe(150);
    expect(kpis.savingsRate).toBe(58);
  });

  it("aggregates categories with MoM deltas, top merchants, recurring split, and account flow", () => {
    const series = buildMonthlySeries(sampleTxs, currentMonth, "1-30", 3, "");
    const prev = series[1];
    const curr = series[2];

    const categories = buildCategoryBreakdown(
      sampleTxs,
      curr.start,
      curr.end,
      prev.start,
      prev.end,
      "",
    );
    expect(categories[0]).toMatchObject({ name: "Bills", current: 3_000_000, previous: 0, sharePct: 60 });
    expect(categories[1]).toMatchObject({ name: "Food", current: 2_000_000, previous: 2_000_000, sharePct: 40, deltaPct: 0 });

    const merchants = buildTopMerchants(sampleTxs, curr.start, curr.end, "", 5);
    expect(merchants[0]).toMatchObject({ name: "Rent", total: 3_000_000, count: 1 });
    expect(merchants[1]).toMatchObject({ name: "Starbucks", total: 2_000_000, count: 2 });

    const split = buildRecurringSplit(sampleTxs, curr.start, curr.end, "");
    expect(split).toEqual({ recurring: 3_000_000, discretionary: 2_000_000, recurringPct: 60, discretionaryPct: 40 });

    const flow = buildAccountFlow(accounts, sampleTxs, curr.start, curr.end);
    expect(flow.find((a) => a.id === "acc-1")).toMatchObject({
      inflow: 12_000_000,
      outflow: 2_000_000,
      net: 10_000_000,
    });
    expect(flow.find((a) => a.id === "acc-2")).toMatchObject({
      inflow: 0,
      outflow: 3_000_000,
      net: -3_000_000,
    });
  });
});
