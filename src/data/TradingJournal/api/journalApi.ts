import { supabase } from "../../../lib/supabase";
import { resolveUserId } from "../../../lib/userSession";
import type { MonthlyPerformance, DailySummary, Trade } from "../data/types";
import {
  aggregatePerformanceFromRows,
  buildTradeInsertPayload,
  formatPerformanceMonthName,
  generateEmptyMonth,
  generateEmptyPerformance,
  getMonthDateRange,
  mapRowsToDailySummaries,
  mapRowsToDailySummary,
} from "./journalApiMappers";

/**
 * Backfills any unassigned trades (user_id IS NULL) to the current user.
 */
export async function syncUnassignedTrades(): Promise<number> {
  try {
    const userId = await resolveUserId();
    if (!userId) return 0;
    const { data, error } = await supabase
      .from("trading_journal")
      .update({ user_id: userId })
      .is("user_id", null)
      .select("id");

    if (error) {
      console.warn("Could not backfill unassigned trading journal rows:", error);
      return 0;
    }
    return data ? data.length : 0;
  } catch (err) {
    console.warn("Error running syncUnassignedTrades:", err);
    return 0;
  }
}

/**
 * Fetches the performance summary for a specific month.
 * Calculates Win Rate, Profit Factor, Total PnL, Total R, and Current Win Streak
 * directly from executed trades in Supabase.
 */
export async function getMonthlyPerformance(month: string): Promise<MonthlyPerformance> {
  const userId = await resolveUserId();
  const { startDate, endDate } = getMonthDateRange(month);
  const monthName = formatPerformanceMonthName(month);

  let query = supabase
    .from("trading_journal")
    .select("*")
    .eq("record_type", "EXECUTED")
    .gte("trade_date", startDate)
    .lte("trade_date", endDate)
    .order("trade_date", { ascending: true });

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching monthly performance:", error);
    return generateEmptyPerformance(monthName);
  }

  return aggregatePerformanceFromRows(monthName, (data as Trade[] | null) ?? null);
}

/**
 * Fetches the performance summary for all time.
 * Calculates Win Rate, Profit Factor, Total PnL, Total R, and Current Win Streak
 * directly from executed trades in Supabase.
 */
export async function getAllTimePerformance(): Promise<MonthlyPerformance> {
  const userId = await resolveUserId();

  let query = supabase
    .from("trading_journal")
    .select("*")
    .eq("record_type", "EXECUTED")
    .order("trade_date", { ascending: true });

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching all-time performance:", error);
    return generateEmptyPerformance("All Time");
  }

  return aggregatePerformanceFromRows("All Time", (data as Trade[] | null) ?? null);
}

/**
 * Fetches all daily summaries for a specific month from Supabase.
 */
export async function getDailySummaries(month: string): Promise<DailySummary[]> {
  const userId = await resolveUserId();
  const { startDate, endDate } = getMonthDateRange(month);

  let query = supabase
    .from("trading_journal")
    .select("*")
    .gte("trade_date", startDate)
    .lte("trade_date", endDate)
    .order("trade_date", { ascending: true });

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching daily summaries:", error);
    return generateEmptyMonth(month);
  }

  return mapRowsToDailySummaries(month, (data as Trade[] | null) ?? null);
}

/**
 * Fetches a single daily summary with its detailed trades from Supabase.
 */
export async function getDailySummary(date: string): Promise<DailySummary | undefined> {
  const userId = await resolveUserId();

  let query = supabase
    .from("trading_journal")
    .select("*")
    .eq("trade_date", date)
    .order("created_at", { ascending: true });

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching daily summary:", error);
    return undefined;
  }

  return mapRowsToDailySummary(date, (data as Trade[] | null) ?? null);
}

/**
 * Saves a new trade entry to Supabase.
 */
export async function saveTrade(date: string, trade: Partial<Trade>): Promise<void> {
  const userId = await resolveUserId();
  const payload = buildTradeInsertPayload(date, trade, userId || null);

  const { error } = await supabase.from("trading_journal").insert([payload]);

  if (error) {
    console.error("Error inserting trade:", error);
    throw new Error(error.message);
  }
}
