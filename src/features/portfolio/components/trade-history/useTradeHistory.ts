import { createEffect, createMemo, createSignal, onMount } from "solid-js";
import { getPortfolioTransactionsRaw } from "../../../../data/portfolioData";
import { portfolioState } from "../../../../store/portfolioStore";
import type { Portfolio, PortfolioTransactionDB } from "../../../../types";
import {
  computeLeadersBoard,
  computeMonthlyActivityData,
  computeRealizedPnLAnalytics,
  computeTradeSummaryStats,
  convertToDisplayAmount,
  sortAndFilterTransactions,
  type TradeSortKey,
} from "./tradeHistoryHelpers";

export const useTradeHistory = (getPortfolio: () => Portfolio) => {
  const currency = () => portfolioState.currencyView;
  const pageSize = 20;

  const [rawTransactions, setRawTransactions] = createSignal<
    PortfolioTransactionDB[]
  >([]);
  const [isLoadingTxs, setIsLoadingTxs] = createSignal(true);
  const [expandedTxId, setExpandedTxId] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [typeFilter, setTypeFilter] = createSignal<string>("ALL");
  const [sortBy, setSortBy] = createSignal<TradeSortKey>("date");
  const [sortOrder, setSortOrder] = createSignal<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = createSignal(1);

  const tickerLogos = createMemo(() => {
    const map: Record<string, string> = {};
    for (const asset of getPortfolio().assets || []) {
      if (asset.logoUrl) {
        map[asset.ticker.toUpperCase()] = asset.logoUrl;
      }
    }
    return map;
  });

  const tickerNames = createMemo(() => {
    const map: Record<string, string> = {};
    for (const asset of getPortfolio().assets || []) {
      if (asset.name) {
        map[asset.ticker.toUpperCase()] = asset.name;
      }
    }
    return map;
  });

  onMount(async () => {
    try {
      setIsLoadingTxs(true);
      const data = await getPortfolioTransactionsRaw(getPortfolio().id);
      setRawTransactions(data);
    } catch (e) {
      console.error("Failed to load transactions for Trade History:", e);
    } finally {
      setIsLoadingTxs(false);
    }
  });

  const pnlAnalytics = createMemo(() =>
    computeRealizedPnLAnalytics(
      rawTransactions(),
      getPortfolio().nativeCurrency === "USD",
    ),
  );

  const summaryStats = createMemo(() =>
    computeTradeSummaryStats(
      rawTransactions(),
      getPortfolio().nativeCurrency === "USD",
      pnlAnalytics().pnlMap,
    ),
  );

  const cumulativePnLData = createMemo(() => pnlAnalytics().cumulativeTimeline);

  const monthlyActivityData = createMemo(() =>
    computeMonthlyActivityData(rawTransactions()),
  );

  const volumeBreakdown = createMemo(() => {
    const stats = summaryStats();
    const native = getPortfolio().nativeCurrency;
    const disp = currency();
    return {
      series: [
        convertToDisplayAmount(stats.buyVolume, native, disp),
        convertToDisplayAmount(stats.sellVolume, native, disp),
        convertToDisplayAmount(stats.dividendIncome, native, disp),
      ],
      labels: ["Buy Volume", "Sell Volume", "Dividend Income"],
    };
  });

  const leadersBoard = createMemo(() =>
    computeLeadersBoard(pnlAnalytics().pnlMap),
  );

  const tickerPnLList = createMemo(() =>
    Object.values(pnlAnalytics().pnlMap).sort(
      (a, b) => b.realizedPnL - a.realizedPnL,
    ),
  );

  const processedTransactions = createMemo(() =>
    sortAndFilterTransactions(
      rawTransactions(),
      searchQuery(),
      typeFilter(),
      sortBy(),
      sortOrder(),
      getPortfolio().nativeCurrency === "USD",
    ),
  );

  createEffect(() => {
    const total = Math.ceil(processedTransactions().length / pageSize);
    if (currentPage() > total && total > 0) {
      setCurrentPage(total);
    } else if (total === 0) {
      setCurrentPage(1);
    }
  });

  const paginatedTransactions = createMemo(() => {
    const start = (currentPage() - 1) * pageSize;
    return processedTransactions().slice(start, start + pageSize);
  });

  const totalPages = createMemo(
    () => Math.ceil(processedTransactions().length / pageSize) || 1,
  );

  const handleSort = (key: TradeSortKey) => {
    if (sortBy() === key) {
      setSortOrder(sortOrder() === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedTxId(expandedTxId() === id ? null : id);
  };

  return {
    currency,
    pageSize,
    rawTransactions,
    isLoadingTxs,
    expandedTxId,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sortBy,
    sortOrder,
    currentPage,
    setCurrentPage,
    tickerLogos,
    tickerNames,
    summaryStats,
    cumulativePnLData,
    monthlyActivityData,
    volumeBreakdown,
    leadersBoard,
    tickerPnLList,
    processedTransactions,
    paginatedTransactions,
    totalPages,
    handleSort,
    toggleRowExpand,
  };
};
