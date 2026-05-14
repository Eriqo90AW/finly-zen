import { supabase } from "./supabase";
import type { Transaction } from "../store";
import { formatHexColor } from "../utils/format";


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
  return (data || []).map((cat) => ({
    ...cat,
    color: formatHexColor(cat.color),
  }));
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
  return (data || []).map((acc) => ({
    ...acc,
    color: formatHexColor(acc.color),
  }));
}
