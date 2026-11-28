import type { AllocationItem, Portfolio, PortfolioAsset } from "../../../types";
import { getAssetColor } from "../../../utils/colors";
import type {
  AssetCategory,
  CategoryPnLItem,
  PerfKpi,
  PerfPeriod,
  PerfPoint,
  PortfolioAllocations,
} from "../types";
import { getCategory, getCategoryIcon, getDisplayTicker } from "./quickPortfolioFormatters";

export interface PortfolioKpiSummary {
  assetsValue: number;
  cashBalance: number;
  totalValue: number;
  initialCapital: number;
  overallPL: number;
  overallPLPercent: number;
  todayChange: number;
  todayChangePercent: number;
  hasTodayChangeData: boolean;
  distinctAssetCount: number;
}

export const computePortfolioKpis = (portfolio: Portfolio | null): PortfolioKpiSummary => {
  const assets = portfolio?.assets || [];
  const assetsValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const cashBalance = portfolio?.cash || 0;
  const totalValue = portfolio?.totalValue ?? assetsValue + cashBalance;
  const initialCapital = portfolio?.initialCapital || 0;
  const overallPL = portfolio?.allTimeGain ?? totalValue - initialCapital;
  const overallPLPercent =
    portfolio && typeof portfolio.allTimeGainPercentage === "number"
      ? portfolio.allTimeGainPercentage / 100
      : initialCapital > 0
        ? overallPL / initialCapital
        : 0;

  const todayChange = assets.reduce((sum, a) => sum + (a.dayChange || 0), 0);
  const previousTotal = assets.reduce(
    (sum, a) => sum + (a.previousClose !== null ? a.totalShares * a.previousClose : 0),
    0,
  );
  const todayChangePercent = previousTotal > 0 ? (todayChange / previousTotal) * 100 : 0;
  const hasTodayChangeData = assets.some((a) => a.previousClose !== null);
  const distinctAssetCount = assets.filter((a) => a.totalShares > 0).length;

  return {
    assetsValue,
    cashBalance,
    totalValue,
    initialCapital,
    overallPL,
    overallPLPercent,
    todayChange,
    todayChangePercent,
    hasTodayChangeData,
    distinctAssetCount,
  };
};

export const computeCategoryPnL = (assets: PortfolioAsset[]): CategoryPnLItem[] => {
  const categories: AssetCategory[] = ["Stocks", "IDX", "Crypto"];

  return categories.map((cat) => {
    const icon = getCategoryIcon(cat);
    const catAssets = assets.filter((a) => getCategory(a.ticker) === cat);

    let catTotalValue = 0;
    let catOverallPL = 0;
    let catCostBasis = 0;
    let catTodayChange = 0;
    let catPreviousTotal = 0;

    for (const a of catAssets) {
      catTotalValue += a.currentValue;
      catOverallPL += a.totalGainLoss;
      catCostBasis += a.currentValue - a.totalGainLoss;
      catTodayChange += a.dayChange || 0;
      if (a.previousClose !== null) {
        catPreviousTotal += a.totalShares * a.previousClose;
      }
    }

    const overallPLPercent = catCostBasis > 0 ? catOverallPL / catCostBasis : 0;
    const todayChangePercent =
      catPreviousTotal > 0 ? (catTodayChange / catPreviousTotal) * 100 : 0;

    return {
      category: cat,
      icon,
      totalValue: catTotalValue,
      overallPL: catOverallPL,
      overallPLPercent,
      todayChange: catTodayChange,
      todayChangePercent,
      assetCount: catAssets.length,
    };
  });
};

export const EMPTY_ALLOCATIONS: PortfolioAllocations = {
  stocks: 0,
  idx: 0,
  crypto: 0,
  cash: 0,
  market: { stocks: 0, idx: 0, crypto: 0, cash: 0 },
  cost: { stocks: 0, idx: 0, crypto: 0, cash: 0 },
  marketValues: { stocks: 0, idx: 0, crypto: 0, cash: 0 },
  costValues: { stocks: 0, idx: 0, crypto: 0, cash: 0 },
  drift: { stocks: 0, idx: 0, crypto: 0, cash: 0 },
};

