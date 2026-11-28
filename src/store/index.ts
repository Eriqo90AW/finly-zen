import { createEffect, createSignal, onMount } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { DEFAULT_BUDGETS, DEFAULT_CONFIG } from "../config/defaults";
import { supabase } from "../lib/supabase";
import { getUserIdSync } from "../lib/userSession";
import {
  SyncedBudgetRowsSchema,
  parseLegacyLocalSnapshot,
  parsePersistedAppState,
} from "../lib/validation";
import type { AppState, Budget } from "../types";

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return String(error);
}

export function getStoreKey(userId?: string): string {
  const uid = userId || getUserIdSync();
  return uid ? `finly_zen_state_${uid}` : "finly_zen_state_v2";
}

// Capture legacy goals before persistence can write a different signed-in user's state.
const legacyGoalsByKey = new Map<string, unknown[]>();
const legacyBudgetsByKey = new Map<string, Budget[]>();
if (typeof localStorage !== "undefined") {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("finly_zen_state_")) continue;
    const { goals, budgets } = parseLegacyLocalSnapshot(localStorage.getItem(key));
    if (goals) legacyGoalsByKey.set(key, goals);
    if (budgets) legacyBudgetsByKey.set(key, budgets);
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
    if (!saved) return;

    const hydrated = parsePersistedAppState(saved, DEFAULT_STATE, DEFAULT_BUDGETS);
    if (hydrated) {
      setState(reconcile(hydrated));
    } else {
      console.error("Failed to load persisted app state: invalid payload");
    }
  });

  createEffect(() => {
    const { transactions: _transactions, ...persistable } = state;
    const key = getStoreKey();
    localStorage.setItem(key, JSON.stringify(persistable));
  });
}

export * from "./transactionStore";

// Helpers

export const updateGoal = (id: string, amount: number) => {
  setState(
    "goals",
    (g) => g.id === id,
    "current",
    (c) => c + amount,
  );
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

export const setSelectedAccount = (account: string | null, color: string | null = null) => {
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
  setBudgetSyncLoading(true);
  setBudgetSyncError(null);
  try {
    const initial = legacyBudgetsByKey.get(getStoreKey(userId)) ?? DEFAULT_BUDGETS;
    const init = await supabase.rpc("initialize_category_budgets", { p_budgets: initial });
    if (init.error) throw init.error;
    const result = await supabase
      .from("category_budgets")
      .select("category,amount")
      .eq("user_id", userId);
    if (result.error) throw result.error;
    if (budgetUserId === userId) {
      const parsedRows = SyncedBudgetRowsSchema.safeParse(result.data ?? []);
      const syncedBudgets: Budget[] = parsedRows.success
        ? parsedRows.data.map((row) => ({ category: row.category, limit: row.amount }))
        : DEFAULT_BUDGETS;
      setState("budgets", syncedBudgets);
      setBudgetSyncReady(true);
    }
  } catch (e) {
    if (budgetUserId === userId) setBudgetSyncError(getErrorMessage(e));
  } finally {
    if (budgetUserId === userId) setBudgetSyncLoading(false);
  }
}

export function clearBudgetSync() {
  budgetUserId = null;
  setBudgetSyncReady(false);
  setBudgetSyncError(null);
}

export const setCategoryBudget = (category: string, limit: number) => {
  const userId = budgetUserId;
  if (!userId || !budgetSyncReady()) {
    setBudgetSyncError("Budget sync is unavailable. Reload before saving.");
    return;
  }
  void (async () => {
    try {
      const { error } = await supabase
        .from("category_budgets")
        .upsert(
          { user_id: userId, category, amount: limit },
          { onConflict: "user_id,category_key" },
        );
      if (error) throw error;
      if (budgetUserId !== userId) return;
      setBudgetSyncError(null);
      updateLocalCategoryBudget(category, limit);
    } catch (error) {
      if (budgetUserId === userId) setBudgetSyncError(getErrorMessage(error));
    }
  })();
};

const updateLocalCategoryBudget = (category: string, limit: number) => {
  setState("budgets", (prev) => {
    const idx = prev.findIndex((b) => b.category.toLowerCase() === category.toLowerCase());
    if (idx >= 0) {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], limit };
      return updated;
    }
    return [...prev, { category, limit }];
  });
};
