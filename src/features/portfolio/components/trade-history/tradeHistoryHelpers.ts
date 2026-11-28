import type { PortfolioTransactionDB } from "../../../../types";
import { formatRupiah, formatUSD, getUsdRate } from "../../../../utils/format";
import type {
  CumulativePnLPoint,
  LeadersBoardData,
  MonthlyActivityData,
  TickerPnLItem,
  TradeSortKey,
  TradeSummaryStatsData,
} from "./tradeHistoryTypes";

export type {
  CumulativePnLPoint,
  LeadersBoardData,
  MonthlyActivityData,
  TickerPnLItem,
  TradeSortKey,
  TradeSummaryStatsData,
  VolumeBreakdownData,
} from "./tradeHistoryTypes";

const TX_TYPE_ORDER: Record<string, number> = {
  BUY: 0,
  DEPOSIT: 1,
  DIVIDEND: 2,
  SELL: 3,
  WITHDRAWAL: 4,
  PENDING: 5,
};

const getNativePricePerShare = (
  tx: PortfolioTransactionDB,
  isUSDPortfolio: boolean,
): number => {
  const price = Number(tx.price_per_unit);
  const rate = Number(tx.fx_rate_to_base || 1);
  const txCurrency = tx.settlement_currency || "USD";

  if (isUSDPortfolio) {
    return txCurrency !== "USD" ? price / rate : price;
  }
  return txCurrency === "USD" ? price * rate : price;
};

export const getTxAmountInNative = (
  tx: PortfolioTransactionDB,
  isUSDPortfolio: boolean,
): number => Number(tx.qty) * getNativePricePerShare(tx, isUSDPortfolio);

export const convertToDisplayAmount = (
  amount: number,
  nativeCurrency: "IDR" | "USD",
  displayCurrency: "IDR" | "USD",
): number => {
  if (nativeCurrency === "USD" && displayCurrency === "IDR") {
    return amount * getUsdRate();
  }
  if (nativeCurrency === "IDR" && displayCurrency === "USD") {
    return amount / getUsdRate();
  }
  return amount;
};

