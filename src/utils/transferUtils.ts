import type { Transaction, TransferRecord } from "../types";

export function isTransferTransaction(t: Transaction): boolean {
  return t.entryKind === "transfer";
}

export function isCashFlowTransaction(t: Transaction): boolean {
  return !isTransferTransaction(t) && t.entryKind !== "opening_balance";
}

export function buildTransferHistory(transactions: Transaction[]): TransferRecord[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const isLegacyCandidate = t.isRecurring && t.category.toLowerCase() === "debt"
      && t.name.startsWith(t.type === "expense" ? "Transfer to " : "Transfer from ");
    if (!isTransferTransaction(t) && !isLegacyCandidate) continue;
    const id = t.transferId ?? t.id;
    const group = groups.get(id) ?? [];
    group.push(t);
    groups.set(id, group);
  }

  return Array.from(groups, ([id, entries]) => {
    const expense = entries.find(t => t.type === "expense");
    const income = entries.find(t => t.type === "income");
    const t = expense ?? entries[0];
    return {
      id,
      transactionIds: entries.map(entry => entry.id),
      needsReview: !expense || !income,
      fromAccountId: expense?.accountId,
      fromAccountName: expense?.accountName || income?.name.match(/^Transfer from (.+)$/)?.[1] || "Unknown account",
      fromAccountColor: expense?.accountColor,
      toAccountId: income?.accountId,
      toAccountName: income?.accountName || expense?.name.match(/^Transfer to (.+)$/)?.[1] || "Unknown account",
      toAccountColor: income?.accountColor,
      amount: t.amount,
      date: t.date,
      note: t.note,
      isRecurring: Boolean(t.isRecurring),
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
