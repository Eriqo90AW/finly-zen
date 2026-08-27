import type { Trade } from "../data/TradingJournal/data/types";

const SHARES_PER_LOT = 100;

type TradeRInput = Partial<Pick<Trade,
  | "direction"
  | "lots"
  | "lots_closed"
  | "avg_entry_price"
  | "avg_exit_price"
  | "stop_loss"
  | "net_pnl"
  | "gross_pnl"
  | "risk_r"
  | "risk_amount"
  | "exit_details"
>>;

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getClosedLots(trade: TradeRInput): number | null {
  const lotsClosed = toFiniteNumber(trade.lots_closed);
  if (lotsClosed !== null && lotsClosed > 0) return lotsClosed;

  const exitLots = trade.exit_details?.reduce((sum, leg) => {
    const lot = toFiniteNumber(leg.lot);
    return sum + (lot !== null && lot > 0 ? lot : 0);
  }, 0) ?? 0;
  if (exitLots > 0) return exitLots;

  const lots = toFiniteNumber(trade.lots);
  return lots !== null && lots > 0 ? lots : null;
}

/**
 * Calculates the most accurate R-multiple available for a trade.
 * When stop/risk data is missing, it falls back to net P&L divided by the
 * realized entry-to-exit move value so older rows can still be compared.
 */
export function calculateTradeR(trade: TradeRInput): number | null {
  const storedR = toFiniteNumber(trade.risk_r);
  const entry = toFiniteNumber(trade.avg_entry_price);
  const exit = toFiniteNumber(trade.avg_exit_price);
  const stop = toFiniteNumber(trade.stop_loss);
  const pnl = toFiniteNumber(trade.net_pnl) ?? toFiniteNumber(trade.gross_pnl);
  const closedLots = getClosedLots(trade);

  if (pnl !== null) {
    const recordedRisk = toFiniteNumber(trade.risk_amount);
    if (recordedRisk !== null && recordedRisk > 0) {
      return pnl / recordedRisk;
    }

    if (entry !== null && exit !== null && stop !== null && closedLots !== null) {
      const riskAmount = Math.abs(entry - stop) * closedLots * SHARES_PER_LOT;
      if (riskAmount > 0) return pnl / riskAmount;
    }

    // Fallback for older rows with P&L and prices but no stop-loss data.
    if (entry !== null && exit !== null && closedLots !== null) {
      const realizedMoveValue = Math.abs(exit - entry) * closedLots * SHARES_PER_LOT;
      if (realizedMoveValue > 0) return pnl / realizedMoveValue;
    }
  }

  // Preserve an explicitly stored value when no newer calculation is possible.
  return storedR;
}
