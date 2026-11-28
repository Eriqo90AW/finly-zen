import { formatHexColor } from "../utils/format";
import type { Transaction, TransactionType } from "../types";

interface RawTransactionRecord {
  transaction_id?: string | number | null;
  id?: string | number | null;
  amount?: number | string | null;
  category_name?: string | null;
  category?: string | null;
  category_icon?: string | null;
  categoryIcon?: string | null;
  category_color?: string | null;
  categoryColor?: string | null;
  category_id?: string | null;
  categoryId?: string | null;
  transaction_name?: string | null;
  name?: string | null;
  account_name?: string | null;
  accountName?: string | null;
  account_color?: string | null;
  accountColor?: string | null;
  account_id?: string | null;
  accountId?: string | null;
  transaction_type?: string | null;
  type?: string | null;
  created_at?: string | null;
  date?: string | Date | null;
  note?: string | null;
  is_recurring?: boolean | null;
  isRecurring?: boolean | null;
}

export function mapTransactionDetail(t: unknown): Transaction {
  if (!t || typeof t !== "object") {
    return {
      id: "",
      amount: 0,
      category: "General",
      name: "Untitled",
      type: "expense",
      date: new Date().toISOString(),
      note: "",
      isRecurring: false,
    };
  }

  const raw = t as RawTransactionRecord;
  const rawType = raw.transaction_type || raw.type;
  const type: TransactionType = rawType === "income" ? "income" : "expense";

  return {
    id: String(raw.transaction_id || raw.id || ""),
    amount: Number(raw.amount) || 0,
    category: raw.category_name || raw.category || "General",
    categoryIcon: raw.category_icon || raw.categoryIcon || undefined,
    categoryColor: formatHexColor(raw.category_color || raw.categoryColor || undefined),
    categoryId: raw.category_id || raw.categoryId || undefined,
    name: raw.transaction_name || raw.name || "Untitled",
    accountName: raw.account_name || raw.accountName || undefined,
    accountColor: formatHexColor(raw.account_color || raw.accountColor || undefined),
    accountId: raw.account_id || raw.accountId || undefined,
    type,
    date:
      raw.created_at ||
      (raw.date ? new Date(raw.date).toISOString() : new Date().toISOString()),
    note: raw.note || "",
    isRecurring: Boolean(raw.is_recurring ?? raw.isRecurring),
  };
}
