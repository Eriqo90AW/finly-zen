import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import type { Transaction, AppState } from "../types";
import { DEFAULT_BUDGETS, DEFAULT_CONFIG } from "../config/defaults";

const DEFAULT_STATE: AppState = {
  transactions: [],
  budgets: DEFAULT_BUDGETS,
  goals: [
    { id: "1", name: "Summer Trip", target: 15000000, current: 6000000, emoji: "✈️", date: "2026-08-01" },
    { id: "2", name: "New Laptop", target: 25000000, current: 18000000, emoji: "💻", date: "2026-12-15" },
  ],
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

export function getStoreKey(userId?: string): string {
  const uid = userId || getUserIdSync();
  return uid ? `finly_zen_state_${uid}` : "finly_zen_state_v2";
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

export const setCategoryBudget = (category: string, limit: number) => {
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

