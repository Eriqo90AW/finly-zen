import { supabase } from "../lib/supabase";
import { formatHexColor } from "../utils/format";
import { resolveUserId, getUserIdSync } from "../lib/userContext";
import type {
  Transaction,
  Category,
  Account,
  AddTransactionParams,
  TransactionDetailModel,
  AddTransferParams,
  TransferRecord,
} from "../types";

export async function getTransactions() {
  const userId = await resolveUserId();
  let query = supabase
    .from("view_transactions_detailed")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

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

export async function getAccounts() {
  const userId = await resolveUserId();
  let query = supabase
    .from("accounts")
    .select("*")
    .order("name", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching accounts:", error);
    return [] as Account[];
  }
  return (data || []).map((acc) => ({
    ...acc,
    color: formatHexColor(acc.color),
  })) as Account[];
}

export async function createDefaultUserData(
  userId: string,
  initialBalance: number = 0,
  selectedCategoryNames?: string[]
): Promise<{ accountId: string }> {
  // 1. Create default "Main" account
  const { data: newAccount, error: accError } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: "Main",
      color: "#1a4d2e",
    })
    .select("id")
    .single();

  if (accError) {
    console.error("Error creating default account:", accError);
    throw new Error(`Failed to create Main account: ${accError.message}`);
  }

  // 2. Default starter categories definitions
  const standardCategories = [
    { name: "Food & Dining", icon: "restaurant", color: "#d47b5a" },
    { name: "Transport", icon: "directions_car", color: "#52c278" },
    { name: "Bills & Utilities", icon: "receipt_long", color: "#6366f1" },
    { name: "Shopping", icon: "shopping_bag", color: "#f43f5e" },
    { name: "Investments", icon: "trending_up", color: "#1a4d2e" },
    { name: "Health & Wellness", icon: "favorite", color: "#a78bfa" },
    { name: "Salary", icon: "payments", color: "#10b981" },
    { name: "Debt", icon: "swap_horiz", color: "#80631d" },
  ];

  const categoriesToInsert = standardCategories
    .filter((cat) => {
      if (cat.name === "Debt" || cat.name === "Salary") return true; // always include utility categories
      if (!selectedCategoryNames || selectedCategoryNames.length === 0) return true;
      return selectedCategoryNames.includes(cat.name);
    })
    .map((cat) => ({
      user_id: userId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
    }));

  const { error: catError } = await supabase
    .from("categories")
    .insert(categoriesToInsert);

  if (catError) {
    console.error("Error creating default categories:", catError);
  }

  // 3. If initial balance > 0, log an initial balance transaction
  if (initialBalance > 0 && newAccount?.id) {
    // Find Salary or Income category
    const { data: cats } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "Salary")
      .maybeSingle();

    await supabase.from("transactions").insert({
      user_id: userId,
      account_id: newAccount.id,
      category_id: cats?.id || null,
      name: "Initial Balance",
      amount: initialBalance,
      type: "income",
      is_recurring: false,
      note: "Starting balance on Main account",
      created_at: new Date().toISOString(),
    });
  }

  return { accountId: newAccount.id };
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

export async function addTransfer(
  params: AddTransferParams,
): Promise<{ expense: any; income: any }> {
  try {
    // 1. Get Accounts to resolve names
    const accounts = await getAccounts();
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

    const expensePayload = {
      account_id: params.fromAccountId,
      user_id: params.userId || fromAccount.user_id,
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
      user_id: params.userId || toAccount.user_id,
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
  try {
    const { data, error } = await supabase
      .from("view_transactions_detailed")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transfer history:", error);
      return [];
    }

    const debtTransactions = (data || []).filter(
      (t) => t.category_name?.toLowerCase() === "debt",
    );

    const expenses = debtTransactions.filter((t) => t.transaction_type === "expense");
    const incomes = debtTransactions.filter((t) => t.transaction_type === "income");

    const matchedIncomeIds = new Set<string>();
    const records: TransferRecord[] = [];

    // Pair expenses with incomes
    for (const exp of expenses) {
      // Find matching income with same amount and close timestamp
      const expTime = new Date(exp.created_at).getTime();
      const matchedInc = incomes.find((inc) => {
        if (matchedIncomeIds.has(inc.transaction_id)) return false;
        if (inc.amount !== exp.amount) return false;
        const incTime = new Date(inc.created_at).getTime();
        return Math.abs(expTime - incTime) < 5000; // within 5s
      });

      if (matchedInc) {
        matchedIncomeIds.add(matchedInc.transaction_id);
        records.push({
          id: exp.transaction_id,
          transactionIds: [exp.transaction_id, matchedInc.transaction_id],
          fromAccountId: exp.account_id,
          fromAccountName: exp.account_name,
          fromAccountColor: formatHexColor(exp.account_color),
          toAccountId: matchedInc.account_id,
          toAccountName: matchedInc.account_name,
          toAccountColor: formatHexColor(matchedInc.account_color),
          amount: exp.amount,
          date: exp.created_at,
          note: exp.note,
          isRecurring: exp.is_recurring,
        });
      } else {
        // Unmatched expense: check if name contains "Transfer to [Name]"
        let toName = "Unknown Account";
        const match = exp.transaction_name?.match(/Transfer to (.+)/i);
        if (match && match[1]) {
          toName = match[1].trim();
        }

        records.push({
          id: exp.transaction_id,
          transactionIds: [exp.transaction_id],
          fromAccountId: exp.account_id,
          fromAccountName: exp.account_name,
          fromAccountColor: formatHexColor(exp.account_color),
          toAccountName: toName,
          amount: exp.amount,
          date: exp.created_at,
          note: exp.note,
          isRecurring: exp.is_recurring,
        });
      }
    }

    // Handle any unmatched remaining incomes
    for (const inc of incomes) {
      if (matchedIncomeIds.has(inc.transaction_id)) continue;
      let fromName = "Unknown Account";
      const match = inc.transaction_name?.match(/Transfer from (.+)/i);
      if (match && match[1]) {
        fromName = match[1].trim();
      }

      records.push({
        id: inc.transaction_id,
        transactionIds: [inc.transaction_id],
        fromAccountName: fromName,
        toAccountId: inc.account_id,
        toAccountName: inc.account_name,
        toAccountColor: formatHexColor(inc.account_color),
        amount: inc.amount,
        date: inc.created_at,
        note: inc.note,
        isRecurring: inc.is_recurring,
      });
    }

    // Sort by date descending
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return records;
  } catch (e) {
    console.error("Failed to get transfer history:", e);
    return [];
  }
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

