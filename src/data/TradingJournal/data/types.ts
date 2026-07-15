import { TradingJournalRow } from "./database.types";

export type Trade = TradingJournalRow;

export interface DailySummary {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  grossReturn: number;
  netReturn: number;
  fees: number;
  tradesCount: number;
  trades: Trade[];
  isHoliday?: boolean;
  isWeekend?: boolean;
  isCustomEmpty?: boolean;
}

export interface MonthlyPerformance {
  monthName: string; // e.g. "July 2024"
  streak: number;
  totalPnL: number;
  totalR: number;
  winRate: number;
  profitFactor: number;
  realizedWin: number;
  realizedLoss: number;
}
