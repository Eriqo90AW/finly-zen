import { describe, expect, it } from "vitest";
import type { Transaction } from "../types";
import { calculatePaydayPlan, type PaydayPlan } from "../utils/paydayPlan";
import { buildTransferHistory, isCashFlowTransaction } from "../utils/transferUtils";

const entry = (patch: Partial<Transaction>): Transaction => ({
  id: "entry", accountId: "main", category: "Debt", name: "Loan repayment",
  amount: 600_000, type: "expense", date: "2026-11-25T08:00:00", note: "",
  ...patch,
});

describe("ledger entry classification", () => {
  it("pairs equal transfers by identity and keeps unresolved legacy entries visible", () => {
    const history = buildTransferHistory([
      entry({ id: "x-out", entryKind: "transfer", transferId: "x", accountId: "a" }),
      entry({ id: "y-in", entryKind: "transfer", transferId: "y", accountId: "d", type: "income" }),
      entry({ id: "x-in", entryKind: "transfer", transferId: "x", accountId: "b", type: "income" }),
      entry({ id: "y-out", entryKind: "transfer", transferId: "y", accountId: "c" }),
      entry({ id: "legacy-out", name: "Transfer to Main", isRecurring: true }),
      entry({ id: "legacy-in", name: "Transfer from Savings", type: "income", isRecurring: true }),
      entry({ id: "loan", isRecurring: true }),
    ]);
    expect(history.map(t => [t.id, t.fromAccountId, t.toAccountId, t.needsReview])).toEqual([
      ["x", "a", "b", false], ["y", "c", "d", false],
      ["legacy-out", "main", undefined, true], ["legacy-in", undefined, "main", true],
    ]);
    expect(isCashFlowTransaction(entry({ isRecurring: true }))).toBe(true);
    expect(isCashFlowTransaction(entry({ type: "income", entryKind: "opening_balance" }))).toBe(false);
  });
});

describe("payday allowance", () => {
  const today = "2026-11-25";
  const balance = entry({ id: "opening", amount: 2_000_000, type: "income", entryKind: "opening_balance" });
  const plan: PaydayPlan = {
    accountId: "main", payday: "2026-12-05", savings: 400_000,
    bills: [{ id: "bill", name: "Electricity", amount: 600_000, dueDate: "2026-11-27", paymentId: "payment" }],
  };

  it("preserves a Rp100,000 daily allowance when a bill is paid and linked", () => {
    expect(calculatePaydayPlan(plan, [balance], today)).toMatchObject({ days: 10, daily: 100_000, bills: 600_000 });
    const payment = entry({ id: "payment" });
    expect(calculatePaydayPlan(plan, [balance, payment], today))
      .toMatchObject({ available: 1_400_000, bills: 0, daily: 100_000 });
    expect(calculatePaydayPlan(plan, [balance, { ...payment, amount: 300_000 }], today))
      .toMatchObject({ available: 1_700_000, bills: 300_000, daily: 100_000 });
  });

  it("previews a purchase and moving a bill beyond payday without changing the plan", () => {
    expect(calculatePaydayPlan(plan, [balance], today, 200_000).daily).toBe(80_000);
    const moved = { ...plan, bills: [{ ...plan.bills[0], dueDate: "2026-12-06" }] };
    expect(calculatePaydayPlan(moved, [balance], today).daily).toBe(160_000);
    expect(calculatePaydayPlan(plan, [balance], today).daily).toBe(100_000);
  });

  it("credits a payment at most once and only from the funding account", () => {
    const duplicate = { ...plan, bills: [...plan.bills, { ...plan.bills[0], id: "second" }] };
    expect(calculatePaydayPlan(duplicate, [balance, entry({ id: "payment" })], today).bills).toBe(600_000);
    expect(calculatePaydayPlan(plan, [balance, entry({ id: "payment", accountId: "other" })], today).bills).toBe(600_000);
  });
});
