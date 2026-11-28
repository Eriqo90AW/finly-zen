import type {
  EntryLeg,
  ExitLeg,
  PosStatusType,
  ResultLabelType,
  SetupQualityType,
  SetupStatusType,
  TradeDirection,
} from "../../../data/TradingJournal/data/database.types";
import type { Trade } from "../../../data/TradingJournal/data/types";
import { calculateTradeR } from "../../../utils/tradingJournalR";

export const SETUP_TYPES = [
  "Breakout",
  "Reversal",
  "Momentum Scalp",
  "Mean Reversion",
  "Chop",
  "Bandarmology Accumulation",
  "Foreign Flow",
] as const;

export const CHECKLIST_OPTIONS = [
  "Volume Expansion",
  "VWAP Support",
  "Market Context Alignment",
  "Daily Support/Resistance",
  "21 EMA Bounce",
  "Net Foreign Buy",
  "Big Accumulation",
] as const;

export const PSYCHOLOGY_OPTIONS = [
  "Patience",
  "Disciplined",
  "FOMO Control",
  "Revenge Trading Avoided",
  "Rules Followed",
] as const;

export interface ExecutedTradeMetrics {
  lots: number;
  lotsClosed: number;
  lotsRemaining: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  commissionBuy: number;
  commissionSell: number;
  totalFee: number;
  grossPnL: number;
  netPnL: number;
  roiPct: number;
  riskAmount: number;
  riskR: number;
}

const BUY_COMMISSION_RATE = 0.001933;
const SELL_COMMISSION_RATE = 0.002933;

export function calculateExecutedTradeMetrics(
  entryLegs: EntryLeg[],
  exitLegs: ExitLeg[],
  direction: TradeDirection,
  stopLossInput: string,
): ExecutedTradeMetrics {
  const validEntryLegs = entryLegs.filter((leg) => leg.lot > 0 && leg.price > 0);
  const lots = validEntryLegs.reduce((sum, leg) => sum + leg.lot, 0);

  let avgEntryPrice = 0;
  let commissionBuy = 0;
  if (lots > 0) {
    const totalEntryValue = validEntryLegs.reduce((sum, leg) => sum + leg.lot * leg.price, 0);
    avgEntryPrice = totalEntryValue / lots;
    commissionBuy = totalEntryValue * 100 * BUY_COMMISSION_RATE;
  }

  const validExitLegs = exitLegs.filter((leg) => leg.lot > 0 && leg.price > 0);
  const lotsClosed = validExitLegs.reduce((sum, leg) => sum + leg.lot, 0);
  const lotsRemaining = Math.max(0, lots - lotsClosed);

  let avgExitPrice = 0;
  let commissionSell = 0;
  if (lotsClosed > 0) {
    const totalExitValue = validExitLegs.reduce((sum, leg) => sum + leg.lot * leg.price, 0);
    avgExitPrice = totalExitValue / lotsClosed;
    commissionSell = totalExitValue * 100 * SELL_COMMISSION_RATE;
  }

  const totalFee = commissionBuy + commissionSell;

  const hasRealizedExit = avgEntryPrice > 0 && lotsClosed > 0 && avgExitPrice > 0;
  const priceChange =
    direction === "SHORT" ? avgEntryPrice - avgExitPrice : avgExitPrice - avgEntryPrice;
  const grossPnL = hasRealizedExit ? priceChange * lotsClosed * 100 : 0;
  const netPnL = hasRealizedExit ? grossPnL - totalFee : 0;
  const totalCost = avgEntryPrice * lotsClosed * 100 + commissionBuy;
  const roiPct = hasRealizedExit && totalCost > 0 ? (netPnL / totalCost) * 100 : 0;

  const sl = Number.parseFloat(stopLossInput);
  const validSl = !Number.isNaN(sl) && sl > 0 ? sl : null;
  const riskAmount =
    avgEntryPrice > 0 && lots > 0 && validSl !== null
      ? Math.abs(avgEntryPrice - validSl) * lots * 100
      : 0;

  const calculatedR = calculateTradeR({
    direction,
    lots,
    lots_closed: lotsClosed,
    avg_entry_price: avgEntryPrice || null,
    avg_exit_price: avgExitPrice || null,
    stop_loss: validSl,
    net_pnl: hasRealizedExit ? netPnL : null,
    gross_pnl: hasRealizedExit ? grossPnL : null,
    risk_amount: riskAmount || null,
    risk_r: null,
    exit_details: exitLegs,
  });

  return {
    lots,
    lotsClosed,
    lotsRemaining,
    avgEntryPrice,
    avgExitPrice,
    commissionBuy,
    commissionSell,
    totalFee,
    grossPnL,
    netPnL,
    roiPct,
    riskAmount,
    riskR: calculatedR ?? 0,
  };
}

