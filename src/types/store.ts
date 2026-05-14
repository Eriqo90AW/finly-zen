import { Transaction } from "./transaction";

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

export type DatePeriod = "1-30" | "21-20" | "25-25";

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
    datePeriod: DatePeriod;
    sidebarOpen: boolean;
    insightsOpen: boolean;
    showAddExpense: boolean;
    showAllTime: boolean;
    showRecurringDebt: boolean;
  };
};
