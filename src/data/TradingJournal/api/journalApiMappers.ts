import type { DailySummary, MonthlyPerformance, Trade } from "../data/types";
import { calculateTradeR } from "../../../utils/tradingJournalR";

export function getMonthDateRange(monthStr: string): { startDate: string; endDate: string } {
  const [year, monthNum] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return {
    startDate: `${monthStr}-01`,
    endDate: `${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function generateEmptyMonth(monthStr: string): DailySummary[] {
  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const summaries: DailySummary[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    summaries.push({
      date: dateStr,
      dayNumber: d,
      grossReturn: 0,
      netReturn: 0,
      fees: 0,
      tradesCount: 0,
      trades: [],
    });
  }
  return summaries;
}

export function formatPerformanceMonthName(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1);
  return `${date.toLocaleString("default", { month: "long" })} ${year}`;
}

export function generateEmptyPerformance(monthName: string): MonthlyPerformance {
  return {
    monthName,
    streak: 0,
    totalPnL: 0,
    totalR: 0,
    winRate: 0,
    profitFactor: 0,
    realizedWin: 0,
    realizedLoss: 0,
  };
}

export function aggregatePerformanceFromRows(
  monthName: string,
  rows: Trade[] | null,
): MonthlyPerformance {
  const performance = generateEmptyPerformance(monthName);
  if (!rows || rows.length === 0) {
    return performance;
  }

  let totalPnL = 0;
  let totalR = 0;
  let wins = 0;
  let losses = 0;
  let grossWins = 0;
  let grossLosses = 0;

  const dailyPnL: Record<string, number> = {};

  for (const row of rows) {
    if (row.net_pnl !== null && row.net_pnl !== undefined) {
      const netPnL = Number(row.net_pnl || 0);
      totalPnL += netPnL;
      totalR += calculateTradeR(row) ?? 0;

      if (netPnL > 0) {
        wins++;
        grossWins += netPnL;
      } else if (netPnL < 0) {
        losses++;
        grossLosses += Math.abs(netPnL);
      }

      dailyPnL[row.trade_date] = (dailyPnL[row.trade_date] || 0) + netPnL;
    }
  }

  const totalClosedTrades = wins + losses;
  performance.totalPnL = totalPnL;
  performance.totalR = totalR;
  performance.winRate =
    totalClosedTrades > 0 ? Math.round((wins / totalClosedTrades) * 100) : 0;
  performance.profitFactor =
    grossLosses > 0
      ? Number.parseFloat((grossWins / grossLosses).toFixed(2))
      : grossWins > 0
        ? 99.9
        : 0.0;
  performance.realizedWin = grossWins;
  performance.realizedLoss = grossLosses;

  const sortedDates = Object.keys(dailyPnL).sort((a, b) => b.localeCompare(a));
  let streak = 0;
  for (const date of sortedDates) {
    if (dailyPnL[date] > 0) {
      streak++;
    } else if (dailyPnL[date] < 0) {
      break;
    }
  }
  performance.streak = streak;

  return performance;
}

function appendTradeToDailySummary(summary: DailySummary, row: Trade): void {
  summary.trades.push(row);
  if (row.record_type === "EXECUTED") {
    summary.tradesCount++;
    summary.fees += Number(row.total_fee || 0);
    summary.grossReturn += Number(row.gross_pnl || 0);
    summary.netReturn += Number(row.net_pnl || 0);
  }
}

export function mapRowsToDailySummaries(
  monthStr: string,
  rows: Trade[] | null,
): DailySummary[] {
  const summaries = generateEmptyMonth(monthStr);
  if (!rows) return summaries;

  for (const row of rows) {
    const summary = summaries.find((s) => s.date === row.trade_date);
    if (summary) {
      appendTradeToDailySummary(summary, row);
    }
  }
  return summaries;
}

export function mapRowsToDailySummary(date: string, rows: Trade[] | null): DailySummary {
  const [, , day] = date.split("-").map(Number);
  const summary: DailySummary = {
    date,
    dayNumber: day,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
  };

  if (rows) {
    for (const row of rows) {
      appendTradeToDailySummary(summary, row);
    }
  }

  return summary;
}

export function buildTradeInsertPayload(
  date: string,
  trade: Partial<Trade>,
  userId: string | null,
): Partial<Trade> & { trade_date: string; user_id: string | null } {
  return {
    ...trade,
    trade_date: date,
    user_id: userId || null,
  };
}
