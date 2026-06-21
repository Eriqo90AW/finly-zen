import {
  createSignal,
  createMemo,
  onMount,
  For,
  Show,
  untrack,
  createEffect,
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

  // Pagination state
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const tickerLogos = createMemo(() => {
    const map: Record<string, string> = {};
    if (props.portfolio?.assets) {
      props.portfolio.assets.forEach(asset => {
        if (asset.logoUrl) {
          map[asset.ticker.toUpperCase()] = asset.logoUrl;
        }
      });
    }
    return map;
  });

  const tickerNames = createMemo(() => {
    const map: Record<string, string> = {};
    if (props.portfolio?.assets) {
      props.portfolio.assets.forEach(asset => {
        if (asset.name) {
          map[asset.ticker.toUpperCase()] = asset.name;
        }
      });
    }
    return map;
  });

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

  // KPI Calculations
  const summaryStats = createMemo(() => {
    const txs = rawTransactions();
    const isUSD = props.portfolio.nativeCurrency === 'USD';
    let totalBuy = 0;
    let totalSell = 0;
    let totalDiv = 0;

    txs.forEach(tx => {
      const nativeAmt = getTxAmountInNative(tx, isUSD);
      if (tx.type === "BUY") {
        totalBuy += nativeAmt;
      } else if (tx.type === "SELL") {
        totalSell += nativeAmt;
      } else if (tx.type === "DIVIDEND") {
        totalDiv += nativeAmt;
      }
    });

    const pnlMap = computeRealizedPnLMap();
    const totalPnL = Object.values(pnlMap).reduce((sum, item) => sum + item.realizedPnL, 0);

    return {
      totalTrades: txs.length,
      realizedPnL: totalPnL,
      buyVolume: totalBuy,
      sellVolume: totalSell,
      dividendIncome: totalDiv
    };
  });

  const isPositivePnL = createMemo(() => summaryStats().realizedPnL >= 0);

  // Cumulative PnL Timeline calculation for Area Chart
  const cumulativePnLData = createMemo(() => {
    const transactions = rawTransactions();
    const isUSDPortfolio = props.portfolio.nativeCurrency === 'USD';
    
    const typeOrder: Record<string, number> = { BUY: 0, DEPOSIT: 1, DIVIDEND: 2, SELL: 3, WITHDRAWAL: 4, PENDING: 5 };
    const sortedTxs = [...transactions].sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    });

    const runningStats: Record<string, {
      averagePrice: number;
      totalBuyQty: number;
      totalCost: number;
      currentShares: number;
    }> = {};

    let totalPnLAccumulator = 0;
    const timeline: { date: string; value: number }[] = [];

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

      const stats = runningStats[ticker];
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

      if (tx.type === "BUY") {
        stats.totalBuyQty += qty;
        stats.totalCost += qty * pricePerShare;
        stats.currentShares += qty;
        stats.averagePrice = stats.totalBuyQty > 0 ? stats.totalCost / stats.totalBuyQty : 0;
      } else if (tx.type === "SELL") {
        const costBasisOfSold = qty * stats.averagePrice;
        const revenue = qty * pricePerShare;
        totalPnLAccumulator += (revenue - costBasisOfSold);
        
        stats.currentShares = Math.max(0, stats.currentShares - qty);
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
        totalPnLAccumulator += (qty * pricePerShare);
      }

      if (tx.type === "SELL" || tx.type === "DIVIDEND") {
        const dateObj = new Date(tx.transaction_date);
        const dateStr = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        timeline.push({ date: dateStr, value: totalPnLAccumulator });
      }
    });

    const aggregated: Record<string, number> = {};
    timeline.forEach(point => {
      aggregated[point.date] = point.value;
    });

    return Object.entries(aggregated).map(([date, value]) => ({ date, value }));
  });

  // Monthly Activity Stacked Bar calculations
  const monthlyActivityData = createMemo(() => {
    const transactions = rawTransactions();
    const monthsOrder: string[] = [];
    const grouped: Record<string, { BUY: number; SELL: number; DIVIDEND: number }> = {};

    const sortedTxs = [...transactions].sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    sortedTxs.forEach(tx => {
      if (tx.type !== "BUY" && tx.type !== "SELL" && tx.type !== "DIVIDEND") return;
      const date = new Date(tx.transaction_date);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!grouped[monthStr]) {
        grouped[monthStr] = { BUY: 0, SELL: 0, DIVIDEND: 0 };
        monthsOrder.push(monthStr);
      }
      grouped[monthStr][tx.type]++;
    });

    return {
      categories: monthsOrder,
      series: [
        { name: "BUY", data: monthsOrder.map(m => grouped[m].BUY) },
        { name: "SELL", data: monthsOrder.map(m => grouped[m].SELL) },
        { name: "DIVIDEND", data: monthsOrder.map(m => grouped[m].DIVIDEND) }
      ]
    };
  });

  // Donut Volume Breakdown
  const volumeBreakdown = createMemo(() => {
    const transactions = rawTransactions();
    let buyVol = 0;
    let sellVol = 0;
    let divVol = 0;

    transactions.forEach(tx => {
      const isUSDPortfolio = props.portfolio.nativeCurrency === 'USD';
      const nativeAmt = getTxAmountInNative(tx, isUSDPortfolio);

      if (tx.type === "BUY") {
        buyVol += nativeAmt;
      } else if (tx.type === "SELL") {
        sellVol += nativeAmt;
      } else if (tx.type === "DIVIDEND") {
        divVol += nativeAmt;
      }
    });

    const displayBuy = getDisplayAmount(buyVol, props.portfolio.nativeCurrency);
    const displaySell = getDisplayAmount(sellVol, props.portfolio.nativeCurrency);
    const displayDiv = getDisplayAmount(divVol, props.portfolio.nativeCurrency);

    return {
      series: [displayBuy, displaySell, displayDiv],
      labels: ["Buy Volume", "Sell Volume", "Dividend Income"]
    };
  });

  // Top/Worst leaderboard
  const leadersBoard = createMemo(() => {
    const pnlMap = computeRealizedPnLMap();
    const list = Object.values(pnlMap);
    
    const gainers = list.filter(item => item.realizedPnL > 0).sort((a, b) => b.realizedPnL - a.realizedPnL).slice(0, 3);
    const losers = list.filter(item => item.realizedPnL < 0).sort((a, b) => a.realizedPnL - b.realizedPnL).slice(0, 3);

    return { gainers, losers };
  });

  // Ticker bar chart data
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

  const areaSeries = createMemo(() => [
    {
      name: "Cumulative Realized P&L",
      data: cumulativePnLData().map(d => getDisplayAmount(d.value, props.portfolio.nativeCurrency))
    }
  ]);

  const barSeries = createMemo(() => [
    {
      name: "Total Realized Gain / Loss",
      data: chartSeriesData(),
    },
  ]);

  const formatAreaChartValue = (val: number) => {
    const displayCurrency = currency();
    const isUSDPortfolio = props.portfolio.nativeCurrency === 'USD';
    let displayAmount = val;

    if (isUSDPortfolio && displayCurrency === 'IDR') {
      displayAmount = val * getUsdRate();
    } else if (!isUSDPortfolio && displayCurrency === 'USD') {
      displayAmount = val / getUsdRate();
    }

    if (displayCurrency === 'USD') {
      return formatUSD(displayAmount, 2);
    } else {
      const absAmount = Math.abs(displayAmount);
      const formatted = new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(absAmount);
      return (displayAmount < 0 ? "-" : "") + "Rp" + formatted;
    }
  };

  // Chart options configurations
  const areaOptions = createMemo((): ApexOptions => {
    const data = cumulativePnLData();
    const isPositive = data.length > 0 ? data[data.length - 1].value >= 0 : true;
    const mainColor = isPositive ? "#52C278" : "#f43f5e";

    return {
      chart: {
        type: "area",
        toolbar: { show: false },
        fontFamily: "Outfit",
        animations: { enabled: true, speed: 500 }
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => formatAreaChartValue(Number(val)),
        style: {
          fontFamily: "Outfit",
          fontWeight: 700,
          fontSize: "10px",
        }
      },
      colors: [mainColor],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.02,
          stops: [0, 95]
        }
      },
      stroke: { curve: "smooth", width: 2.5 },
      xaxis: {
        categories: data.map(d => d.date),
        labels: {
          style: { colors: "#5C6B5E", fontFamily: "Outfit", fontSize: "10px" }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: "#5C6B5E", fontFamily: "Outfit", fontSize: "10px" },
          formatter: (val) => formatAreaChartValue(val)
        }
      },
      grid: { borderColor: "rgba(26, 77, 46, 0.06)", strokeDashArray: 4 },
      tooltip: {
        theme: "dark",
        x: { show: true },
        y: {
          formatter: (val) => formatAreaChartValue(val)
        }
      }
    };
  });

  const stackedBarOptions = createMemo((): ApexOptions => ({
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      fontFamily: "Outfit",
      animations: { enabled: true }
    },
    colors: ["#52C278", "#f43f5e", "#6366f1"],
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "45%" }
    },
    xaxis: {
      categories: monthlyActivityData().categories,
      labels: {
        style: { colors: "#5C6B5E", fontFamily: "Outfit", fontSize: "10px" }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "#5C6B5E", fontFamily: "Outfit", fontSize: "10px" }
      }
    },
    grid: { borderColor: "rgba(26, 77, 46, 0.06)", strokeDashArray: 4 },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontFamily: "Outfit",
      fontSize: "11px"
    },
    tooltip: { theme: "dark" }
  }));

  const donutOptions = createMemo((): ApexOptions => ({
    chart: { type: "donut", fontFamily: "Outfit" },
    colors: ["#52C278", "#f43f5e", "#6366f1"],
    labels: ["Buy Volume", "Sell Volume", "Dividend Income"],
    stroke: { show: false },
    legend: {
      position: "bottom",
      fontFamily: "Outfit",
      fontSize: "10px"
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: { show: true, fontSize: "11px", fontFamily: "Outfit", color: "#5C6B5E" },
            value: {
              show: true,
              fontSize: "15px",
              fontFamily: "Outfit",
              fontWeight: "bold",
              color: "#1a4d2e",
              formatter: (val) => formatPortfolioValue(Number(val), currency(), true, props.portfolio.nativeCurrency)
            },
            total: {
              show: true,
              label: "Flow Vol",
              fontFamily: "Outfit",
              color: "#5C6B5E",
              formatter: (w) => {
                const sum = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return formatPortfolioValue(sum, currency(), true, props.portfolio.nativeCurrency);
              }
            }
          }
        }
      }
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (val) => formatPortfolioValue(val, currency(), false, props.portfolio.nativeCurrency)
      }
    }
  }));

  const barOptions = createMemo(
    (): ApexOptions => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "Outfit",
        animations: { enabled: true, speed: 500 },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "60%",
          distributed: true,
          borderRadius: 4,
          dataLabels: { position: "top" },
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
            fontSize: "11px",
            fontWeight: 700,
          },
        },
      },
      grid: {
        show: true,
        borderColor: "rgba(26, 77, 46, 0.06)",
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

  const chartHeight = createMemo(() => {
    const len = chartCategories().length;
    if (len === 0) return 200;
    return Math.max(200, len * 40 + 50);
  });

  // Filtered, sorted, and paginated transactions
  const processedTransactions = createMemo(() => {
    let list = [...rawTransactions()];

    const query = searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter((tx) =>
        tx.asset_ticker.toLowerCase().includes(query)
      );
    }

    const type = typeFilter();
    if (type !== "ALL") {
      list = list.filter((tx) => tx.type === type);
    }

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

  // Adjust page to 1 when filters reduce available rows
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

  const totalPages = createMemo(() => {
    return Math.ceil(processedTransactions().length / pageSize) || 1;
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

  const formatTxCurrency = (amount: number, txCurrency: string) => {
    if (txCurrency === "USD") return formatUSD(amount);
    if (txCurrency === "IDR") return formatRupiah(amount);
    return `${amount.toLocaleString()} ${txCurrency}`;
  };

  return (
    <div class="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-2 animate-fade-in-up stagger-1">
        <div class="flex items-center gap-4">
          <button
            onClick={() => navigate(`/portfolio/${props.portfolio.id}`)}
            class="w-10 h-10 rounded-xl hover:bg-forest/5 flex items-center justify-center text-forest transition-all duration-200 border border-forest/10 cursor-pointer active:scale-95"
          >
            <ChevronLeftIcon />
          </button>
          <div>
            <h1 class="text-3xl md:text-4xl font-cormorant text-forest font-bold tracking-tight mb-1">
              {props.portfolio.name}
            </h1>
            <p class="text-earth font-outfit tracking-wide uppercase text-[10px] font-bold">
              Trade History & Performance Analysis
            </p>
          </div>
        </div>

        {/* Live Exchange Rate info */}
        <div class="flex items-center gap-2 bg-sage/20 border border-forest/5 rounded-2xl px-4 py-2 text-xs font-outfit text-forest/70 self-start md:self-auto">
          <span class="material-icons text-sm">currency_exchange</span>
          <span>Live USD rate: <b>{formatRupiah(getUsdRate())}</b></span>
        </div>
      </div>

      {/* KPI Strip Section */}
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in-up stagger-2">
        <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-forest">
          <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">Total Trades</span>
          <span class="text-2xl font-bold text-forest mt-auto flex items-center gap-2">
            {isLoadingTxs() ? "..." : summaryStats().totalTrades}
            <span class="material-icons text-forest/20 text-lg">history</span>
          </span>
        </div>

        <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-spring">
          <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">Realized Return</span>
          <span class={`text-2xl font-bold mt-auto flex items-center gap-1.5 ${isPositivePnL() ? "text-spring" : "text-[#f43f5e]"}`}>
            {formatPortfolioValue(
              summaryStats().realizedPnL,
              currency(),
              false,
              props.portfolio.nativeCurrency
            )}
            <span class="material-icons text-xs">
              {isPositivePnL() ? "trending_up" : "trending_down"}
            </span>
          </span>
        </div>

        <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-[#52C278]">
          <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">Capital Invested</span>
          <span class="text-2xl font-bold text-forest mt-auto flex items-center gap-1.5">
            {formatPortfolioValue(
              summaryStats().buyVolume,
              currency(),
              true,
              props.portfolio.nativeCurrency
            )}
            <span class="material-icons text-[#52C278]/30 text-lg">shopping_cart</span>
          </span>
        </div>

        <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-[#f43f5e]">
          <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">Capital Released</span>
          <span class="text-2xl font-bold text-forest mt-auto flex items-center gap-1.5">
            {formatPortfolioValue(
              summaryStats().sellVolume,
              currency(),
              true,
              props.portfolio.nativeCurrency
            )}
            <span class="material-icons text-[#f43f5e]/30 text-lg">sell</span>
          </span>
        </div>

        <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-[#6366f1] col-span-2 md:col-span-1">
          <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">Dividends Earned</span>
          <span class="text-2xl font-bold text-forest mt-auto flex items-center gap-1.5">
            {formatPortfolioValue(
              summaryStats().dividendIncome,
              currency(),
              true,
              props.portfolio.nativeCurrency
            )}
            <span class="material-icons text-[#6366f1]/30 text-lg">payments</span>
          </span>
        </div>
      </div>

      {/* Bento Chart Analytics Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up stagger-3">
        {/* Chart A: Cumulative Realized PnL */}
        <div class="premium-card p-5 flex flex-col">
          <div class="border-b border-forest/5 pb-3 mb-3">
            <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
              <span class="material-icons text-sm text-forest/60">show_chart</span>
              Cumulative Performance
            </h4>
            <p class="text-earth/60 font-outfit text-[11px] mt-0.5">
              Running track of realized gains/losses across all historical selling and dividend events.
            </p>
          </div>
          <Show
            when={!isLoadingTxs() && cumulativePnLData().length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-16">
                <span class="material-icons text-3xl text-forest/10 mb-2">trending_up</span>
                {isLoadingTxs() ? "Processing timeline..." : "No cumulative data points available."}
              </div>
            }
          >
            <div class="w-full h-[220px]">
              <SolidApexCharts
                options={areaOptions()}
                series={areaSeries()}
                type="area"
                height={220}
              />
            </div>
          </Show>
        </div>

        {/* Chart B: Monthly Trade Activity */}
        <div class="premium-card p-5 flex flex-col">
          <div class="border-b border-forest/5 pb-3 mb-3">
            <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
              <span class="material-icons text-sm text-forest/60">calendar_month</span>
              Monthly Activity Patterns
            </h4>
            <p class="text-earth/60 font-outfit text-[11px] mt-0.5">
              Breakdown of trade frequencies (BUY, SELL, DIVIDEND) grouped by month.
            </p>
          </div>
          <Show
            when={!isLoadingTxs() && monthlyActivityData().categories.length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-16">
                <span class="material-icons text-3xl text-forest/10 mb-2">bar_chart</span>
                {isLoadingTxs() ? "Grouping months..." : "No monthly data points available."}
              </div>
            }
          >
            <div class="w-full h-[220px]">
              <SolidApexCharts
                options={stackedBarOptions()}
                series={monthlyActivityData().series}
                type="bar"
                height={220}
              />
            </div>
          </Show>
        </div>

        {/* Chart C: Volume Breakdown Donut */}
        <div class="premium-card p-5 flex flex-col">
          <div class="border-b border-forest/5 pb-3 mb-3">
            <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
              <span class="material-icons text-sm text-forest/60">pie_chart</span>
              Flow Volume Breakdown
            </h4>
            <p class="text-earth/60 font-outfit text-[11px] mt-0.5">
              Capital distributions allocated toward asset buys vs returns from sales and dividends.
            </p>
          </div>
          <Show
            when={!isLoadingTxs() && volumeBreakdown().series.reduce((a, b) => a + b, 0) > 0}
            fallback={
              <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-16">
                <span class="material-icons text-3xl text-forest/10 mb-2">donut_large</span>
                {isLoadingTxs() ? "Sizing breakdown..." : "No volume flow record."}
              </div>
            }
          >
            <div class="w-full h-[220px] flex items-center justify-center">
              <SolidApexCharts
                options={donutOptions()}
                series={volumeBreakdown().series}
                type="donut"
                height={210}
              />
            </div>
          </Show>
        </div>

        {/* Chart D: Ticker PnL Bar Chart */}
        <div class="premium-card p-5 flex flex-col">
          <div class="border-b border-forest/5 pb-3 mb-3">
            <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
              <span class="material-icons text-sm text-forest/60">equalizer</span>
              Realized PnL per Traded Ticker
            </h4>
            <p class="text-earth/60 font-outfit text-[11px] mt-0.5">
              Net gains and losses realized on each individual asset ticker.
            </p>
          </div>
          <Show
            when={!isLoadingTxs() && chartData().length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-16">
                <span class="material-icons text-3xl text-forest/10 mb-2">view_week</span>
                {isLoadingTxs() ? "Loading PnL chart..." : "No ticker trades available."}
              </div>
            }
          >
            <div class="w-full overflow-y-auto max-h-[220px]">
              <div class="w-full" style={{ "min-height": `${chartHeight()}px` }}>
                <SolidApexCharts
                  options={barOptions()}
                  series={barSeries()}
                  type="bar"
                  height={chartHeight()}
                />
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Top & Worst Performers Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up stagger-4">
        {/* Top Gainers */}
        <div class="premium-card p-5 border-l-4 border-l-spring flex flex-col">
          <div class="border-b border-forest/5 pb-3 mb-4">
            <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
              <span class="material-icons text-spring text-base">emoji_events</span>
              Top Performers
            </h4>
            <p class="text-earth/50 text-[10px] font-outfit uppercase tracking-wider font-bold">Highest Realized Gains</p>
          </div>
          <div class="flex flex-col gap-3">
            <For
              each={leadersBoard().gainers}
              fallback={
                <span class="text-earth/40 text-xs italic py-2">No realized gains recorded yet.</span>
              }
            >
              {(item) => {
                const assetColor = getAssetColor(item.ticker);
                return (
                  <div class="flex items-center justify-between p-3 rounded-xl bg-sage/10 border border-forest/5 hover:border-forest/10 transition-all">
                    <div class="flex items-center gap-2.5">
                      <Show
                        when={tickerLogos()[item.ticker.toUpperCase()]}
                        fallback={
                          <div
                            class="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm shrink-0"
                            style={{ "background-color": assetColor }}
                          >
                            {item.ticker.charAt(0)}
                          </div>
                        }
                      >
                        {(logoUrl) => {
                          const [hasError, setHasError] = createSignal(false);
                          return (
                            <div
                              class="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm overflow-hidden shrink-0"
                              style={{
                                "background-color": hasError()
                                  ? assetColor
                                  : "#ffffff",
                              }}
                            >
                              <Show
                                when={!hasError()}
                                fallback={
                                  <span>{item.ticker.charAt(0)}</span>
                                }
                              >
                                <img
                                  src={logoUrl()}
                                  alt={item.ticker}
                                  class="w-full h-full object-contain p-0.5 bg-white"
                                  onError={() => setHasError(true)}
                                />
                              </Show>
                            </div>
                          );
                        }}
                      </Show>
                      <div class="flex flex-col min-w-0">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/stock/${item.ticker}`);
                          }}
                          class="font-outfit font-bold text-forest text-sm leading-tight hover:text-spring transition-colors hover:underline cursor-pointer"
                        >
                          {item.ticker}
                        </span>
                        <span class="text-[10px] text-earth/60 truncate max-w-[120px]">
                          {tickerNames()[item.ticker.toUpperCase()] || "Unknown Asset"}
                        </span>
                      </div>
                    </div>
                    <span class="font-outfit font-black text-sm text-spring">
                      +{formatPortfolioValue(item.realizedPnL, currency(), false, props.portfolio.nativeCurrency)}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        {/* Top Losers */}
        <div class="premium-card p-5 border-l-4 border-l-[#f43f5e] flex flex-col">
          <div class="border-b border-forest/5 pb-3 mb-4">
            <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
              <span class="material-icons text-[#f43f5e] text-base">trending_down</span>
              Worst Performers
            </h4>
            <p class="text-earth/50 text-[10px] font-outfit uppercase tracking-wider font-bold">Highest Realized Losses</p>
          </div>
          <div class="flex flex-col gap-3">
            <For
              each={leadersBoard().losers}
              fallback={
                <span class="text-earth/40 text-xs italic py-2">No realized losses recorded yet.</span>
              }
            >
              {(item) => {
                const assetColor = getAssetColor(item.ticker);
                return (
                  <div class="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/5 hover:border-red-500/10 transition-all">
                    <div class="flex items-center gap-2.5">
                      <Show
                        when={tickerLogos()[item.ticker.toUpperCase()]}
                        fallback={
                          <div
                            class="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm shrink-0"
                            style={{ "background-color": assetColor }}
                          >
                            {item.ticker.charAt(0)}
                          </div>
                        }
                      >
                        {(logoUrl) => {
                          const [hasError, setHasError] = createSignal(false);
                          return (
                            <div
                              class="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm overflow-hidden shrink-0"
                              style={{
                                "background-color": hasError()
                                  ? assetColor
                                  : "#ffffff",
                              }}
                            >
                              <Show
                                when={!hasError()}
                                fallback={
                                  <span>{item.ticker.charAt(0)}</span>
                                }
                              >
                                <img
                                  src={logoUrl()}
                                  alt={item.ticker}
                                  class="w-full h-full object-contain p-0.5 bg-white"
                                  onError={() => setHasError(true)}
                                />
                              </Show>
                            </div>
                          );
                        }}
                      </Show>
                      <div class="flex flex-col min-w-0">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/stock/${item.ticker}`);
                          }}
                          class="font-outfit font-bold text-forest text-sm leading-tight hover:text-spring transition-colors hover:underline cursor-pointer"
                        >
                          {item.ticker}
                        </span>
                        <span class="text-[10px] text-earth/60 truncate max-w-[120px]">
                          {tickerNames()[item.ticker.toUpperCase()] || "Unknown Asset"}
                        </span>
                      </div>
                    </div>
                    <span class="font-outfit font-black text-sm text-[#f43f5e]">
                      {formatPortfolioValue(item.realizedPnL, currency(), false, props.portfolio.nativeCurrency)}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div class="premium-card overflow-hidden animate-fade-in-up stagger-5">
        {/* Table Filters & Toolbar */}
        <div class="px-6 py-5 border-b border-forest/5 flex flex-col lg:flex-row justify-between items-center gap-4 bg-white">
          <div class="flex flex-col gap-1 w-full lg:w-auto">
            <h4 class="font-outfit font-bold text-forest text-lg">Transaction History</h4>
            <p class="text-earth/50 text-xs font-outfit">
              Showing {processedTransactions().length > 0 ? (currentPage() - 1) * pageSize + 1 : 0} - {Math.min(currentPage() * pageSize, processedTransactions().length)} of {processedTransactions().length} records
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Search Input */}
            <div class="relative flex items-center bg-sage/10 border border-forest/10 rounded-xl px-3 py-1.5 focus-within:border-forest/30 transition-all duration-200 w-full md:w-56">
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
            <div class="flex bg-sage/15 p-1 rounded-xl border border-forest/5 shadow-inner">
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
        <div class="overflow-x-auto w-full relative" style={{ "max-height": "650px" }}>
          <table class="w-full min-w-[900px] border-collapse">
            <thead class="sticky-header bg-white/95 border-b border-forest/5 text-[10px] font-bold uppercase tracking-widest text-earth/65 select-none">
              <tr>
                <th class="w-1.5 py-4 px-2"></th>
                <th class="py-4 px-4 text-left font-bold">
                  <button onClick={() => handleSort("ticker")} class="flex items-center gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest">
                    Asset
                    <span class="material-icons text-[14px]">
                      {sortBy() === "ticker" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                    </span>
                  </button>
                </th>
                <th class="py-4 px-4 text-left font-bold">
                  <button onClick={() => handleSort("type")} class="flex items-center gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest">
                    Type
                    <span class="material-icons text-[14px]">
                      {sortBy() === "type" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                    </span>
                  </button>
                </th>
                <th class="py-4 px-4 text-left font-bold">
                  <button onClick={() => handleSort("date")} class="flex items-center gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest">
                    Date
                    <span class="material-icons text-[14px]">
                      {sortBy() === "date" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                    </span>
                  </button>
                </th>
                <th class="py-4 px-4 text-right font-bold">
                  <button onClick={() => handleSort("qty")} class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest ml-auto">
                    Shares
                    <span class="material-icons text-[14px]">
                      {sortBy() === "qty" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                    </span>
                  </button>
                </th>
                <th class="py-4 px-4 text-right font-bold">
                  <button onClick={() => handleSort("price")} class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest ml-auto">
                    Price/Share
                    <span class="material-icons text-[14px]">
                      {sortBy() === "price" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                    </span>
                  </button>
                </th>
                <th class="py-4 px-4 text-right font-bold">
                  <button onClick={() => handleSort("amount")} class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest ml-auto">
                    Total
                    <span class="material-icons text-[14px]">
                      {sortBy() === "amount" ? (sortOrder() === "asc" ? "expand_less" : "expand_more") : "unfold_more"}
                    </span>
                  </button>
                </th>
                <th class="w-16 py-4 px-2"></th>
              </tr>
            </thead>

            <tbody class="divide-y divide-forest/5 bg-white">
              <Show
                when={!isLoadingTxs()}
                fallback={
                  <For each={[1, 2, 3, 4, 5]}>
                    {() => (
                      <tr class="animate-pulse">
                        <td class="w-1.5 py-5 px-2"><div class="w-1 h-6 bg-sage/20 rounded-full" /></td>
                        <td class="py-5 px-4"><div class="h-4.5 bg-sage/20 rounded w-16" /></td>
                        <td class="py-5 px-4"><div class="h-4.5 bg-sage/20 rounded w-12" /></td>
                        <td class="py-5 px-4"><div class="h-4.5 bg-sage/20 rounded w-28" /></td>
                        <td class="py-5 px-4"><div class="h-4.5 bg-sage/20 rounded w-10 ml-auto" /></td>
                        <td class="py-5 px-4"><div class="h-4.5 bg-sage/20 rounded w-20 ml-auto" /></td>
                        <td class="py-5 px-4"><div class="h-4.5 bg-sage/20 rounded w-24 ml-auto" /></td>
                        <td class="w-16"></td>
                      </tr>
                    )}
                  </For>
                }
              >
                <For
                  each={paginatedTransactions()}
                  fallback={
                    <tr>
                      <td colspan="8" class="px-8 py-16 text-center text-earth/40 italic font-outfit bg-white">
                        {rawTransactions().length === 0
                          ? "No transactions recorded for this portfolio."
                          : "No transactions match your search filter."}
                      </td>
                    </tr>
                  }
                >
                  {(tx) => {
                    const assetColor = getAssetColor(tx.asset_ticker);
                    const isExpanded = () => expandedTxId() === tx.id;
                    const displayAmt = getTxAmountInNative(tx, props.portfolio.nativeCurrency === "USD");

                    return (
                      <>
                        {/* Transaction summary row */}
                        <tr
                          onClick={() => toggleRowExpand(tx.id)}
                          class="group hover:bg-earth/5 transition-all duration-150 cursor-pointer relative"
                        >
                          <td class="w-1.5 py-4 px-2 relative">
                            <div
                              class="absolute left-0 top-0 bottom-0 w-1 transition-transform duration-200 group-hover:scale-x-[1.5] origin-left"
                              style={{ "background-color": assetColor }}
                            />
                          </td>

                          {/* Ticker Column with Logo & Company Name */}
                          <td class="py-4 px-4">
                            <div class="flex items-center gap-4 min-w-0">
                              <Show
                                when={tickerLogos()[tx.asset_ticker.toUpperCase()]}
                                fallback={
                                  <div
                                    class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
                                    style={{ "background-color": assetColor }}
                                  >
                                    {tx.asset_ticker.charAt(0)}
                                  </div>
                                }
                              >
                                {(logoUrl) => {
                                  const [hasError, setHasError] = createSignal(false);
                                  return (
                                    <div
                                      class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden shrink-0"
                                      style={{
                                        "background-color": hasError()
                                          ? assetColor
                                          : "#ffffff",
                                      }}
                                    >
                                      <Show
                                        when={!hasError()}
                                        fallback={
                                          <span>{tx.asset_ticker.charAt(0)}</span>
                                        }
                                      >
                                        <img
                                          src={logoUrl()}
                                          alt={tx.asset_ticker}
                                          class="w-full h-full object-contain p-1 bg-white"
                                          onError={() => setHasError(true)}
                                        />
                                      </Show>
                                    </div>
                                  );
                                }}
                              </Show>
                              <div class="flex flex-col min-w-0">
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/stock/${tx.asset_ticker}`);
                                  }}
                                  class="font-outfit font-bold text-forest text-base leading-tight group-hover:text-spring transition-colors hover:underline cursor-pointer"
                                >
                                  {tx.asset_ticker}
                                </span>
                                <span class="text-xs text-earth/60 truncate max-w-[180px]">
                                  {tickerNames()[tx.asset_ticker.toUpperCase()] || "Unknown Asset"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Type Indicator */}
                          <td class="py-4 px-4">
                            <span
                              class={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                                tx.type === "BUY"
                                  ? "bg-spring/10 text-spring border-spring/20"
                                  : tx.type === "SELL"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              }`}
                            >
                              <span class="material-icons text-[10px]">
                                {tx.type === "BUY" ? "arrow_upward" : tx.type === "SELL" ? "arrow_downward" : "payments"}
                              </span>
                              {tx.type}
                            </span>
                          </td>

                          {/* Transaction Date */}
                          <td class="py-4 px-4 text-xs font-outfit text-earth/80">
                            {formatDateDetail(tx.transaction_date)}
                          </td>

                          {/* Shares count */}
                          <td class="py-4 px-4 text-right font-outfit font-semibold text-xs text-forest">
                            {Number(tx.qty).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          </td>

                          {/* Price per unit */}
                          <td class="py-4 px-4 text-right font-outfit font-semibold text-xs text-forest">
                            {formatTxCurrency(Number(tx.price_per_unit), tx.currency)}
                          </td>

                          {/* Computed Total Amount */}
                          <td class="py-4 px-4 text-right">
                            <div class="flex flex-col items-end">
                              <span class="font-outfit font-black text-xs text-forest">
                                {formatTxCurrency(Number(tx.qty) * Number(tx.price_per_unit), tx.currency)}
                              </span>
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
                          </td>

                          {/* Expand chevron */}
                          <td class="py-4 px-2 text-center text-earth/40 select-none">
                            <span
                              class={`material-icons transition-transform duration-200 text-lg ${
                                isExpanded() ? "rotate-180" : ""
                              }`}
                            >
                              expand_more
                            </span>
                          </td>
                        </tr>

                        {/* Collapsible Details Panel */}
                        <Show when={isExpanded()}>
                          <tr>
                            <td colspan="8" class="p-0 bg-[#F6F8F6] border-t border-b border-forest/5">
                              <div class="px-8 py-5 font-outfit flex flex-col gap-4 text-xs text-forest animate-slide-down">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div class="flex flex-col gap-1.5">
                                    <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider">Exchange Rate (price_currency)</span>
                                    <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                                      <span class="material-icons text-sm text-earth/40">currency_exchange</span>
                                      1 {tx.currency} = {Number(tx.price_currency).toLocaleString(undefined, { maximumFractionDigits: 4 })} {props.portfolio.nativeCurrency}
                                    </span>
                                  </div>

                                  <div class="flex flex-col gap-1.5">
                                    <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider">Created Timestamp</span>
                                    <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                                      <span class="material-icons text-sm text-earth/40">add_circle_outline</span>
                                      {formatDateDetail(tx.created_at)}
                                    </span>
                                  </div>

                                  <div class="flex flex-col gap-1.5">
                                    <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider">Last Updated Timestamp</span>
                                    <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                                      <span class="material-icons text-sm text-earth/40">edit</span>
                                      {formatDateDetail(tx.updated_at)}
                                    </span>
                                  </div>
                                </div>

                                <div class="flex flex-col gap-1.5">
                                  <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider">Transaction Notes</span>
                                  <div class="bg-white border border-forest/10 rounded-xl p-4 text-forest/80 shadow-sm min-h-[60px] flex gap-2.5 items-start">
                                    <span class="material-icons text-base text-earth/35 mt-0.5">description</span>
                                    <p class={`leading-relaxed ${!tx.notes ? "italic text-earth/40" : ""}`}>
                                      {tx.notes || "No notes recorded for this transaction."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </Show>
                      </>
                    );
                  }}
                </For>
              </Show>
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Show when={totalPages() > 1}>
          <div class="px-6 py-4 border-t border-forest/5 flex items-center justify-between bg-white/70 font-outfit text-xs text-earth">
            <div>
              Page <b>{currentPage()}</b> of <b>{totalPages()}</b>
            </div>
            <div class="flex items-center gap-2">
              <button
                disabled={currentPage() === 1}
                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                class="px-3 py-1.5 rounded-lg border border-forest/10 text-forest font-bold hover:bg-forest/5 transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none active:scale-95"
              >
                Previous
              </button>
              <button
                disabled={currentPage() === totalPages()}
                onClick={() => setCurrentPage(c => Math.min(totalPages(), c + 1))}
                class="px-3 py-1.5 rounded-lg border border-forest/10 text-forest font-bold hover:bg-forest/5 transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none active:scale-95"
              >
                Next
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
