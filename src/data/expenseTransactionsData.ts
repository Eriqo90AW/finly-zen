import { supabase } from "../lib/supabase";
import { resolveUserId } from "../lib/userSession";
import { mapTransactionDetail } from "./expenseMappers";
import type {
  Transaction,
  AddTransactionParams,
  UpdateTransactionParams,
  TransactionDetailModel,
} from "../types";

export interface AddTransactionsItemResult {
  index: number;
  success: boolean;
  data?: TransactionDetailModel;
  error?: string;
}

export async function getTransactions(): Promise<Transaction[]> {
  const userId = await resolveUserId();
  const pageSize = 500;
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from("view_transactions_detailed")
      .select("*")
      .order("created_at", { ascending: false })
      .order("transaction_id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load transactions: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows.map(mapTransactionDetail);
}

export async function addTransaction(
  params: AddTransactionParams,
): Promise<TransactionDetailModel> {
  try {
    const userId = params.userId || (await resolveUserId());
    const data = {
      account_id: params.accountId,
      user_id: userId,
      name: params.name,
      type: params.type,
      amount: params.amount,
      category_id: params.categoryId,
      note: params.note,
      attachment_url: params.attachmentUrl,
      is_recurring: params.isRecurring,
      created_at: params.createdAt ? params.createdAt.toISOString() : undefined,
    };

    const { data: insertData, error: insertError } = await supabase
      .from("transactions")
      .insert(data)
      .select("id")
      .single();

    if (insertError) throw insertError;

    const newTransactionId = insertData.id;

    const { data: viewData, error: viewError } = await supabase
      .from("view_transactions_detailed")
      .select()
      .eq("transaction_id", newTransactionId)
      .single();

    if (viewError) throw viewError;

    return viewData as TransactionDetailModel;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("Failed to add transaction:", e);
    throw new Error(`Failed to add transaction: ${errorMessage}`);
  }
}

export async function updateTransaction(
  params: UpdateTransactionParams,
): Promise<Transaction> {
  try {
    const userId = params.userId || (await resolveUserId());
    const data: Record<string, unknown> = {
      account_id: params.accountId,
      category_id: params.categoryId,
      name: params.name,
      type: params.type,
      amount: params.amount,
      note: params.note,
      is_recurring: params.isRecurring,
      created_at:
        params.date instanceof Date ? params.date.toISOString() : params.date,
    };

    if (params.attachmentUrl !== undefined) {
      data.attachment_url = params.attachmentUrl;
    }

    let updateQuery = supabase
      .from("transactions")
      .update(data)
      .eq("id", params.id);

    if (userId) {
      updateQuery = updateQuery.eq("user_id", userId);
    }

    const { error: updateError } = await updateQuery;
    if (updateError) throw updateError;

    let viewQuery = supabase
      .from("view_transactions_detailed")
      .select()
      .eq("transaction_id", params.id);

    if (userId) {
      viewQuery = viewQuery.eq("user_id", userId);
    }

    const { data: viewData, error: viewError } = await viewQuery.single();
    if (viewError) throw viewError;

    return mapTransactionDetail(viewData);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("Failed to update transaction:", e);
    throw new Error(`Failed to update transaction: ${errorMessage}`);
  }
}

export async function addTransactions(
  items: AddTransactionParams[],
  concurrency = 4,
): Promise<AddTransactionsItemResult[]> {
  if (!items || items.length === 0) return [];

  const results: AddTransactionsItemResult[] = new Array(items.length);
  let currentIndex = 0;
  let savedAny = false;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      try {
        const detail = await addTransaction(item);
        results[idx] = { index: idx, success: true, data: detail };
        savedAny = true;
      } catch (err) {
        results[idx] = {
          index: idx,
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to add transaction",
        };
      }
    }
  }

  const poolSize = Math.min(concurrency, items.length);
  const workers = Array.from({ length: poolSize }, () => worker());
  await Promise.all(workers);

  if (savedAny && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("finly:data-changed", {
        detail: {
          source: "add_transactions_batch",
          count: results.filter((r) => r.success).length,
        },
      }),
    );
  }

  return results;
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    if (!id) return;

    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      console.error("Error deleting transaction:", error);
      throw error;
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("Failed to delete transaction:", e);
    throw new Error(`Failed to delete transaction: ${errorMessage}`);
  }
}
