import { MonthlyPerformance, DailySummary, Trade } from "../data/types";
import { mockMonthlyPerformance, mockDailySummaries } from "../data/mockData";

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
  };
}

/**
 * Fetches the performance summary for a specific month.
 * Currently reads from mock data, but is fully ready to be swapped
 * with a Supabase query:
 *   const { data } = await supabase.from('monthly_performance').select('*').eq('month', month).single();
 */
export async function getMonthlyPerformance(month: string): Promise<MonthlyPerformance> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  if (month === "2026-07") return mockMonthlyPerformance;
  return generateEmptyPerformance(month);
}

/**
 * Fetches all daily summaries for a specific month.
 * In a Supabase setup:
 *   const { data } = await supabase.from('daily_summaries').select('*, trades(*)').eq('month', month);
 */
export async function getDailySummaries(month: string): Promise<DailySummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  
  if (month === "2026-07") return mockDailySummaries;
  return generateEmptyMonth(month);
}

/**
 * Fetches a single daily summary with its detailed trades.
 * In Supabase:
 *   const { data } = await supabase.from('daily_summaries').select('*, trades(*)').eq('date', date).single();
 */
export async function getDailySummary(date: string): Promise<DailySummary | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  const summary = mockDailySummaries.find((summary) => summary.date === date);
  if (summary) return summary;

  // If not in mock, return an empty one
  const [year, month, day] = date.split("-").map(Number);
  return {
    date,
    dayNumber: day,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
  };
}

/**
 * Saves a new trade entry and recalculates summaries and monthly stats in-memory.
 * In Supabase:
 *   await supabase.from('trades').insert(trade);
 *   // then trigger database functions to recalculate stats
 */
export async function saveTrade(date: string, trade: Trade): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Find or create daily summary
  let summary = mockDailySummaries.find(s => s.date === date);
  if (!summary) {
    const dayNumber = parseInt(date.split("-")[2]);
    summary = {
      date,
      dayNumber,
      grossReturn: 0,
      netReturn: 0,
      fees: 0,
      tradesCount: 0,
      trades: [],
    };
    
    // Check if weekend
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      summary.isWeekend = true;
    }
    mockDailySummaries.push(summary);
    mockDailySummaries.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Append trade and recalculate metrics for the day
  summary.trades.push(trade);
  summary.tradesCount = summary.trades.length;
  
  // Custom formula: flat Rp20.000 fee per trade
  const tradeFees = 20000;
  summary.fees += tradeFees;
  summary.grossReturn += trade.pnl;
  summary.netReturn = summary.grossReturn - summary.fees;
  
  // If it was marked weekend or holiday, clear it since we have active trades
  delete summary.isWeekend;
  delete summary.isHoliday;

  // Recalculate monthly performance statistics based on updated array
  const allActiveSummaries = mockDailySummaries.filter(s => s.tradesCount > 0);
  const allTrades = allActiveSummaries.flatMap(s => s.trades);
  
  const totalPnL = mockDailySummaries.reduce((sum, s) => sum + s.netReturn, 0);
  const totalR = allTrades.reduce((sum, t) => sum + t.returnR, 0);
  
  const winningTrades = allTrades.filter(t => t.pnl > 0);
  const winRate = allTrades.length > 0 ? Math.round((winningTrades.length / allTrades.length) * 100) : 0;
  
  const totalGrossWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const losingTrades = allTrades.filter(t => t.pnl < 0);
  const totalGrossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalGrossLoss > 0 ? parseFloat((totalGrossWin / totalGrossLoss).toFixed(2)) : 2.0;

  mockMonthlyPerformance.totalPnL = totalPnL;
  mockMonthlyPerformance.totalR = totalR;
  mockMonthlyPerformance.winRate = winRate;
  mockMonthlyPerformance.profitFactor = profitFactor;
  
  if (summary.netReturn > 0) {
    mockMonthlyPerformance.streak += 1;
  }
}
