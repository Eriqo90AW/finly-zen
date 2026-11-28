export type TradeSortKey =
  | "date"
  | "ticker"
  | "type"
  | "qty"
  | "price"
  | "amount";

export interface TickerPnLItem {
  ticker: string;
  realizedPnL: number;
}

export interface TradeSummaryStatsData {
  totalTrades: number;
  realizedPnL: number;
  buyVolume: number;
  sellVolume: number;
  dividendIncome: number;
}

export interface CumulativePnLPoint {
  date: string;
  value: number;
}

export interface MonthlyActivityData {
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
}

export interface VolumeBreakdownData {
  series: number[];
  labels: string[];
}

export interface LeadersBoardData {
  gainers: TickerPnLItem[];
  losers: TickerPnLItem[];
}