export const computeAllocations = (
  portfolio: Portfolio | null,
  totalValue: number,
  initialCapital: number,
  cash: number,
): PortfolioAllocations => {
  if (!portfolio) return EMPTY_ALLOCATIONS;

  const totalMkt = totalValue || 1;
  const totalCost = initialCapital || 1;

  let stocksMkt = 0;
  let idxMkt = 0;
  let cryptoMkt = 0;
  let stocksCost = 0;
  let idxCost = 0;
  let cryptoCost = 0;

  for (const a of portfolio.assets || []) {
    const cat = getCategory(a.ticker);
    const cost = a.currentValue - a.totalGainLoss;
    if (cat === "IDX") {
      idxMkt += a.currentValue;
      idxCost += cost;
    } else if (cat === "Crypto") {
      cryptoMkt += a.currentValue;
      cryptoCost += cost;
    } else {
      stocksMkt += a.currentValue;
      stocksCost += cost;
    }
  }

  const mktStocks = (stocksMkt / totalMkt) * 100;
  const mktIdx = (idxMkt / totalMkt) * 100;
  const mktCrypto = (cryptoMkt / totalMkt) * 100;
  const mktCash = (cash / totalMkt) * 100;

  const costStocks = (stocksCost / totalCost) * 100;
  const costIdx = (idxCost / totalCost) * 100;
  const costCrypto = (cryptoCost / totalCost) * 100;
  const costCash = (cash / totalCost) * 100;

  return {
    stocks: mktStocks,
    idx: mktIdx,
    crypto: mktCrypto,
    cash: mktCash,
    market: { stocks: mktStocks, idx: mktIdx, crypto: mktCrypto, cash: mktCash },
    cost: { stocks: costStocks, idx: costIdx, crypto: costCrypto, cash: costCash },
    marketValues: { stocks: stocksMkt, idx: idxMkt, crypto: cryptoMkt, cash },
    costValues: { stocks: stocksCost, idx: idxCost, crypto: cryptoCost, cash },
    drift: {
      stocks: mktStocks - costStocks,
      idx: mktIdx - costIdx,
      crypto: mktCrypto - costCrypto,
      cash: mktCash - costCash,
    },
  };
};

export const computeDetailAllocations = (
  portfolio: Portfolio | null,
  totalValue: number,
  initialCapital: number,
  cash: number,
): AllocationItem[] => {
  if (!portfolio) return [];

  const totalMkt = totalValue || 1;
  const totalCost = initialCapital || 1;
  const cashMktPct = totalMkt > 0 ? (cash / totalMkt) * 100 : 0;
  const cashCostPct = totalCost > 0 ? (cash / totalCost) * 100 : 0;

  const items: AllocationItem[] = (portfolio.assets || []).map((a) => {
    const cost = a.currentValue - a.totalGainLoss;
    const mktPct = totalMkt > 0 ? (a.currentValue / totalMkt) * 100 : 0;
    const costPct = totalCost > 0 ? (cost / totalCost) * 100 : 0;

    return {
      isCash: false,
      ticker: getDisplayTicker(a.ticker),
      name: a.name || a.ticker,
      value: a.currentValue,
      costBasis: cost,
      percentage: mktPct,
      costPercentage: costPct,
      drift: mktPct - costPct,
      color: getAssetColor(a.ticker),
    };
  });

  items.push({
    isCash: true,
    ticker: "Cash",
    name: "Liquidity",
    value: cash,
    costBasis: cash,
    percentage: cashMktPct,
    costPercentage: cashCostPct,
    drift: cashMktPct - cashCostPct,
    color: "#cbd5e1",
  });

  return items.sort((a, b) => b.percentage - a.percentage);
};

export const computePerformanceSeries = (
  portfolio: Portfolio | null,
  initialCapital: number,
  totalValue: number,
  period: PerfPeriod,
): PerfPoint[] => {
  const firstTxTs = portfolio?.transactions?.length
    ? new Date(
        [...portfolio.transactions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )[0].date,
      ).getTime()
    : null;

  const nowVal = Date.now();
  const startTs = firstTxTs ?? nowVal - 30 * 24 * 60 * 60 * 1000;

  let cutoff = startTs;
  if (period === "1D") cutoff = nowVal - 24 * 60 * 60 * 1000;
  else if (period === "1W") cutoff = nowVal - 7 * 24 * 60 * 60 * 1000;
  else if (period === "1M") cutoff = nowVal - 30 * 24 * 60 * 60 * 1000;
  else if (period === "1Y") cutoff = nowVal - 365 * 24 * 60 * 60 * 1000;

  const effectiveStart = Math.max(cutoff, startTs);
  if (initialCapital === 0 && totalValue === 0) return [];

  const pointCount = period === "1D" ? 24 : period === "1W" ? 28 : 30;
  const startVal = initialCapital > 0 ? initialCapital : totalValue;
  const delta = totalValue - startVal;
  const span = nowVal - effectiveStart;
  const step = span / (pointCount - 1);

  const points: PerfPoint[] = [];
  let seed = Math.floor(effectiveStart / (60 * 60 * 1000));
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < pointCount; i++) {
    const t = i === pointCount - 1 ? nowVal : effectiveStart + i * step;
    const prog = i / (pointCount - 1);
    const base = startVal + delta * prog;
    const wiggle = (rand() - 0.5) * 0.012 * base * (1 - Math.abs(prog - 0.5) * 1.4);
    const val = i === pointCount - 1 ? totalValue : Math.max(0, base + wiggle);
    points.push({ date: t, value: val });
  }
  return points;
};

export const computePerfKpi = (series: PerfPoint[]): PerfKpi | null => {
  if (series.length < 2) return null;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const change = last - first;
  const pct = first > 0 ? (change / first) * 100 : 0;
  return { change, pct, isPositive: change >= 0 };
};