export function calculatePlannedRR(
  entryZoneIdeal: string,
  stopLoss: string,
  tp1Price: string,
): string {
  const entryIdeal = Number.parseFloat(entryZoneIdeal);
  const sl = Number.parseFloat(stopLoss);
  const tp1 = Number.parseFloat(tp1Price);

  if (!Number.isNaN(entryIdeal) && !Number.isNaN(sl) && !Number.isNaN(tp1) && entryIdeal > sl) {
    const risk = entryIdeal - sl;
    const reward = tp1 - entryIdeal;
    return (reward / risk).toFixed(2);
  }
  return "";
}

export interface SetupPayloadInput {
  ticker: string;
  notes: string;
  setupQuality: SetupQualityType;
  setupStatus: SetupStatusType;
  setupType: string;
  entryZoneIdeal: string;
  entryZoneMax: string;
  stopLoss: string;
  tp1Price: string;
  tp2Price: string;
  plannedRR: string;
  analysisRaw: string;
  selectedChecklist: string[];
}

export function buildSetupTradePayload(
  input: SetupPayloadInput,
): { payload: Partial<Trade> } | { error: string } {
  const entryIdeal = Number.parseFloat(input.entryZoneIdeal);
  const entryMax = Number.parseFloat(input.entryZoneMax);
  const sl = Number.parseFloat(input.stopLoss);

  if (Number.isNaN(entryIdeal) || Number.isNaN(entryMax)) {
    return { error: "SETUP requires Ideal Entry Zone and Max Entry Zone prices." };
  }

  return {
    payload: {
      ticker: input.ticker.toUpperCase(),
      record_type: "SETUP",
      notes: input.notes,
      setup_quality: input.setupQuality,
      setup_status: input.setupStatus,
      setup_type: input.setupType,
      entry_zone_ideal: entryIdeal,
      entry_zone_max: entryMax,
      stop_loss: sl || null,
      tp1_price: Number.parseFloat(input.tp1Price) || null,
      tp2_price: Number.parseFloat(input.tp2Price) || null,
      planned_rr: Number.parseFloat(input.plannedRR) || null,
      analysis_raw: input.analysisRaw,
      checklist: input.selectedChecklist,
      lots: 0,
      lots_closed: 0,
      lots_remaining: 0,
      pos_status: "OPEN",
    },
  };
}

export interface ExecutedPayloadInput {
  ticker: string;
  notes: string;
  posStatus: PosStatusType;
  direction: TradeDirection;
  metrics: ExecutedTradeMetrics;
  entryLegs: EntryLeg[];
  exitLegs: ExitLeg[];
  stopLoss: string;
  tp1Price: string;
  tp2Price: string;
  trailSl: string;
  resultLabel: ResultLabelType;
  entrySession: string;
  holdDays: string;
  selectedPsychology: string[];
}

export function buildExecutedTradePayload(
  input: ExecutedPayloadInput,
): { payload: Partial<Trade> } | { error: string } {
  const { metrics } = input;
  if (metrics.lots <= 0 || metrics.avgEntryPrice <= 0) {
    return {
      error: "EXECUTED trade requires at least one Entry Leg with lot and price > 0.",
    };
  }

  const validEntryLegs = input.entryLegs.filter((leg) => leg.lot > 0 && leg.price > 0);
  const validExitLegs = input.exitLegs.filter((leg) => leg.lot > 0 && leg.price > 0);

  return {
    payload: {
      ticker: input.ticker.toUpperCase(),
      record_type: "EXECUTED",
      notes: input.notes,
      pos_status: input.posStatus,
      direction: input.direction,
      lots: metrics.lots,
      lots_closed: metrics.lotsClosed,
      lots_remaining: metrics.lotsRemaining,
      avg_entry_price: metrics.avgEntryPrice,
      avg_exit_price: metrics.lotsClosed > 0 ? metrics.avgExitPrice : null,
      stop_loss: Number.parseFloat(input.stopLoss) || null,
      tp1_price: Number.parseFloat(input.tp1Price) || null,
      tp2_price: Number.parseFloat(input.tp2Price) || null,
      trail_sl: Number.parseFloat(input.trailSl) || null,
      entry_details: validEntryLegs,
      exit_details: validExitLegs.length > 0 ? validExitLegs : null,
      commission_buy: metrics.commissionBuy,
      commission_sell: metrics.commissionSell,
      total_fee: metrics.totalFee,
      gross_pnl: metrics.grossPnL,
      net_pnl: metrics.netPnL,
      roi_pct: metrics.roiPct,
      risk_r: metrics.riskR,
      risk_amount: metrics.riskAmount,
      result_label: input.posStatus === "CLOSED" ? input.resultLabel : "OPEN",
      entry_session: input.entrySession,
      hold_days: Number.parseInt(input.holdDays, 10) || null,
      psychology_tags: input.selectedPsychology,
    },
  };
}
