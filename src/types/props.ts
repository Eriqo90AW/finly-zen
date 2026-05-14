import { Transaction } from "./transaction";
import { MarketStatus } from "./market";
import { StockData } from "./stock";

export interface RecentTransactionsProps {
  transactions: Transaction[];
  loading: boolean;
}

export type SortKey = "name" | "category" | "account" | "date" | "amount";
export type SortDirection = "asc" | "desc";

export interface StockHeroProps {
  data: StockData;
  marketStatus: MarketStatus;
  nextUpdateIn: number;
}

export interface PriceActionChartProps {
  data: StockData;
}

export interface MetricsCardProps {
  data: StockData;
}

export interface FinancialPerformanceChartProps {
  data: StockData;
}

export interface EstimatesTableProps {
  data: StockData;
}

export interface EarningsActualsChartProps {
  data: StockData;
}

export interface HeroCardProps {
  allTransactions: Transaction[];
  monthlyTransactions: Transaction[];
  loading: boolean;
}

export interface GardenWinsProps {
  transactions: Transaction[];
  loading: boolean;
  dailyBudget: () => number;
}

export interface DailySpendChartProps {
  transactions: Transaction[];
  loading: boolean;
  dailyBudget: () => number;
  setDailyBudget: (val: number) => void;
}

export interface CategoryCardProps {
  transactions: Transaction[];
  loading?: boolean;
}

export interface BudgetPacingChartProps {
  transactions: Transaction[];
  loading: boolean;
  dailyBudget: () => number;
}


export interface ActivityCalendarProps {
  transactions: Transaction[];
  loading: boolean;
  dailyBudget: import("solid-js").Accessor<number>;
}


export interface TooltipProps {
  content: import("solid-js").JSX.Element;
  children: import("solid-js").JSX.Element;
  class?: string;
}






