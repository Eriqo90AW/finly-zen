export interface Trade {
  ticker: string;
  setup: string;
  returnR: number; // e.g. 3.0
  pnl: number; // e.g. 1500000 (Rp1.500.000)
  entry: number; // e.g. 4800 (Rp4.800)
  stopLoss: number;
  takeProfit: number;
  checklist: string[];
  psychologyTags: string[];
  notes: string;
}

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
}
