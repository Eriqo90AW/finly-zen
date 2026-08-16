import type { Transaction } from "../types";

/**
 * Checks if a transaction represents a legacy debt recurring transaction.
 * These are background transactions that are filtered out from general dashboard analytics.
 */
export function isTransferTransaction(
  t:
    | Partial<Transaction>
    | {
        category?: string;
        category_name?: string;
        isRecurring?: boolean;
        is_recurring?: boolean;
      },
): boolean {
  const category = (t as any).category || (t as any).category_name;
  const isRec = (t as any).isRecurring ?? (t as any).is_recurring;
  if (!category) return false;
  return category.toLowerCase() === "debt" && Boolean(isRec);
}
