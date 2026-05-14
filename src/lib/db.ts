import { supabase } from "./supabase";
import type { Transaction, Budget, Goal } from "../store";

export async function getTransactions() {
  const { data, error } = await supabase
    .from("view_transactions_detailed")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  // Map view fields to internal Transaction type
  return (data || []).map((t) => {
    // Helper to convert 0xFF8B5CF6 to #8B5CF6
    const formatColor = (c: string | null) => {
      if (!c) return undefined;
      if (c.startsWith("0x")) {
        return "#" + c.substring(4); // Skip 0x and Alpha FF
      }
      return c;
    };

    return {
      id: t.transaction_id,
      amount: t.amount,
      category: t.category_name,
      categoryIcon: t.category_icon,
      categoryColor: formatColor(t.category_color),
      name: t.transaction_name,
      accountName: t.account_name,
      accountColor: formatColor(t.account_color),
      type: t.transaction_type,
      date: t.created_at,
      note: t.note,
      isRecurring: t.is_recurring,
    };
  }) as Transaction[];
}

// Budgets and Goals are now handled locally via the store/localStorage

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data;
}

export async function getAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching accounts:", error);
    return [];
  }
  return data;
}

export async function addTransaction(transaction: {
  amount: number;
  name: string;
  category_id: string;
  account_id: string;
  type: string;
  note?: string;
  is_recurring?: boolean;
  created_at?: string;
}) {
  const { data, error } = await supabase
    .from("transactions")
    .insert([transaction])
    .select();

  if (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
  return data[0];
}
