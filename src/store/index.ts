import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import dummyTransactions from "../data/transactions.json";

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
  transactions: dummyTransactions,
  budgets: [
    { category: "Food", limit: 3000000 },
    { category: "Transport", limit: 1000000 },
    { category: "Entertainment", limit: 1000000 },
    { category: "Shopping", limit: 2000000 },
    { category: "Health", limit: 500000 },
    { category: "Utilities", limit: 1500000 },
  ],
  goals: [
    { id: "1", name: "Summer Trip", target: 15000000, current: 6000000, emoji: "✈️", date: "2026-08-01" },
    { id: "2", name: "New Laptop", target: 25000000, current: 18000000, emoji: "💻", date: "2026-12-15" },
  ],
  settings: {
    monthlyLimit: 15000000,
    userName: "Alex",
  },
  ui: {
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    sidebarOpen: false,
    insightsOpen: false,
    showAddExpense: false,
  },
};

const STORE_KEY = "finly_zen_state_v2";

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
