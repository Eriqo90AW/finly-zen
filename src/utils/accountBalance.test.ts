import { describe, expect, it } from "vitest";
import type { Account, Transaction } from "../types";
import { computePeriodAccountBalances } from "./accountBalance";

const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: overrides.id ?? "tx-1",
  name: overrides.name ?? "Sample",
  category: overrides.category ?? "Food",
  amount: overrides.amount ?? 0,
  type: overrides.type ?? "expense",
  date: overrides.date ?? "2026-04-10T10:00:00",
  accountId: "accountId" in overrides ? overrides.accountId : "acc-bca",
  accountName: overrides.accountName ?? "BCA",
  accountColor: overrides.accountColor ?? "#1a4d2e",
  isRecurring: overrides.isRecurring ?? false,
  note: overrides.note ?? "",
});

const accounts: Account[] = [
  { id: "acc-bca", name: "BCA", color: "#1a4d2e" },
  { id: "acc-jago", name: "Jago", color: "#c29b38" },
  { id: "acc-cash", name: "Cash", color: "#52c278" },
];

describe("computePeriodAccountBalances", () => {
  it("computes period net per account across 1-30, 21-20, and 25-25 periods and excludes transfers", () => {
    const currentMonth = new Date(2026, 3, 1).toISOString(); // April 2026
    const txs: Transaction[] = [
      // Inside all April periods (Apr 10)
      makeTx({ id: "1", type: "income", amount: 5_000_000, date: "2026-04-10T09:00:00", accountId: "acc-bca", accountName: "BCA" }),
      makeTx({ id: "2", type: "expense", amount: 1_200_000, date: "2026-04-12T09:00:00", accountId: "acc-bca", accountName: "BCA" }),
      // Inside 21-20 (Mar 21 - Apr 20) but outside 1-30 and 25-25 (Mar 26 - Apr 25)
      makeTx({ id: "3", type: "income", amount: 2_000_000, date: "2026-03-24T09:00:00", accountId: "acc-jago", accountName: "Jago" }),
      makeTx({ id: "4", type: "expense", amount: 500_000, date: "2026-04-05T09:00:00", accountId: "acc-jago", accountName: "Jago" }),
      // Inside 25-25 (Mar 26 - Apr 25) and 21-20, outside 1-30
      makeTx({ id: "7", type: "income", amount: 300_000, date: "2026-03-28T09:00:00", accountId: "acc-cash", accountName: "Cash" }),
      // Transfer inside period (Debt + isRecurring) -> must be excluded like HeroCard
      makeTx({ id: "5", type: "expense", amount: 1_000_000, category: "Debt", isRecurring: true, name: "Transfer to Jago", date: "2026-04-11T09:00:00", accountId: "acc-bca", accountName: "BCA" }),
      // Outside all April periods (Feb 2026)
      makeTx({ id: "6", type: "income", amount: 9_000_000, date: "2026-02-15T09:00:00", accountId: "acc-bca", accountName: "BCA" }),
    ];

    const monthly = computePeriodAccountBalances(accounts, txs, currentMonth, "1-30");
    expect(monthly.find((a) => a.id === "acc-bca")?.balance).toBe(3_800_000);
    expect(monthly.find((a) => a.id === "acc-jago")?.balance).toBe(-500_000);
    expect(monthly.find((a) => a.id === "acc-cash")?.balance).toBe(0);

    const payroll21 = computePeriodAccountBalances(accounts, txs, currentMonth, "21-20");
    expect(payroll21.find((a) => a.id === "acc-bca")?.balance).toBe(3_800_000);
    expect(payroll21.find((a) => a.id === "acc-jago")?.balance).toBe(1_500_000);
    expect(payroll21.find((a) => a.id === "acc-cash")?.balance).toBe(300_000);

    const payroll25 = computePeriodAccountBalances(accounts, txs, currentMonth, "25-25");
    expect(payroll25.find((a) => a.id === "acc-jago")?.balance).toBe(-500_000);
    expect(payroll25.find((a) => a.id === "acc-cash")?.balance).toBe(300_000);
  });

  it("falls back to case-insensitive accountName matching when accountId is missing", () => {
    const currentMonth = new Date(2026, 3, 1).toISOString();
    const txs: Transaction[] = [
      makeTx({ id: "1", type: "income", amount: 750_000, accountId: undefined, accountName: "cash", date: "2026-04-15T12:00:00" }),
    ];

    const result = computePeriodAccountBalances(accounts, txs, currentMonth, "1-30");
    expect(result.find((a) => a.id === "acc-cash")?.balance).toBe(750_000);
  });
});
