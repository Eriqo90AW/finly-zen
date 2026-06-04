import {
  createSignal,
  createMemo,
  onMount,
  For,
  Show,
  untrack,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { portfolioState } from "../../store/portfolioStore";
import { getPortfolioTransactionsRaw } from "../../data/portfolioData";
import { getAssetColor } from "../../utils/colors";
import {
  formatPortfolioValue,
  formatDateDetail,
  formatRupiah,
  formatUSD,
  getUsdRate,
} from "../../utils/format";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import type { Portfolio, PortfolioTransactionDB } from "../../types";

interface TradeHistoryProps {
  portfolio: Portfolio;
}

export const TradeHistory = (props: TradeHistoryProps) => {
  const navigate = useNavigate();
  const currency = () => portfolioState.currencyView;
  
  const [rawTransactions, setRawTransactions] = createSignal<PortfolioTransactionDB[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = createSignal(true);
  const [expandedTxId, setExpandedTxId] = createSignal<string | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = createSignal("");
  const [typeFilter, setTypeFilter] = createSignal<string>("ALL");

  type SortKey = "date" | "ticker" | "type" | "qty" | "price" | "amount";

  // Sorting state
  const [sortBy, setSortBy] = createSignal<SortKey>("date");
  const [sortOrder, setSortOrder] = createSignal<"asc" | "desc">("desc");

  onMount(async () => {
    try {
      setIsLoadingTxs(true);
      const data = await getPortfolioTransactionsRaw(props.portfolio.id);
      setRawTransactions(data);
    } catch (e) {
      console.error("Failed to load transactions for Trade History:", e);
    } finally {
      setIsLoadingTxs(false);
    }
  });

  // Calculate transaction amount in native currency
  const getTxAmountInNative = (tx: PortfolioTransactionDB, isUSDPortfolio: boolean) => {
    const qty = Number(tx.qty);
    const price = Number(tx.price_per_unit);
    const rate = Number(tx.price_currency || 1);
    const txCurrency = tx.currency || "USD";

    let pricePerShare = price;
    if (isUSDPortfolio) {
      if (txCurrency !== "USD") {
        pricePerShare = price / rate;
      }
    } else {
      if (txCurrency === "USD") {
        pricePerShare = price * rate;
      }
    }
    return qty * pricePerShare;
  };

  // Convert amount to current view currency (live rate)
  const getDisplayAmount = (amount: number, nativeCurrency: 'IDR' | 'USD') => {
    const displayCurrency = currency();
    if (nativeCurrency === 'USD' && displayCurrency === 'IDR') {
      return amount * getUsdRate();
    } else if (nativeCurrency === 'IDR' && displayCurrency === 'USD') {
      return amount / getUsdRate();
    }
    return amount;
  };

  // Calculate Realized Gain/Loss per ticker across all transactions (sales and dividends)
  const computeRealizedPnLMap = createMemo(() => {
    const transactions = rawTransactions();
    const isUSDPortfolio = props.portfolio.nativeCurrency === 'USD';
    
    // Sort transactions chronologically (ascending date); BUYs first when same date
    const typeOrder: Record<string, number> = { BUY: 0, DEPOSIT: 1, DIVIDEND: 2, SELL: 3, WITHDRAWAL: 4, PENDING: 5 };
    const sortedTxs = [...transactions].sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    });

    const tickerStats: Record<string, {
      ticker: string;
      realizedPnL: number;
    }> = {};

    const runningStats: Record<string, {
      averagePrice: number;
      totalBuyQty: number;
      totalCost: number;
      currentShares: number;
    }> = {};

    sortedTxs.forEach(tx => {
      const ticker = tx.asset_ticker.toUpperCase();
      if (!runningStats[ticker]) {
        runningStats[ticker] = {
          averagePrice: 0,
          totalBuyQty: 0,
          totalCost: 0,
          currentShares: 0
        };
      }
      if (!tickerStats[ticker]) {
        tickerStats[ticker] = {
          ticker,
          realizedPnL: 0
        };
      }

      const stats = runningStats[ticker];
      const qty = Number(tx.qty);
      const price = Number(tx.price_per_unit);
      const rate = Number(tx.price_currency || 1);
      const txCurrency = tx.currency || "USD";

      // Price in native portfolio currency
      let pricePerShare = price;
      if (isUSDPortfolio) {
        if (txCurrency !== "USD") {
          pricePerShare = price / rate;
        }
      } else {
        if (txCurrency === "USD") {
          pricePerShare = price * rate;
        }
      }

      if (tx.type === "BUY") {
        stats.totalBuyQty += qty;
        stats.totalCost += qty * pricePerShare;
        stats.currentShares += qty;
        stats.averagePrice = stats.totalBuyQty > 0 ? stats.totalCost / stats.totalBuyQty : 0;
      } else if (tx.type === "SELL") {
        const costBasisOfSold = qty * stats.averagePrice;
        const revenue = qty * pricePerShare;
        tickerStats[ticker].realizedPnL += (revenue - costBasisOfSold);
        
        stats.currentShares = Math.max(0, stats.currentShares - qty);
        // Round to handle floating-point precision inaccuracies (e.g. 3.6 - 1.2 - 2.4 = 1.11e-16)
        stats.currentShares = Math.round(stats.currentShares * 1e8) / 1e8;
        
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
        tickerStats[ticker].realizedPnL += amount;
      }
    });

    return tickerStats;
  });

  // Compute gain/loss data sorted descending for the horizontal chart
  const chartData = createMemo(() => {
    const pnlMap = computeRealizedPnLMap();
    const list = Object.values(pnlMap);
    list.sort((a, b) => b.realizedPnL - a.realizedPnL);
    return list;
  });

  const chartCategories = createMemo(() => chartData().map((d) => d.ticker));
  const chartSeriesData = createMemo(() =>
    chartData().map((d) => getDisplayAmount(d.realizedPnL, props.portfolio.nativeCurrency))
  );

  const barColors = createMemo(() => {
    return chartData().map((item) => (item.realizedPnL >= 0 ? "#52C278" : "#f43f5e"));
  });

  const barSeries = createMemo(() => [
    {
      name: "Total Realized Gain / Loss",
      data: chartSeriesData(),
    },
  ]);

  // Adjust chart height dynamically based on number of stock tickers
  const chartHeight = createMemo(() => {
    const len = chartCategories().length;
    if (len === 0) return 200;
    return Math.max(200, len * 45 + 50);
  });

  const barOptions = createMemo(
    (): ApexOptions => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "Outfit",
        animations: {
          enabled: true,
          speed: 600,
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "65%",
          distributed: true,
          borderRadius: 4,
          dataLabels: {
            position: "top",
          },
        },
      },
      dataLabels: {
        enabled: true,
        textAnchor: "start",
        offsetX: 8,
        style: {
          colors: ["#5C6B5E"],
          fontFamily: "Outfit",
          fontWeight: 700,
          fontSize: "11px",
        },
        formatter: function (val: any) {
          const num = Number(val);
          return formatPortfolioValue(
            num,
            untrack(() => currency()),
            true,
            props.portfolio.nativeCurrency
          );
        },
      },
      colors: barColors(),
      xaxis: {
        categories: chartCategories(),
        labels: {
          style: {
            colors: "#5C6B5E",
            fontFamily: "Outfit",
            fontSize: "10px",
            fontWeight: 600,
          },
          formatter: (val) => {
            const num = Number(val);
            return formatPortfolioValue(
              num,
              untrack(() => currency()),
              true,
              props.portfolio.nativeCurrency
            );
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#1A4D2E",
            fontFamily: "Outfit",
            fontSize: "12px",
            fontWeight: 700,
          },
        },
      },
      grid: {
        show: true,
        borderColor: "#f1f5f9",
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      tooltip: {
        theme: "dark",
        custom: function ({ series, seriesIndex, dataPointIndex }) {
          const val = series[seriesIndex][dataPointIndex];
          const ticker = chartCategories()[dataPointIndex];
          const isPositive = val >= 0;
          return `
            <div class="px-4 py-3 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-1 min-w-[160px] border border-white/5">
              <span class="font-bold text-sm text-white">${ticker}</span>
              <div class="flex justify-between items-center gap-4 mt-1">
                <span class="text-white/60">Realized PnL</span>
                <span class="font-bold ${isPositive ? "text-[#52C278]" : "text-[#f43f5e]"}">
                  ${formatPortfolioValue(
                    val,
                    untrack(() => currency()),
                    false,
                    props.portfolio.nativeCurrency
                  )}
                </span>
              </div>
            </div>
          `;
        },
      },
      legend: { show: false },
    })
  );

  // Filtered and sorted transactions
  const processedTransactions = createMemo(() => {
    let list = [...rawTransactions()];

    // 1. Search Query filter
    const query = searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter((tx) =>
        tx.asset_ticker.toLowerCase().includes(query)
      );
    }

    // 2. Type filter
    const type = typeFilter();
    if (type !== "ALL") {
      list = list.filter((tx) => tx.type === type);
    }

    // 3. Sorting
    const key = sortBy();
    const order = sortOrder();

    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (key === "date") {
        valA = new Date(a.transaction_date).getTime();
        valB = new Date(b.transaction_date).getTime();
      } else if (key === "ticker") {
        valA = a.asset_ticker.toLowerCase();
        valB = b.asset_ticker.toLowerCase();
      } else if (key === "type") {
        valA = a.type.toLowerCase();
        valB = b.type.toLowerCase();
      } else if (key === "qty") {
        valA = Number(a.qty);
        valB = Number(b.qty);
      } else if (key === "price") {
        // Sort by native unit price
        valA = Number(a.price_per_unit);
        valB = Number(b.price_per_unit);
      } else if (key === "amount") {
        valA = getTxAmountInNative(a, props.portfolio.nativeCurrency === "USD");
        valB = getTxAmountInNative(b, props.portfolio.nativeCurrency === "USD");
      }

      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  });

  const handleSort = (key: SortKey) => {
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

  // Helper to format currency values per transaction currency
  const formatTxCurrency = (amount: number, txCurrency: string) => {
    if (txCurrency === "USD") return formatUSD(amount);
    if (txCurrency === "IDR") return formatRupiah(amount);
    return `${amount.toLocaleString()} ${txCurrency}`;
  };

  // Realized stats
  const totalPnL = createMemo(() => {
    const pnlMap = computeRealizedPnLMap();
    return Object.values(pnlMap).reduce((sum, item) => sum + item.realizedPnL, 0);
  });
  const isPositivePnL = createMemo(() => totalPnL() >= 0);

  return (
    <div class="flex flex-col gap-6">
      {/* Header */}
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center gap-4">
          <button
            onClick={() => navigate(`/portfolio/${props.portfolio.id}`)}
            class="w-10 h-10 rounded-xl hover:bg-forest/5 flex items-center justify-center text-forest transition-colors duration-200 border border-forest/10 cursor-pointer"
          >
            <ChevronLeftIcon />
          </button>
          <div>
            <h1 class="text-4xl font-cormorant text-forest font-bold tracking-tight mb-1">
              {props.portfolio.name}
            </h1>
            <p class="text-earth font-outfit tracking-wide uppercase text-[10px] font-bold">
              Trade History & Performance Analysis
            </p>
          </div>
        </div>

        {/* Quick Summary Pills */}
        <div class="flex gap-4">
          <div class="bg-white border border-forest/10 rounded-2xl px-5 py-2.5 flex flex-col font-outfit shadow-sm">
            <span class="text-[10px] text-earth/50 uppercase font-black tracking-wider leading-none mb-1">Total Trades</span>
            <span class="text-lg font-bold text-forest leading-tight">
              {isLoadingTxs() ? "..." : rawTransactions().length}
            </span>
          </div>

          <div class="bg-white border border-forest/10 rounded-2xl px-5 py-2.5 flex flex-col font-outfit shadow-sm">
            <span class="text-[10px] text-earth/50 uppercase font-black tracking-wider leading-none mb-1">Total Realized Return</span>
            <div class="flex items-center gap-1">
              <span
                class={`text-lg font-bold leading-tight ${
                  isPositivePnL() ? "text-spring" : "text-[#f43f5e]"
                }`}
              >
                {formatPortfolioValue(
                  totalPnL(),
                  currency(),
                  false,
                  props.portfolio.nativeCurrency
                )}
              </span>
              <span
                class={`material-icons text-sm ${
                  isPositivePnL() ? "text-spring" : "text-[#f43f5e]"
                }`}
              >
                {isPositivePnL() ? "trending_up" : "trending_down"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart Card */}
      <div class="premium-card p-6 flex flex-col cursor-default">
        <div class="border-b border-forest/5 pb-4 mb-4">
          <h4 class="font-outfit font-bold text-forest text-base">
            Realized Gain / Loss Per Traded Stock
          </h4>
          <p class="text-earth/60 font-outfit text-xs mt-1">
            Visualizing realized performance (sales and dividends) for each asset ticker, sorted by highest gains.
          </p>
        </div>

        <Show
          when={!isLoadingTxs() && chartData().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-12">
              <span class="material-icons text-4xl text-forest/10 mb-2">bar_chart</span>
              {isLoadingTxs() ? "Loading performance chart..." : "No traded stocks available for this portfolio."}
            </div>
          }
        >
          <div class="w-full" style={{ "min-height": `${chartHeight()}px` }}>
            <SolidApexCharts
              options={barOptions()}
              series={barSeries()}
              type="bar"
              height={chartHeight()}
            />
          </div>
        </Show>
      </div>

      {/* Transactions Table Card */}
      <div class="premium-card overflow-hidden">
        {/* Table Filters & Toolbar */}
        <div class="px-8 py-6 border-b border-forest/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
          <div class="flex flex-col gap-1 w-full md:w-auto">
            <h4 class="font-outfit font-bold text-forest text-lg">Transaction History</h4>
            <p class="text-earth/50 text-xs font-outfit">Detailed log of all recorded asset purchases and sales.</p>
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Search Input */}
            <div class="relative flex items-center bg-sage/20 border border-forest/10 rounded-xl px-3 py-1.5 focus-within:border-forest/30 transition-all duration-200 w-full md:w-56">
              <span class="material-icons text-earth/40 text-sm mr-2 select-none">search</span>
              <input
                type="text"
                placeholder="Search Ticker..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                class="bg-transparent border-0 font-outfit text-xs text-forest placeholder-earth/40 outline-none w-full p-0"
              />
              <Show when={searchQuery()}>
                <button
                  onClick={() => setSearchQuery("")}
                  class="material-icons text-earth/40 hover:text-forest text-sm bg-transparent border-0 cursor-pointer p-0"
                >
                  close
                </button>
              </Show>
            </div>

            {/* Type Selector Pills */}
            <div class="flex bg-sage/20 p-1 rounded-xl border border-forest/5 shadow-inner">
              <For each={["ALL", "BUY", "SELL", "DIVIDEND"]}>
                {(type) => {
                  const isActive = () => typeFilter() === type;
                  return (
                    <button
                      onClick={() => setTypeFilter(type)}
                      class={`px-3 py-1.5 rounded-lg text-[10px] font-outfit font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider ${
                        isActive()
                          ? "bg-forest text-white shadow-sm"
                          : "text-earth/65 hover:text-forest hover:bg-forest/5"
                      }`}
                    >
                      {type}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div class="overflow-x-auto w-full">
          <div class="min-w-[900px] flex flex-col">
            {/* Table Headers */}
            <div class="flex items-center px-8 py-4 border-b border-forest/5 text-[11px] font-bold uppercase tracking-widest text-earth/60 select-none">
              <div class="w-1 mr-4" /> {/* Asset color bar spacer */}
              
              <button
                onClick={() => handleSort("ticker")}
                class="flex-[1.5] flex items-center gap-1 hover:text-forest transition-colors cursor-pointer uppercase text-left font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none"
              >
                Asset
                <span class="material-icons text-[14px]">
                  {sortBy() === "ticker" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                </span>
              </button>

              <button
                onClick={() => handleSort("type")}
                class="flex-1 flex items-center gap-1 hover:text-forest transition-colors cursor-pointer uppercase text-left font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none"
              >
                Type
                <span class="material-icons text-[14px]">
                  {sortBy() === "type" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                </span>
              </button>

              <button
                onClick={() => handleSort("date")}
                class="flex-[2] flex items-center gap-1 hover:text-forest transition-colors cursor-pointer uppercase text-left font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none"
              >
                Date
                <span class="material-icons text-[14px]">
                  {sortBy() === "date" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                </span>
              </button>

              <button
                onClick={() => handleSort("qty")}
                class="flex-1 flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none"
              >
                <span class="material-icons text-[14px]">
                  {sortBy() === "qty" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                </span>
                Shares
              </button>

              <button
                onClick={() => handleSort("price")}
                class="flex-[1.5] flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none"
              >
                <span class="material-icons text-[14px]">
                  {sortBy() === "price" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                </span>
                Price / Share
              </button>

              <button
                onClick={() => handleSort("amount")}
                class="flex-[1.5] flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none"
              >
                <span class="material-icons text-[14px]">
                  {sortBy() === "amount" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                </span>
                Total
              </button>

              <div class="w-12" /> {/* Expand icon column spacer */}
            </div>

            {/* Table Body */}
            <div class="flex flex-col">
              <Show
                when={!isLoadingTxs()}
                fallback={
                  <For each={[1, 2, 3]}>
                    {() => (
                      <div class="flex items-center px-8 py-5 border-b border-forest/5 animate-pulse">
                        <div class="w-1 mr-4 h-8 bg-sage/20 rounded-full" />
                        <div class="flex-[1.5] h-5 bg-sage/20 rounded w-16" />
                        <div class="flex-1 h-5 bg-sage/20 rounded w-12" />
                        <div class="flex-[2] h-5 bg-sage/20 rounded w-28" />
                        <div class="flex-1 h-5 bg-sage/20 rounded w-10 ml-auto" />
                        <div class="flex-[1.5] h-5 bg-sage/20 rounded w-20 ml-auto" />
                        <div class="flex-[1.5] h-5 bg-sage/20 rounded w-24 ml-auto" />
                        <div class="w-12" />
                      </div>
                    )}
                  </For>
                }
              >
                <For
                  each={processedTransactions()}
                  fallback={
                    <div class="px-8 py-16 text-center text-earth/40 italic font-outfit">
                      {rawTransactions().length === 0
                        ? "No transactions recorded for this portfolio."
                        : "No transactions match your search filter."}
                    </div>
                  }
                >
                  {(tx) => {
                    const assetColor = getAssetColor(tx.asset_ticker);
                    const isExpanded = () => expandedTxId() === tx.id;
                    const displayAmt = getTxAmountInNative(tx, props.portfolio.nativeCurrency === "USD");

                    return (
                      <div class="flex flex-col border-b border-forest/5 bg-white">
                        {/* Transaction summary row */}
                        <div
                          onClick={() => toggleRowExpand(tx.id)}
                          class="group flex items-center px-8 py-4.5 hover:bg-earth/5 transition-colors duration-150 cursor-pointer relative"
                        >
                          {/* Color bar */}
                          <div
                            class="absolute left-0 top-0 bottom-0 w-1 transition-transform duration-200 group-hover:scale-x-[1.5] origin-left"
                            style={{ "background-color": assetColor }}
                          />

                          {/* Ticker badge */}
                          <div class="flex-[1.5] pr-4 flex items-center min-w-0">
                            <span class="font-outfit font-black text-forest text-sm bg-sage/25 px-2.5 py-1.5 rounded-lg border border-forest/5 tracking-wide">
                              {tx.asset_ticker}
                            </span>
                          </div>

                          {/* Type indicator */}
                          <div class="flex-1 pr-4">
                            <span
                              class={`inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                                tx.type === "BUY"
                                  ? "bg-spring/10 text-spring border-spring/20"
                                  : tx.type === "SELL"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </div>

                          {/* Transaction Date */}
                          <div class="flex-[2] pr-4 text-xs font-outfit text-earth/80">
                            {formatDateDetail(tx.transaction_date)}
                          </div>

                          {/* Shares count */}
                          <div class="flex-1 pr-4 text-right font-outfit font-bold text-xs text-forest">
                            {Number(tx.qty).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          </div>

                          {/* Price per unit */}
                          <div class="flex-[1.5] pr-4 text-right font-outfit font-bold text-xs text-forest">
                            {formatTxCurrency(Number(tx.price_per_unit), tx.currency)}
                          </div>

                          {/* Computed Total Amount */}
                          <div class="flex-[1.5] pr-4 text-right flex flex-col items-end">
                            <span class="font-outfit font-black text-xs text-forest">
                              {formatTxCurrency(Number(tx.qty) * Number(tx.price_per_unit), tx.currency)}
                            </span>
                            {/* If transaction currency is different than display/native currency view, show the converted rate */}
                            <Show when={tx.currency !== currency()}>
                              <span class="text-[9px] text-earth/40 font-semibold mt-0.5">
                                ≈ {formatPortfolioValue(
                                  displayAmt,
                                  currency(),
                                  false,
                                  props.portfolio.nativeCurrency
                                )}
                              </span>
                            </Show>
                          </div>

                          {/* Expand chevron */}
                          <div class="w-12 flex justify-center text-earth/40 select-none">
                            <span
                              class={`material-icons transition-transform duration-200 ${
                                isExpanded() ? "rotate-180" : ""
                              }`}
                            >
                              expand_more
                            </span>
                          </div>
                        </div>

                        {/* Collapsible Details Panel */}
                        <Show when={isExpanded()}>
                          <div class="px-8 py-5 bg-[#F6F8F6] border-t border-forest/5 font-outfit flex flex-col gap-4 text-xs text-forest animate-slide-down">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div class="flex flex-col gap-1.5">
                                <span class="text-[10px] text-earth/50 font-bold uppercase tracking-wider">Exchange Rate (price_currency)</span>
                                <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                                  <span class="material-icons text-sm text-earth/40">currency_exchange</span>
                                  1 {tx.currency} = {Number(tx.price_currency).toLocaleString(undefined, { maximumFractionDigits: 4 })} {props.portfolio.nativeCurrency}
                                </span>
                              </div>

                              <div class="flex flex-col gap-1.5">
                                <span class="text-[10px] text-earth/50 font-bold uppercase tracking-wider">Created Timestamp</span>
                                <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                                  <span class="material-icons text-sm text-earth/40">add_circle_outline</span>
                                  {formatDateDetail(tx.created_at)}
                                </span>
                              </div>

                              <div class="flex flex-col gap-1.5">
                                <span class="text-[10px] text-earth/50 font-bold uppercase tracking-wider">Last Updated Timestamp</span>
                                <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                                  <span class="material-icons text-sm text-earth/40">edit</span>
                                  {formatDateDetail(tx.updated_at)}
                                </span>
                              </div>
                            </div>

                            <div class="flex flex-col gap-1.5">
                              <span class="text-[10px] text-earth/50 font-bold uppercase tracking-wider">Transaction Notes</span>
                              <div class="bg-white border border-forest/10 rounded-xl p-4 text-forest/80 shadow-sm min-h-[60px] flex gap-2.5 items-start">
                                <span class="material-icons text-base text-earth/35 mt-0.5">description</span>
                                <p class={`leading-relaxed ${!tx.notes ? "italic text-earth/40" : ""}`}>
                                  {tx.notes || "No notes recorded for this transaction."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
