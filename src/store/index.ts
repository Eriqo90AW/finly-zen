import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import type { Transaction, AppState } from "../types";
import { DEFAULT_BUDGETS, DEFAULT_CONFIG } from "../config/defaults";

const DEFAULT_STATE: AppState = {
  transactions: [],
  budgets: DEFAULT_BUDGETS,
  goals: [],
  settings: {
    monthlyLimit: DEFAULT_CONFIG.monthlyLimit,
    userName: DEFAULT_CONFIG.userName,
  },
  ui: {
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    datePeriod: DEFAULT_CONFIG.datePeriod,
    sidebarOpen: false,
    insightsOpen: false,
    showAddExpense: false,
    showAllTime: false,
    selectedAccount: null,
    selectedAccountColor: null,
  },
};

import { getUserIdSync } from "../lib/userContext";
import { supabase } from "../lib/supabase";
import { createSignal } from "solid-js";

export function getStoreKey(userId?: string): string {
  const uid = userId || getUserIdSync();
  return uid ? `finly_zen_state_${uid}` : "finly_zen_state_v2";
}

// Capture legacy goals before persistence can write a different signed-in user's state.
const legacyGoalsByKey = new Map<string, unknown[]>();
const legacyBudgetsByKey = new Map<string, { category: string; limit: number }[]>();
if (typeof localStorage !== "undefined") {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("finly_zen_state_")) continue;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      if (Array.isArray(saved.goals)) legacyGoalsByKey.set(key, saved.goals);
      if (Array.isArray(saved.budgets)) legacyBudgetsByKey.set(key, saved.budgets.filter((b: any) => typeof b.category === "string" && Number.isFinite(b.limit) && b.limit >= 0));
    } catch { /* Ignore malformed unrelated local state. */ }
  }
}
export function getLegacyGoals(userId: string): unknown[] {
  return legacyGoalsByKey.get(getStoreKey(userId)) || [];
}

export const [state, setState] = createStore<AppState>(DEFAULT_STATE);

export function resetAppState() {
  setState(reconcile(DEFAULT_STATE));
}

// Persistence Layer
export function setupPersistence() {
  onMount(() => {
    const key = getStoreKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.budgets)) {
          const existingCategories = new Set(
            parsed.budgets.map((b: any) => b.category?.toLowerCase()),
          );
          for (const defBudget of DEFAULT_BUDGETS) {
            if (!existingCategories.has(defBudget.category.toLowerCase())) {
              parsed.budgets.push({ ...defBudget });
            }
          }
        } else {
          parsed.budgets = DEFAULT_BUDGETS;
        }

        if (parsed.ui) {
          parsed.ui.showAllTime = false;
          parsed.ui.sidebarOpen = false;
          parsed.ui.insightsOpen = false;
          parsed.ui.showAddExpense = false;
          delete parsed.ui.showRecurringDebt;
        }
        setState(reconcile(parsed));
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  });

  createEffect(() => {
    const { transactions, ...persistable } = state;
    const key = getStoreKey();
    localStorage.setItem(key, JSON.stringify(persistable));
  });
}

export * from "./transactionStore";

// Helpers


export const updateGoal = (id: string, amount: number) => {
  setState("goals", (g) => g.id === id, "current", (c) => c + amount);
};

export const nextMonth = () => {
  setState("ui", "currentMonth", (m) => {
    const d = new Date(m);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  });
};

export const prevMonth = () => {
  setState("ui", "currentMonth", (m) => {
    const d = new Date(m);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString();
  });
};

export const toggleShowAllTime = () => {
  setState("ui", "showAllTime", (s) => !s);
};

export const setSelectedAccount = (
  account: string | null,
  color: string | null = null,
) => {
  setState("ui", "selectedAccount", account);
  setState("ui", "selectedAccountColor", color);
};

const [budgetSyncError, setBudgetSyncError] = createSignal<string | null>(null);
const [budgetSyncLoading, setBudgetSyncLoading] = createSignal(false);
const [budgetSyncReady, setBudgetSyncReady] = createSignal(false);
export { budgetSyncError, budgetSyncLoading, budgetSyncReady };
let budgetUserId: string | null = null;
export async function loadSyncedBudgets(userId: string) {
  budgetUserId = userId;
  setBudgetSyncReady(false);
  setBudgetSyncLoading(true); setBudgetSyncError(null);
  try {
    const initial = legacyBudgetsByKey.get(getStoreKey(userId)) ?? DEFAULT_BUDGETS;
    const init = await supabase.rpc("initialize_category_budgets", { p_budgets: initial });
    if (init.error) throw init.error;
    const result = await supabase.from("category_budgets").select("category,amount").eq("user_id", userId);
    if (result.error) throw result.error;
    if (budgetUserId === userId) { setState("budgets", (result.data || []).map((b: any) => ({ category: b.category, limit: Number(b.amount) }))); setBudgetSyncReady(true); }
  } catch (e) { if (budgetUserId === userId) setBudgetSyncError((e as any)?.message || String(e)); }
  finally { if (budgetUserId === userId) setBudgetSyncLoading(false); }
}
export function clearBudgetSync() { budgetUserId = null; setBudgetSyncReady(false); setBudgetSyncError(null); }
export const setCategoryBudget = (category: string, limit: number) => {
  const userId = budgetUserId;
  if (!userId || !budgetSyncReady()) { setBudgetSyncError("Budget sync is unavailable. Reload before saving."); return; }
  void (async () => {
    try {
      const { error } = await supabase.from("category_budgets").upsert({ user_id: userId, category, amount: limit }, { onConflict: "user_id,category_key" });
      if (error) throw error;
      if (budgetUserId !== userId) return;
      setBudgetSyncError(null); updateLocalCategoryBudget(category, limit);
    } catch (error) { if (budgetUserId === userId) setBudgetSyncError((error as any)?.message || String(error)); }
  })();
};
const updateLocalCategoryBudget = (category: string, limit: number) => {
  setState("budgets", (prev) => {
    const idx = prev.findIndex(
      (b) => b.category.toLowerCase() === category.toLowerCase(),
    );
    if (idx >= 0) {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], limit };
      return updated;
    } else {
      return [...prev, { category, limit }];
    }
  });
};

