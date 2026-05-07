import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  merchant: string;
  date: string;
  note: string;
};

export type Budget = {
  category: string;
  limit: number;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  emoji: string;
  date: string;
};

export type AppState = {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  settings: {
    monthlyLimit: number;
    userName: string;
  };
  ui: {
    currentMonth: string; // ISO string for the first day of the month
    sidebarOpen: boolean;
    insightsOpen: boolean;
    showAddExpense: boolean;
  };
};

const DEFAULT_STATE: AppState = {
  transactions: [],
  budgets: [
    { category: "Food", limit: 500 },
    { category: "Transport", limit: 300 },
    { category: "Entertainment", limit: 200 },
    { category: "Shopping", limit: 400 },
    { category: "Health", limit: 150 },
    { category: "Utilities", limit: 250 },
  ],
  goals: [
    { id: "1", name: "Summer Trip", target: 2000, current: 850, emoji: "✈️", date: "2026-08-01" },
    { id: "2", name: "New Laptop", target: 1500, current: 1200, emoji: "💻", date: "2026-12-15" },
  ],
  settings: {
    monthlyLimit: 2500,
    userName: "Alex",
  },
  ui: {
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    sidebarOpen: true,
    insightsOpen: true,
    showAddExpense: false,
  },
};

const STORE_KEY = "finly_zen_state";

export const [state, setState] = createStore<AppState>(DEFAULT_STATE);

// Persistence Layer
export function setupPersistence() {
  onMount(() => {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(reconcile(parsed));
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  });

  createEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  });
}

// Helpers
export const addTransaction = (t: Omit<Transaction, "id">) => {
  setState("transactions", (prev) => [...prev, { ...t, id: Math.random().toString(36).substr(2, 9) }]);
};

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
