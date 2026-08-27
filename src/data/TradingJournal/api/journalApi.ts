import { supabase } from "../../../lib/supabase";
import { resolveUserId } from "../../../lib/userContext";
import { MonthlyPerformance, DailySummary, Trade } from "../data/types";
import { calculateTradeR } from "../../../utils/tradingJournalR";

function generateEmptyMonth(monthStr: string): DailySummary[] {
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

function generateEmptyPerformance(monthStr: string): MonthlyPerformance {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1);
  const monthName = date.toLocaleString('default', { month: 'long' }) + " " + year;
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

/**
 * Fetches the performance summary for a specific month.
 * Calculates Win Rate, Profit Factor, Total PnL, Total R, and Current Win Streak
 * directly from executed trades in Supabase.
 */
export async function getMonthlyPerformance(month: string): Promise<MonthlyPerformance> {
  const userId = await resolveUserId();
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  let query = supabase
    .from('trading_journal')
    .select('*')
    .eq('record_type', 'EXECUTED')
    .gte('trade_date', startDate)
    .lte('trade_date', endDate)
    .order('trade_date', { ascending: true });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching monthly performance:", error);
    return generateEmptyPerformance(month);
  }

  const performance = generateEmptyPerformance(month);
  if (!data || data.length === 0) {
    return performance;
  }

  let totalPnL = 0;
  let totalR = 0;
  let wins = 0;
  let losses = 0;
  let grossWins = 0;
  let grossLosses = 0;

  // Track daily P&L to calculate consecutive winning days (streak)
  const dailyPnL: { [date: string]: number } = {};

  for (const row of data) {
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
  performance.winRate = totalClosedTrades > 0 ? Math.round((wins / totalClosedTrades) * 100) : 0;
  performance.profitFactor = grossLosses > 0 ? parseFloat((grossWins / grossLosses).toFixed(2)) : (grossWins > 0 ? 99.9 : 0.0);
  performance.realizedWin = grossWins;
  performance.realizedLoss = grossLosses;

  // Calculate streak from daily summaries of this month
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

/**
 * Fetches the performance summary for all time.
 * Calculates Win Rate, Profit Factor, Total PnL, Total R, and Current Win Streak
 * directly from executed trades in Supabase.
 */
export async function getAllTimePerformance(): Promise<MonthlyPerformance> {
  const userId = await resolveUserId();

  let query = supabase
    .from('trading_journal')
    .select('*')
    .eq('record_type', 'EXECUTED')
    .order('trade_date', { ascending: true });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching all-time performance:", error);
    return {
      monthName: "All Time",
      streak: 0,
      totalPnL: 0,
      totalR: 0,
      winRate: 0,
      profitFactor: 0,
      realizedWin: 0,
      realizedLoss: 0,
    };
  }

  const performance: MonthlyPerformance = {
    monthName: "All Time",
    streak: 0,
    totalPnL: 0,
    totalR: 0,
    winRate: 0,
    profitFactor: 0,
    realizedWin: 0,
    realizedLoss: 0,
  };

  if (!data || data.length === 0) {
    return performance;
  }

  let totalPnL = 0;
  let totalR = 0;
  let wins = 0;
  let losses = 0;
  let grossWins = 0;
  let grossLosses = 0;

  // Track daily P&L to calculate consecutive winning days (streak)
  const dailyPnL: { [date: string]: number } = {};

  for (const row of data) {
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
  performance.winRate = totalClosedTrades > 0 ? Math.round((wins / totalClosedTrades) * 100) : 0;
  performance.profitFactor = grossLosses > 0 ? parseFloat((grossWins / grossLosses).toFixed(2)) : (grossWins > 0 ? 99.9 : 0.0);
  performance.realizedWin = grossWins;
  performance.realizedLoss = grossLosses;

  // Calculate streak from daily summaries
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

/**
 * Fetches all daily summaries for a specific month from Supabase.
 */
export async function getDailySummaries(month: string): Promise<DailySummary[]> {
  const userId = await resolveUserId();
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  let query = supabase
    .from('trading_journal')
    .select('*')
    .gte('trade_date', startDate)
    .lte('trade_date', endDate)
    .order('trade_date', { ascending: true });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching daily summaries:", error);
    return generateEmptyMonth(month);
  }

  const summaries = generateEmptyMonth(month);

  if (data) {
    for (const row of data) {
      const summary = summaries.find(s => s.date === row.trade_date);
      if (summary) {
        // We cast row as Trade since types.ts exports Trade = TradingJournalRow
        summary.trades.push(row as unknown as Trade);
        if (row.record_type === 'EXECUTED') {
          summary.tradesCount++;
          summary.fees += Number(row.total_fee || 0);
          summary.grossReturn += Number(row.gross_pnl || 0);
          summary.netReturn += Number(row.net_pnl || 0);
        }
      }
    }
  }

  return summaries;
}

/**
 * Fetches a single daily summary with its detailed trades from Supabase.
 */
export async function getDailySummary(date: string): Promise<DailySummary | undefined> {
  const userId = await resolveUserId();

  let query = supabase
    .from('trading_journal')
    .select('*')
    .eq('trade_date', date)
    .order('created_at', { ascending: true });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching daily summary:", error);
    return undefined;
  }

  const [,, day] = date.split("-").map(Number);
  const summary: DailySummary = {
    date,
    dayNumber: day,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
  };

  if (data) {
    for (const row of data) {
      summary.trades.push(row as unknown as Trade);
      if (row.record_type === 'EXECUTED') {
        summary.tradesCount++;
        summary.fees += Number(row.total_fee || 0);
        summary.grossReturn += Number(row.gross_pnl || 0);
        summary.netReturn += Number(row.net_pnl || 0);
      }
    }
  }

  return summary;
}

/**
 * Saves a new trade entry to Supabase.
 */
export async function saveTrade(date: string, trade: Partial<Trade>): Promise<void> {
  const userId = await resolveUserId();
  const payload = {
    ...trade,
    trade_date: date,
    user_id: userId,
  };

  const { error } = await supabase
    .from('trading_journal')
    .insert([payload]);

  if (error) {
    console.error("Error inserting trade:", error);
    throw new Error(error.message);
  }
}