export const computeRealizedPnLAnalytics = (
  transactions: PortfolioTransactionDB[],
  isUSDPortfolio: boolean,
): {
  pnlMap: Record<string, TickerPnLItem>;
  cumulativeTimeline: CumulativePnLPoint[];
} => {
  const sortedTxs = [...transactions].sort((a, b) => {
    const dateA = new Date(a.transaction_date).getTime();
    const dateB = new Date(b.transaction_date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (TX_TYPE_ORDER[a.type] ?? 9) - (TX_TYPE_ORDER[b.type] ?? 9);
  });

  const pnlMap: Record<string, TickerPnLItem> = {};
  const runningStats: Record<
    string,
    { averagePrice: number; totalBuyQty: number; totalCost: number; currentShares: number }
  > = {};

  let totalPnLAccumulator = 0;
  const rawTimeline: CumulativePnLPoint[] = [];

  for (const tx of sortedTxs) {
    const ticker = tx.asset_ticker.toUpperCase();
    if (!runningStats[ticker]) {
      runningStats[ticker] = { averagePrice: 0, totalBuyQty: 0, totalCost: 0, currentShares: 0 };
    }
    if (!pnlMap[ticker]) {
      pnlMap[ticker] = { ticker, realizedPnL: 0 };
    }

    const stats = runningStats[ticker];
    const qty = Number(tx.qty);
    const pricePerShare = getNativePricePerShare(tx, isUSDPortfolio);

    if (tx.type === "BUY") {
      stats.totalBuyQty += qty;
      stats.totalCost += qty * pricePerShare;
      stats.currentShares += qty;
      stats.averagePrice = stats.totalBuyQty > 0 ? stats.totalCost / stats.totalBuyQty : 0;
    } else if (tx.type === "SELL") {
      const realized = qty * pricePerShare - qty * stats.averagePrice;
      pnlMap[ticker].realizedPnL += realized;
      totalPnLAccumulator += realized;

      stats.currentShares = Math.round(Math.max(0, stats.currentShares - qty) * 1e8) / 1e8;
      if (stats.currentShares === 0) {
        stats.totalBuyQty = 0;
        stats.totalCost = 0;
        stats.averagePrice = 0;
      } else {
        stats.totalBuyQty = stats.currentShares;
        stats.totalCost = stats.currentShares * stats.averagePrice;
      }
    } else if (tx.type === "DIVIDEND") {
      const amount = qty * pricePerShare;
      pnlMap[ticker].realizedPnL += amount;
      totalPnLAccumulator += amount;
    }

    if (tx.type === "SELL" || tx.type === "DIVIDEND") {
      const dateStr = new Date(tx.transaction_date).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      rawTimeline.push({ date: dateStr, value: totalPnLAccumulator });
    }
  }

  const aggregated: Record<string, number> = {};
  for (const point of rawTimeline) {
    aggregated[point.date] = point.value;
  }

  return {
    pnlMap,
    cumulativeTimeline: Object.entries(aggregated).map(([date, value]) => ({ date, value })),
  };
};

export const computeTradeSummaryStats = (
  transactions: PortfolioTransactionDB[],
  isUSDPortfolio: boolean,
  pnlMap: Record<string, TickerPnLItem>,
): TradeSummaryStatsData => {
  let buyVolume = 0;
  let sellVolume = 0;
  let dividendIncome = 0;

  for (const tx of transactions) {
    const nativeAmt = getTxAmountInNative(tx, isUSDPortfolio);
    if (tx.type === "BUY") buyVolume += nativeAmt;
    else if (tx.type === "SELL") sellVolume += nativeAmt;
    else if (tx.type === "DIVIDEND") dividendIncome += nativeAmt;
  }

  const realizedPnL = Object.values(pnlMap).reduce((sum, item) => sum + item.realizedPnL, 0);
  return { totalTrades: transactions.length, realizedPnL, buyVolume, sellVolume, dividendIncome };
};

export const computeMonthlyActivityData = (
  transactions: PortfolioTransactionDB[],
): MonthlyActivityData => {
  const monthsOrder: string[] = [];
  const grouped: Record<string, { BUY: number; SELL: number; DIVIDEND: number }> = {};

  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime(),
  );

  for (const tx of sortedTxs) {
    if (tx.type !== "BUY" && tx.type !== "SELL" && tx.type !== "DIVIDEND") continue;
    const monthStr = new Date(tx.transaction_date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    if (!grouped[monthStr]) {
      grouped[monthStr] = { BUY: 0, SELL: 0, DIVIDEND: 0 };
      monthsOrder.push(monthStr);
    }
    grouped[monthStr][tx.type]++;
  }

  return {
    categories: monthsOrder,
    series: [
      { name: "BUY", data: monthsOrder.map((m) => grouped[m].BUY) },
      { name: "SELL", data: monthsOrder.map((m) => grouped[m].SELL) },
      { name: "DIVIDEND", data: monthsOrder.map((m) => grouped[m].DIVIDEND) },
    ],
  };
};

export const computeLeadersBoard = (
  pnlMap: Record<string, TickerPnLItem>,
): LeadersBoardData => {
  const list = Object.values(pnlMap);
  return {
    gainers: list
      .filter((item) => item.realizedPnL > 0)
      .sort((a, b) => b.realizedPnL - a.realizedPnL)
      .slice(0, 3),
    losers: list
      .filter((item) => item.realizedPnL < 0)
      .sort((a, b) => a.realizedPnL - b.realizedPnL)
      .slice(0, 3),
  };
};

export const sortAndFilterTransactions = (
  transactions: PortfolioTransactionDB[],
  searchQuery: string,
  typeFilter: string,
  sortBy: TradeSortKey,
  sortOrder: "asc" | "desc",
  isUSDPortfolio: boolean,
): PortfolioTransactionDB[] => {
  let list = [...transactions];
  const query = searchQuery.trim().toLowerCase();

  if (query) {
    list = list.filter((tx) => tx.asset_ticker.toLowerCase().includes(query));
  }
  if (typeFilter !== "ALL") {
    list = list.filter((tx) => tx.type === typeFilter);
  }

  list.sort((a, b) => {
    if (sortBy === "ticker" || sortBy === "type") {
      const valA = sortBy === "ticker" ? a.asset_ticker.toLowerCase() : a.type.toLowerCase();
      const valB = sortBy === "ticker" ? b.asset_ticker.toLowerCase() : b.type.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    }

    let valA = 0;
    let valB = 0;
    if (sortBy === "date") {
      valA = new Date(a.transaction_date).getTime();
      valB = new Date(b.transaction_date).getTime();
    } else if (sortBy === "qty") {
      valA = Number(a.qty);
      valB = Number(b.qty);
    } else if (sortBy === "price") {
      valA = Number(a.price_per_unit);
      valB = Number(b.price_per_unit);
    } else if (sortBy === "amount") {
      valA = getTxAmountInNative(a, isUSDPortfolio);
      valB = getTxAmountInNative(b, isUSDPortfolio);
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return list;
};

export const formatTxCurrency = (amount: number, txCurrency: string): string => {
  if (txCurrency === "USD") return formatUSD(amount);
  if (txCurrency === "IDR") return formatRupiah(amount);
  return `${amount.toLocaleString()} ${txCurrency}`;
};

export const formatAreaChartValue = (
  val: number,
  nativeCurrency: "IDR" | "USD",
  displayCurrency: "IDR" | "USD",
): string => {
  const displayAmount = convertToDisplayAmount(val, nativeCurrency, displayCurrency);
  if (displayCurrency === "USD") {
    return formatUSD(displayAmount, 2);
  }
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(displayAmount));
  return `${displayAmount < 0 ? "-" : ""}Rp${formatted}`;
};
