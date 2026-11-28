import type { Transaction } from "../types";

export type TransferTransactionCandidate =
  | Partial<Transaction>
  | {
      category?: string;
      category_name?: string;
      isRecurring?: boolean;
      is_recurring?: boolean;
    };

/**
 * Checks if a transaction represents a legacy debt recurring transaction.
 * These are background transactions that are filtered out from general dashboard analytics.
 */
export function isTransferTransaction(t: TransferTransactionCandidate): boolean {
  const category =
    "category" in t && t.category
      ? t.category
      : "category_name" in t
        ? t.category_name
        : undefined;
  const isRec =
    "isRecurring" in t && t.isRecurring !== undefined
      ? t.isRecurring
      : "is_recurring" in t
        ? t.is_recurring
        : undefined;
  if (!category) return false;
  return category.toLowerCase() === "debt" && Boolean(isRec);
}
