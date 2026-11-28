import type { Account, DatePeriod, Transaction } from "../types";
import { getDateRange, isDateInRange } from "./date";
import { isTransferTransaction } from "./transferUtils";

/**
 * Computes each account's net balance (income - expenses, excluding transfers)
 * for the selected month and date period, matching Dashboard HeroCard period math.
 */
export function computePeriodAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  currentMonth: string,
  datePeriod: DatePeriod,
): Account[] {
  const { start, end } = getDateRange(currentMonth, datePeriod);
  const balances = new Map<string, number>();
  const nameToId = new Map<string, string>();

  for (const acc of accounts) {
    balances.set(acc.id, 0);
    nameToId.set(acc.name.trim().toLowerCase(), acc.id);
  }

  for (const t of transactions) {
    if (!isDateInRange(t.date, start, end)) continue;
    if (isTransferTransaction(t)) continue;

    let targetId =
      t.accountId && balances.has(t.accountId) ? t.accountId : undefined;
    if (!targetId && t.accountName) {
      targetId = nameToId.get(t.accountName.trim().toLowerCase());
    }
    if (!targetId) continue;

    const current = balances.get(targetId) ?? 0;
    const amount = t.amount || 0;
    if (t.type === "income") {
      balances.set(targetId, current + amount);
    } else if (t.type === "expense") {
      balances.set(targetId, current - amount);
    }
  }

  return accounts.map((acc) => ({
    ...acc,
    balance: balances.get(acc.id) ?? 0,
  }));
}
