import { supabase } from "../lib/supabase";
import { formatHexColor } from "../utils/format";
import { resolveUserId } from "../lib/userSession";
import { getTransactions } from "./expenseTransactionsData";
import type { Category, Account } from "../types";

const STANDARD_STARTER_CATEGORIES = [
  { name: "Food & Dining", icon: "restaurant", color: "#d47b5a" },
  { name: "Transport", icon: "directions_car", color: "#52c278" },
  { name: "Bills & Utilities", icon: "receipt_long", color: "#6366f1" },
  { name: "Shopping", icon: "shopping_bag", color: "#f43f5e" },
  { name: "Investments", icon: "trending_up", color: "#1a4d2e" },
  { name: "Health & Wellness", icon: "favorite", color: "#a78bfa" },
  { name: "Salary", icon: "payments", color: "#10b981" },
  { name: "Debt", icon: "swap_horiz", color: "#80631d" },
];

export async function getCategories(): Promise<Category[]> {
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

export async function getAccounts(): Promise<Account[]> {
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

export async function getAccountsWithBalances(
  customUserId?: string,
): Promise<Account[]> {
  const userId = customUserId || (await resolveUserId());
  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    getTransactions(),
  ]);

  const scopedAccounts = accounts.filter(
    (a) => !a.user_id || a.user_id === userId,
  );

  const accountStats = new Map<
    string,
    { balance: number; income: number; expenses: number }
  >();
  const nameToId = new Map<string, string>();

  for (const acc of scopedAccounts) {
    accountStats.set(acc.id, { balance: 0, income: 0, expenses: 0 });
    nameToId.set(acc.name.trim().toLowerCase(), acc.id);
  }

  for (const t of transactions) {
    let targetId =
      t.accountId && accountStats.has(t.accountId) ? t.accountId : undefined;
    if (!targetId && t.accountName) {
      targetId = nameToId.get(t.accountName.trim().toLowerCase());
    }

    if (targetId) {
      const stats = accountStats.get(targetId);
      if (!stats) continue;
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
  initialBalance = 0,
  selectedCategoryNames?: string[],
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

  // 2. Insert starter categories
  const categoriesToInsert = STANDARD_STARTER_CATEGORIES.filter((cat) => {
    if (cat.name === "Debt" || cat.name === "Salary") return true;
    if (!selectedCategoryNames || selectedCategoryNames.length === 0) {
      return true;
    }
    return selectedCategoryNames.includes(cat.name);
  }).map((cat) => ({
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
