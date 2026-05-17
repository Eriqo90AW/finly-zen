import { supabase } from "../lib/supabase";
import { formatHexColor } from "../utils/format";
import type {
  Transaction,
  Category,
  Account,
  AddTransactionParams,
  TransactionDetailModel,
} from "../types";

export async function getTransactions() {
  const { data, error } = await supabase
    .from("view_transactions_detailed")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return (data || []).map((t) => {
    return {
      id: t.transaction_id,
      amount: t.amount,
      category: t.category_name,
      categoryIcon: t.category_icon,
      categoryColor: formatHexColor(t.category_color),
      name: t.transaction_name,
      accountName: t.account_name,
      accountColor: formatHexColor(t.account_color),
      type: t.transaction_type,
      date: t.created_at,
      note: t.note,
      isRecurring: t.is_recurring,
    };
  }) as Transaction[];
}

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [] as Category[];
  }
  return (data || []).map((cat) => ({
    ...cat,
    color: formatHexColor(cat.color),
  })) as Category[];
}

export async function getAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching accounts:", error);
    return [] as Account[];
  }
  return (data || []).map((acc) => ({
    ...acc,
    color: formatHexColor(acc.color),
  })) as Account[];
}

export async function addTransaction(
  params: AddTransactionParams,
): Promise<TransactionDetailModel> {
  try {
    const data = {
      account_id: params.accountId,
      user_id: params.userId,
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
