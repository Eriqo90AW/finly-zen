import type { Budget, Transaction } from "../types";
import { isDateInRange } from "./date";
import { isCashFlowTransaction } from "./transferUtils";
export function summarizeBudgets(transactions: Transaction[], budgets: Budget[], start: Date, end: Date, accountId: string) {
  const map = new Map<string, { name: string; spent: number; limit: number | null }>();
  for (const b of budgets) map.set(b.category.trim().toLowerCase(), { name: b.category, spent: 0, limit: b.limit > 0 ? b.limit : null });
  for (const t of transactions) {
    if (t.type !== "expense" || !isCashFlowTransaction(t) || !isDateInRange(t.date, start, end) || (accountId && t.accountId !== accountId)) continue;
    const key = t.category.trim().toLowerCase();
    if (!map.has(key)) map.set(key, { name: t.category, spent: 0, limit: null });
    map.get(key)!.spent += t.amount;
  }
  return Array.from(map.values()).sort((a,b) => b.spent - a.spent || a.name.localeCompare(b.name));
}
