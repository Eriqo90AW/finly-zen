import type { Transaction } from "../types";
import { getLocalYmd } from "./date";
import { isCashFlowTransaction } from "./transferUtils";

export interface PlannedBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  paymentId: string;
}

export interface PaydayPlan {
  accountId: string;
  payday: string;
  savings: number;
  bills: PlannedBill[];
}

export function calculatePaydayPlan(plan: PaydayPlan, ledger: Transaction[], today: string, purchase = 0) {
  const days = Math.max(0, (Date.parse(plan.payday) - Date.parse(today)) / 86_400_000 || 0);
  let available = 0;
  const payments = new Map<string, number>();
  for (const entry of ledger) {
    if (entry.accountId !== plan.accountId || getLocalYmd(entry.date) > today) continue;
    available += entry.type === "income" ? entry.amount : -entry.amount;
    if (entry.type === "expense" && isCashFlowTransaction(entry) && entry.amount > 0) {
      payments.set(entry.id, entry.amount);
    }
  }
  const outstanding = new Map<string, number>();
  let bills = 0;
  for (const bill of plan.bills) {
    if (!bill.dueDate || bill.dueDate >= plan.payday) continue;
    const paid = payments.get(bill.paymentId) ?? 0;
    payments.delete(bill.paymentId);
    const remaining = Math.max(0, bill.amount - paid);
    outstanding.set(bill.id, remaining);
    bills += remaining;
  }
  const discretionary = available - bills - plan.savings - purchase;
  const daily = days > 0 ? Math.max(0, Math.floor(discretionary / days)) : 0;
  return { available, bills, days, discretionary, daily, outstanding };
}
