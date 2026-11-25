import { supabase } from "../lib/supabase";
import { formatHexColor } from "../utils/format";
import { resolveUserId } from "../lib/userContext";
import { buildTransferHistory } from "../utils/transferUtils";
import type {
  Transaction,
  TransactionType,
  Category,
  Account,
  AddTransactionParams,
  UpdateTransactionParams,
  TransactionDetailModel,
  AddTransferParams,
  TransferRecord,
} from "../types";

export function mapTransactionDetail(t: any): Transaction {
  if (!t) {
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

  const rawType = t.transaction_type || t.type;
  const type: TransactionType = rawType === "income" ? "income" : "expense";

  return {
    id: String(t.transaction_id || t.id || ""),
    amount: Number(t.amount) || 0,
    category: t.category_name || t.category || "General",
    categoryIcon: t.category_icon || t.categoryIcon || undefined,
    categoryColor: formatHexColor(t.category_color || t.categoryColor),
    categoryId: t.category_id || t.categoryId || undefined,
    name: t.transaction_name || t.name || "Untitled",
    accountName: t.account_name || t.accountName || undefined,
    accountColor: formatHexColor(t.account_color || t.accountColor),
    accountId: t.account_id || t.accountId || undefined,
    type,
    date: t.created_at || (t.date ? new Date(t.date).toISOString() : new Date().toISOString()),
    note: t.note || "",
    isRecurring: Boolean(t.is_recurring ?? t.isRecurring),
    entryKind: t.entry_kind ?? t.entryKind,
    transferId: t.transfer_id ?? t.transferId ?? undefined,
  };
}

export async function getTransactions(): Promise<Transaction[]> {
  const userId = await resolveUserId();
  const pageSize = 500;
  const rows: any[] = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from("view_transactions_detailed").select("*")
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

export async function getCategories() {
  const userId = await resolveUserId();
  let query = supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching categories:", error);
    return [] as Category[];
  }
  return (data || []).map((cat) => ({
    ...cat,
    color: formatHexColor(cat.color),
  })) as Category[];
}

export async function getAccounts(activeUserId?: string) {
  const userId = activeUserId ?? (await resolveUserId());
  let query = supabase
    .from("accounts")
    .select("*")
    .order("name", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load accounts: ${error.message}`);
  }
  return (data || []).map((acc) => ({
    ...acc,
    color: formatHexColor(acc.color),
  })) as Account[];
}

export async function getAccountsWithBalances(customUserId?: string): Promise<Account[]> {
  const userId = customUserId || (await resolveUserId());
  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    getTransactions(),
  ]);

  const scopedAccounts = accounts.filter(
    (a) => !a.user_id || a.user_id === userId,
  );

  const accountStats = new Map<string, { balance: number; income: number; expenses: number }>();
  const nameToId = new Map<string, string>();

  for (const acc of scopedAccounts) {
    accountStats.set(acc.id, { balance: 0, income: 0, expenses: 0 });
    nameToId.set(acc.name.trim().toLowerCase(), acc.id);
  }

  for (const t of transactions) {
    let targetId = t.accountId && accountStats.has(t.accountId) ? t.accountId : undefined;
    if (!targetId && t.accountName) {
      targetId = nameToId.get(t.accountName.trim().toLowerCase());
    }

    if (targetId) {
      const stats = accountStats.get(targetId)!;
      const amount = t.amount || 0;
      if (t.type === "income") {
        stats.income += amount;
        stats.balance += amount;
      } else if (t.type === "expense") {
        stats.expenses += amount;
        stats.balance -= amount;
      }
    }
  }

  return scopedAccounts.map((acc) => {
    const stats = accountStats.get(acc.id);
    return {
      ...acc,
      balance: stats ? stats.balance : 0,
    };
  });
}

export async function createDefaultUserData(
  userId: string,
  initialBalance: number = 0,
  selectedCategoryNames?: string[]
): Promise<{ accountId: string }> {
  const { data, error } = await supabase.rpc("complete_finance_setup", {
    p_user_id: userId,
    p_opening_balance: initialBalance,
    p_categories: selectedCategoryNames ?? null,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Setup did not return an account.");
  return { accountId: data };
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
    const data: Record<string, any> = {
      account_id: params.accountId,
      category_id: params.categoryId,
      name: params.name,
      type: params.type,
      amount: params.amount,
      note: params.note,
      is_recurring: params.isRecurring,
      created_at: params.date instanceof Date ? params.date.toISOString() : params.date,
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

export interface AddTransactionsItemResult {
  index: number;
  success: boolean;
  data?: TransactionDetailModel;
  error?: string;
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
          error: err instanceof Error ? err.message : "Failed to add transaction",
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

export async function addTransfer(
  params: AddTransferParams,
): Promise<{ expense: any; income: any }> {
  try {
    if (params.fromAccountId === params.toAccountId || !Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error("Choose two different accounts and a positive amount");
    }
    const userId = params.userId ?? (await resolveUserId());
    const accounts = await getAccounts(userId);
    const fromAccount = accounts.find((a) => a.id === params.fromAccountId);
    const toAccount = accounts.find((a) => a.id === params.toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error("Invalid source or destination account");
    }

    // 2. Get the 'Debt' category ID
    const categories = await getCategories();
    const debtCategory = categories.find(
      (c) => c.name.toLowerCase() === "debt",
    );

    if (!debtCategory) {
      throw new Error(
        "Debt category not found in database for inter-account transfer",
      );
    }

    const timestamp = params.createdAt
      ? params.createdAt.toISOString()
      : new Date().toISOString();

    const transferId = crypto.randomUUID();
    const expensePayload = {
      account_id: params.fromAccountId,
      user_id: userId,
      entry_kind: "transfer",
      transfer_id: transferId,
      name: `Transfer to ${toAccount.name}`,
      type: "expense",
      amount: params.amount,
      category_id: debtCategory.id,
      note: params.note || `Inter-account transfer to ${toAccount.name}`,
      is_recurring: false,
      created_at: timestamp,
    };

    const incomePayload = {
      account_id: params.toAccountId,
      user_id: userId,
      entry_kind: "transfer",
      transfer_id: transferId,
      name: `Transfer from ${fromAccount.name}`,
      type: "income",
      amount: params.amount,
      category_id: debtCategory.id,
      note: params.note || `Inter-account transfer from ${fromAccount.name}`,
      is_recurring: false,
      created_at: timestamp,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert([expensePayload, incomePayload])
      .select("id");

    if (insertError) throw insertError;

    return {
      expense: inserted?.[0],
      income: inserted?.[1],
    };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("Failed to add transfer:", e);
    throw new Error(`Failed to add transfer: ${errorMessage}`);
  }
}

export async function getTransferHistory(): Promise<TransferRecord[]> {
  return buildTransferHistory(await getTransactions());
}

export async function deleteTransfer(transactionIds: string[]): Promise<void> {
  try {
    if (!transactionIds || transactionIds.length === 0) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .in("id", transactionIds);

    if (error) {
      console.error("Error deleting transfer transactions:", error);
      throw error;
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("Failed to delete transfer:", e);
    throw new Error(`Failed to delete transfer: ${errorMessage}`);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    if (!id) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

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

