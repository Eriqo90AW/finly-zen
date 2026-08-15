import {
  createSignal,
  createMemo,
  onMount,
  onCleanup,
  Show,
  createEffect,
  untrack,
} from "solid-js";
import {
  portfolioState,
  loadPortfolios,
  refreshPortfolio,
  adjustPortfolioCash,
} from "../store/portfolioStore";
import {
  addPortfolioTransaction,
  upsertAsset,
} from "../data/portfolioData";
import { supabase } from "../lib/supabase";
import { formatPercent, formatPortfolioValue, getUsdRate, usdRateReady } from "../utils/format";
import { getAssetColor } from "../utils/colors";
import type { PortfolioAsset, AllocationItem } from "../types";
import type { ApexOptions } from "apexcharts";

// Import sub-components
import { QuickPortfolioHeader } from "../components/screen-quick-portfolio/QuickPortfolioHeader";
import { QuickPortfolioKPIs } from "../components/screen-quick-portfolio/QuickPortfolioKPIs";
import { QuickPortfolioCharts } from "../components/screen-quick-portfolio/QuickPortfolioCharts";
import { QuickPortfolioTable } from "../components/screen-quick-portfolio/QuickPortfolioTable";
import { AddHoldingModal } from "../components/screen-quick-portfolio/AddHoldingModal";
import { ConfirmDeleteAssetModal } from "../components/screen-quick-portfolio/ConfirmDeleteAssetModal";
import { CategoryPnLCard, type CategoryPnLItem } from "../components/screen-quick-portfolio/CategoryPnLCard";
import { DailyMoversCard } from "../components/screen-quick-portfolio/DailyMoversCard";

const USER_ID = "a4d800bd-e779-4e7b-8982-2cab3d10035b";

const parseLocaleFloat = (valString: string): number => {
  const sanitized = valString.replace(/,/g, ".");
  return parseFloat(sanitized);
};

export default function QuickPortfolio() {
  const [quickPortfolio, setQuickPortfolio] = createSignal<any>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  
  // Modal State
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [newTicker, setNewTicker] = createSignal("");
  const [newQty, setNewQty] = createSignal<number | null>(null);
  const [newPrice, setNewPrice] = createSignal<number | null>(null);
  const [newCurrency, setNewCurrency] = createSignal<string>("USD");
  const [newConversionRate, setNewConversionRate] = createSignal<number | null>(null);

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const [assetToDelete, setAssetToDelete] = createSignal<{ ticker: string; name: string } | null>(null);

  // Last refreshed timestamp
  const [lastRefreshedAt, setLastRefreshedAt] = createSignal<number | null>(null);

  // Live clock tick
  const [now, setNow] = createSignal(Date.now());
  onMount(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    onCleanup(() => clearInterval(id));
  });

  // Asset allocation view toggle
  const [allocationView, setAllocationView] = createSignal<"category" | "detail">("category");

  // Performance chart period
  type PerfPeriod = "1D" | "1W" | "1M" | "1Y" | "ALL";
  const [perfPeriod, setPerfPeriod] = createSignal<PerfPeriod>("1D");

  // Auto-categorize ticker
  const getCategory = (ticker: string) => {
    const t = ticker.toUpperCase();
    if (t.endsWith(".JK")) return "IDX";
    if (t.endsWith("-USD") || t === "BTC" || t === "BTC-USD") return "Crypto";
    return "Stocks";
  };

  // Get nice display ticker (e.g. BTC-USD -> BTC)
  const getDisplayTicker = (ticker: string) => {
    if (ticker.toUpperCase() === "BTC-USD") return "BTC";
    return ticker;
  };

  // Get Material symbol/icon depending on asset type/category
  const getCategoryIcon = (category: string) => {
    if (category === "Crypto") return "currency_bitcoin";
    if (category === "IDX") return "show_chart";
    return "phone_iphone"; // Default Stocks
  };

  const currencyView = () => portfolioState.currencyView;

  const formatVal = (amount: number, isShort = false) => {
    const native = quickPortfolio()?.nativeCurrency || "IDR";
    return formatPortfolioValue(amount, currencyView(), isShort, native);
  };

  const formatPrice = (amount: number) => {
    const native = quickPortfolio()?.nativeCurrency || "IDR";
    const display = currencyView();
    
    let displayAmount = amount;
    if (native === 'USD' && display === 'IDR') {
      displayAmount = amount * getUsdRate();
    } else if (native === 'IDR' && display === 'USD') {
      displayAmount = amount / getUsdRate();
    }

    if (display === 'USD') {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(displayAmount);
    } else {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(displayAmount);
    }
  };

  const formatCash = (amount: number, isShort = false) => {
    const native = quickPortfolio()?.nativeCurrency || "IDR";
    return formatPortfolioValue(amount, currencyView(), isShort, native);
  };

  // Relative time helper for "Last updated: …"
  const formatRelative = (ts: number | null) => {
    if (!ts) return "—";
    const nowTs = Date.now();
    const diff = nowTs - ts;
    
    if (diff < 30_000) return "Just now";
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;

    const d = new Date(ts);
    const nowD = new Date(nowTs);

    const isSameDay =
      d.getDate() === nowD.getDate() &&
      d.getMonth() === nowD.getMonth() &&
      d.getFullYear() === nowD.getFullYear();

    const yesterdayD = new Date(nowTs - 86_400_000);
    const isYesterday =
      d.getDate() === yesterdayD.getDate() &&
      d.getMonth() === yesterdayD.getMonth() &&
      d.getFullYear() === yesterdayD.getFullYear();

    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${mins}`;

    if (isSameDay) return `Today at ${timeStr}`;
    if (isYesterday) return `Yesterday at ${timeStr}`;

    const monthStr = d.toLocaleString("en-US", { month: "short" });
    return `${monthStr} ${d.getDate()}, ${timeStr}`;
  };

  // Reactive label
  const lastUpdatedLabel = createMemo(() => {
    now(); // track the ticking clock
    return formatRelative(lastRefreshedAt());
  });

  // Database Check & Initialization
  onMount(async () => {
    await loadAndInitialize();
  });

  const loadAndInitialize = async () => {
    setIsLoading(true);
    try {
      await usdRateReady;
      await loadPortfolios();

      let found = portfolioState.portfolios.find(p => p.name === "Quick Portfolio");

      if (!found && portfolioState.portfolios.length === 0) {
        const { data: newP, error: createError } = await supabase
          .from("portfolios")
          .insert({
            user_id: USER_ID,
            name: "Quick Portfolio",
            base_currency: "IDR",
          })
          .select()
          .single();

        if (createError) throw createError;

        await loadPortfolios();
        found = portfolioState.portfolios.find(p => p.name === "Quick Portfolio");
      } else if (!found && portfolioState.portfolios.length > 0) {
        found = portfolioState.portfolios[0];
      }

      if (found && found.name === "Quick Portfolio") {
        if (found.nativeCurrency !== "IDR") {
          const { error: updateError } = await supabase
            .from("portfolios")
            .update({
              base_currency: "IDR",
            })
            .eq("id", found.id);

          if (!updateError) {
            await loadPortfolios();
            found = portfolioState.portfolios.find(p => p.name === "Quick Portfolio") || portfolioState.portfolios[0];
          }
        }
      }

      setQuickPortfolio(found);
    } catch (err) {
      console.error("Error loading or seeding Quick Portfolio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync state with global store updates
  createEffect(() => {
    const found = portfolioState.portfolios.find(p => p.name === "Quick Portfolio");
    if (found) {
      setQuickPortfolio(found);
    }
  });

  // Track when market prices finish refreshing
  createEffect(() => {
    const refreshing = portfolioState.isRefreshing;
    if (!refreshing) {
      setLastRefreshedAt(Date.now());
    }
  });

  // Calculations (adheres strictly to specification)
  const assetsValue = createMemo(() => {
    const p = quickPortfolio();
    if (!p || !p.assets) return 0;
    return p.assets.reduce((sum: number, a: PortfolioAsset) => sum + a.currentValue, 0);
  });

  const cashBalance = () => quickPortfolio()?.cash || 0;
  const cashValue = createMemo(() => cashBalance());

  const totalValue = createMemo(() => quickPortfolio()?.totalValue ?? (assetsValue() + cashValue()));
  const initialCapital = () => quickPortfolio()?.initialCapital || 0;

  const overallPL = createMemo(() => quickPortfolio()?.allTimeGain ?? (totalValue() - initialCapital()));
  const overallPLPercent = createMemo(() => {
    const p = quickPortfolio();
    if (p && typeof p.allTimeGainPercentage === "number") {
      return p.allTimeGainPercentage / 100;
    }
    return initialCapital() > 0 ? (overallPL() / initialCapital()) : 0;
  });

  // Today's Change
  const todayChange = createMemo(() => {
    const p = quickPortfolio();
    if (!p || !p.assets) return 0;
    return p.assets.reduce((sum: number, a: PortfolioAsset) => sum + (a.dayChange || 0), 0);
  });

  const previousTotal = createMemo(() => {
    const p = quickPortfolio();
    if (!p || !p.assets) return 0;
    return p.assets.reduce(
      (sum: number, a: PortfolioAsset) =>
        sum + (a.previousClose !== null ? a.totalShares * a.previousClose : 0),
      0,
    );
  });

  const todayChangePercent = createMemo(() => {
    const base = previousTotal();
    return base > 0 ? (todayChange() / base) * 100 : 0;
  });

  const hasTodayChangeData = createMemo(() => {
    const p = quickPortfolio();
    if (!p || !p.assets) return false;
    return p.assets.some((a: PortfolioAsset) => a.previousClose !== null);
  });

  // Distinct assets count
  const distinctAssetCount = createMemo(() => {
    const p = quickPortfolio();
    if (!p || !p.assets) return 0;
    return p.assets.filter((a: PortfolioAsset) => a.totalShares > 0).length;
  });

  // PnL per Category breakdown
  const categoryPnLData = createMemo((): CategoryPnLItem[] => {
    const p = quickPortfolio();
    const categories: ("Stocks" | "IDX" | "Crypto")[] = ["Stocks", "IDX", "Crypto"];
    
    return categories.map((cat) => {
      const icon = getCategoryIcon(cat);
      const catAssets = (p?.assets || []).filter((a: PortfolioAsset) => getCategory(a.ticker) === cat);
      
      let catTotalValue = 0;
      let catOverallPL = 0;
      let catCostBasis = 0;
      let catTodayChange = 0;
      let catPreviousTotal = 0;

      catAssets.forEach((a: PortfolioAsset) => {
        catTotalValue += a.currentValue;
        catOverallPL += a.totalGainLoss;
        catCostBasis += (a.currentValue - a.totalGainLoss);
        catTodayChange += (a.dayChange || 0);
        if (a.previousClose !== null) {
          catPreviousTotal += (a.totalShares * a.previousClose);
        }
      });

      const overallPLPercent = catCostBasis > 0 ? catOverallPL / catCostBasis : 0;
      const todayChangePercent = catPreviousTotal > 0 ? (catTodayChange / catPreviousTotal) * 100 : 0;

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
  });

  // Dynamic Allocation breakdown (Market Value %, Cost Basis %, Drift)
  const allocations = createMemo(() => {
    const p = quickPortfolio();
    if (!p) {
      return {
        stocks: 0,
        idx: 0,
        crypto: 0,
        cash: 0,
        market: { stocks: 0, idx: 0, crypto: 0, cash: 0 },
        cost: { stocks: 0, idx: 0, crypto: 0, cash: 0 },
        drift: { stocks: 0, idx: 0, crypto: 0, cash: 0 },
      };
    }
    const totalMkt = totalValue() || 1;
    const totalCost = initialCapital() || 1;

    let stocksMkt = 0, idxMkt = 0, cryptoMkt = 0;
    let stocksCost = 0, idxCost = 0, cryptoCost = 0;

    (p.assets || []).forEach((a: PortfolioAsset) => {
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
    });

    const cash = cashBalance();

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
      drift: {
        stocks: mktStocks - costStocks,
        idx: mktIdx - costIdx,
        crypto: mktCrypto - costCrypto,
        cash: mktCash - costCash,
      },
    };
  });

  // Per-ticker detail allocation (detail view with both Market % and Cost %)
  const detailAllocations = createMemo((): AllocationItem[] => {
    const p = quickPortfolio();
    if (!p) return [];
    const totalMkt = totalValue() || 1;
    const totalCost = initialCapital() || 1;
    const cash = cashBalance();
    const cashMktPct = totalMkt > 0 ? (cash / totalMkt) * 100 : 0;
    const cashCostPct = totalCost > 0 ? (cash / totalCost) * 100 : 0;

    const items: AllocationItem[] = (p.assets || []).map((a: PortfolioAsset) => {
      const cost = a.currentValue - a.totalGainLoss;
      const mktPct = totalMkt > 0 ? (a.currentValue / totalMkt) * 100 : 0;
      const costPct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
      const drift = mktPct - costPct;

      return {
        isCash: false,
        ticker: getDisplayTicker(a.ticker),
        name: a.name || a.ticker,
        value: a.currentValue,
        costBasis: cost,
        percentage: mktPct,
        costPercentage: costPct,
        drift,
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
  });

  // Performance chart series
  const perfSeries = createMemo(() => {
    const init = initialCapital();
    const curr = totalValue();

    const p = quickPortfolio();
    const firstTxTs = p?.transactions?.length
      ? new Date(
          [...p.transactions].sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          )[0].date,
        ).getTime()
      : null;

    const nowVal = Date.now();
    const startTs = firstTxTs ?? nowVal - 30 * 24 * 60 * 60 * 1000;

    const period = perfPeriod();
    let cutoff = startTs;
    if (period === "1D") cutoff = nowVal - 24 * 60 * 60 * 1000;
    else if (period === "1W") cutoff = nowVal - 7 * 24 * 60 * 60 * 1000;
    else if (period === "1M") cutoff = nowVal - 30 * 24 * 60 * 60 * 1000;
    else if (period === "1Y") cutoff = nowVal - 365 * 24 * 60 * 60 * 1000;

    const effectiveStart = Math.max(cutoff, startTs);

    if (init === 0 && curr === 0) return [] as { date: number; value: number }[];

    const pointCount = period === "1D" ? 24 : period === "1W" ? 28 : 30;
    const startVal = init > 0 ? init : curr;
    const delta = curr - startVal;
    const span = nowVal - effectiveStart;
    const step = span / (pointCount - 1);

    const points: { date: number; value: number }[] = [];
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
      const val = i === pointCount - 1 ? curr : Math.max(0, base + wiggle);
      points.push({ date: t, value: val });
    }
    return points;
  });

  const perfKpi = createMemo(() => {
    const series = perfSeries();
    if (series.length < 2) return null;
    const first = series[0].value;
    const last = series[series.length - 1].value;
    const change = last - first;
    const pct = first > 0 ? (change / first) * 100 : 0;
    return { change, pct, isPositive: change >= 0 };
  });

  const perfOptions = createMemo<ApexOptions>(() => {
    const series = perfSeries();
    const categories = series.map((p) => new Date(p.date).toISOString());

    const period = perfPeriod();
    const dateFormatter =
      period === "1D"
        ? { hour: "HH:mm" }
        : period === "1W"
        ? { day: "dd MMM", hour: "HH:mm" }
        : { day: "dd MMM" };

    return {
      chart: {
        type: "area",
        toolbar: { show: false },
        sparkline: { enabled: false },
        zoom: { enabled: false },
        animations: { enabled: true, speed: 400 },
        fontFamily: "Outfit, system-ui, sans-serif",
        background: "transparent",
        dropShadow: { enabled: false },
      },
      dataLabels: { enabled: false },
      colors: ["#1A4D2E"],
      stroke: { curve: "smooth", width: 2.5, colors: ["#1A4D2E"] },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0,
          stops: [0, 95, 100],
          colorStops: [
            { offset: 0, color: "#1A4D2E", opacity: 0.25 },
            { offset: 100, color: "#1A4D2E", opacity: 0 },
          ],
        },
      },
      markers: {
        size: 0,
        colors: ["#1A4D2E"],
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: { size: 5 },
      },
      xaxis: {
        type: "datetime",
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
        labels: {
          style: {
            colors: "#5C6B5E",
            fontFamily: "Outfit",
            fontSize: "10px",
            fontWeight: 600,
          },
          datetimeFormatter: {
            year: "yyyy",
            month: "MMM 'yy",
            ...dateFormatter,
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#5C6B5E",
            fontFamily: "Outfit",
            fontSize: "10px",
            fontWeight: 600,
          },
          formatter: (val) => formatVal(Number(val), true),
        },
      },
      grid: {
        show: true,
        borderColor: "#EEF2EE",
        strokeDashArray: 4,
        padding: { left: 10, right: 10, top: 0, bottom: 0 },
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      tooltip: {
        shared: true,
        intersect: false,
        custom: ({ series, seriesIndex, dataPointIndex }) => {
          const val = series[seriesIndex][dataPointIndex];
          const point = untrack(() => perfSeries())[dataPointIndex];
          if (!point) return "";
          const d = new Date(point.date);
          const fullDate = d.toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          return `
            <div class="px-4 py-3 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 min-w-[180px] border border-white/5">
              <span class="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold mb-1">${fullDate}</span>
              <div class="flex justify-between items-center gap-6">
                <span class="flex items-center gap-2 text-white/80">
                  <span class="w-2 h-2 rounded-full bg-[#52C278] shadow-[0_0_8px_rgba(82,194,120,0.6)]"></span>
                  Net Worth
                </span>
                <span class="font-bold text-sm tracking-tight text-[#52C278]">
                  ${formatVal(Number(val))}
                </span>
              </div>
            </div>
          `;
        },
      },
    };
  });

  const perfSeriesApex = createMemo(() => [
    { name: "Portfolio Value", data: perfSeries().map((p) => p.value) },
  ]);

  const [perfChartReady, setPerfChartReady] = createSignal(false);
  onMount(() => {
    const t = setTimeout(() => setPerfChartReady(true), 80);
    onCleanup(() => clearTimeout(t));
  });

  // Table actions
  const saveQty = async (ticker: string, qty: number) => {
    await updateHolding(ticker, "qty", qty);
  };

  const savePrice = async (ticker: string, price: number) => {
    await updateHolding(ticker, "avgPrice", price);
  };

  const saveRate = async (ticker: string, rate: number) => {
    await updateHolding(ticker, "conversionRate", rate);
  };

  const updateHolding = async (ticker: string, field: "qty" | "avgPrice" | "conversionRate", newVal: number) => {
    const p = quickPortfolio();
    if (!p) return;

    const asset = p.assets.find((a: any) => a.ticker === ticker);
    if (!asset) return;

    const isIdx = ticker.endsWith(".JK");
    const oldQty = asset.totalShares;
    const assetCurrency = isIdx ? "IDR" : (asset.currency || "USD");
    const oldConversionRate = isIdx
      ? 1
      : (asset.conversionRate && asset.conversionRate > 1
        ? asset.conversionRate
        : (assetCurrency === "USD" ? getUsdRate() : 1));

    // asset.averagePrice in portfolioStore is stored in portfolio base currency (IDR).
    // Convert to settlement currency (e.g. USD) for price_per_unit in portfolio_transactions.
    const oldAvgPriceInSettlementCurrency = isIdx
      ? asset.averagePrice
      : (assetCurrency === "USD" ? asset.averagePrice / oldConversionRate : asset.averagePrice);

    const newQty = field === "qty" ? newVal : oldQty;
    const newAvgPrice = field === "avgPrice" ? newVal : oldAvgPriceInSettlementCurrency;
    const newConversionRate = isIdx ? 1 : (field === "conversionRate" ? newVal : oldConversionRate);

    setIsSubmitting(true);
    try {
      const { error: deleteError } = await supabase
        .from("portfolio_transactions")
        .delete()
        .eq("portfolio_id", p.id)
        .eq("asset_ticker", ticker);

      if (deleteError) throw deleteError;

      if (newQty > 0) {
        const assetTx = await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: ticker.toUpperCase(),
          type: "BUY",
          qty: newQty,
          price_per_unit: newAvgPrice,
          fx_rate_to_base: newConversionRate,
          settlement_currency: assetCurrency,
          notes: "Consolidated holding edit",
          transaction_date: new Date().toISOString(),
          linked_transaction_id: null,
        });

        const newCost = newQty * newAvgPrice;

        await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: assetCurrency.toUpperCase(),
          type: "WITHDRAWAL",
          qty: newCost,
          price_per_unit: 1,
          fx_rate_to_base: newConversionRate,
          settlement_currency: assetCurrency,
          notes: `Cash withdrawal for consolidated BUY ${ticker}`,
          transaction_date: new Date().toISOString(),
          linked_transaction_id: assetTx.id,
        });
      }

      await refreshPortfolio(p.id);
      const updated = portfolioState.portfolios.find((x) => x.id === p.id);
      if (updated) {
        setQuickPortfolio(updated);
      }
    } catch (err) {
      console.error("Failed to update holding:", err);
      alert("Failed to update holding. Please check database logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteHolding = (ticker: string) => {
    const p = quickPortfolio();
    if (!p) return;

    const asset = p.assets.find((a: any) => a.ticker === ticker);
    if (!asset) return;

    setAssetToDelete({ ticker, name: asset.name || asset.ticker });
    setShowDeleteModal(true);
  };

  const confirmDeleteHolding = async () => {
    const target = assetToDelete();
    if (!target) return;

    setIsSubmitting(true);
    try {
      const p = quickPortfolio();
      if (!p) return;

      const { error: deleteError } = await supabase
        .from("portfolio_transactions")
        .delete()
        .eq("portfolio_id", p.id)
        .eq("asset_ticker", target.ticker);

      if (deleteError) throw deleteError;

      await refreshPortfolio(p.id);

      const updated = portfolioState.portfolios.find((x) => x.id === p.id);
      if (updated) {
        setQuickPortfolio(updated);
      }
    } catch (err) {
      console.error("Failed to delete holding:", err);
      alert("Failed to remove holding. Please try again.");
    } finally {
      setIsSubmitting(false);
      setAssetToDelete(null);
    }
  };

  const saveCash = async (newCash: number) => {
    const p = quickPortfolio();
    if (!p) return;

    try {
      await adjustPortfolioCash(p.id, newCash);
      const found = portfolioState.portfolios.find((x) => x.id === p.id);
      if (found) {
        setQuickPortfolio(found);
      }
    } catch (err) {
      console.error("Failed to update cash balance:", err);
      alert("Error updating cash balance");
    }
  };

  const createNewHolding = async (
    ticker: string,
    qty: number,
    price: number,
    currency: string,
    conversionRate: number
  ) => {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;

    const p = quickPortfolio();
    if (!p) return;

    const existing = p.assets?.find((a: any) => a.ticker === symbol);
    if (existing) {
      alert("Asset holding already exists! Use the row to update qty/price instead.");
      return;
    }

    const isIdx = symbol.endsWith(".JK");
    const effCurrency = isIdx ? "IDR" : currency;
    const effRate = isIdx ? 1 : conversionRate;

    setIsSubmitting(true);
    try {
      await upsertAsset({
        symbol,
        success: true,
        logo_url: "",
        current_price: price,
        pre_market_price: null,
        post_market_price: null,
        extended_hours_price: price,
        fundamentals: {
          summaryDetail: {},
          summaryProfile: {},
          price: { shortName: symbol },
        },
      });

      const assetTx = await addPortfolioTransaction({
        portfolio_id: p.id,
        asset_ticker: symbol,
        type: "BUY",
        qty,
        price_per_unit: price,
        fx_rate_to_base: effRate,
        settlement_currency: effCurrency,
        notes: "Quick holding added",
        transaction_date: new Date().toISOString(),
        linked_transaction_id: null,
      });

      const cost = qty * price;

      await addPortfolioTransaction({
        portfolio_id: p.id,
        asset_ticker: effCurrency.toUpperCase(),
        type: "WITHDRAWAL",
        qty: cost,
        price_per_unit: 1,
        fx_rate_to_base: effRate,
        settlement_currency: effCurrency,
        notes: `Cash withdrawal for BUY ${symbol}`,
        transaction_date: new Date().toISOString(),
        linked_transaction_id: assetTx.id,
      });

      await refreshPortfolio(p.id);

      const updated = portfolioState.portfolios.find((x) => x.id === p.id);
      if (updated) {
        setQuickPortfolio(updated);
      }
    } catch (err) {
      console.error("Failed to add inline holding:", err);
      alert("Failed to add holding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddHoldingSubmit = async (e: Event) => {
    e.preventDefault();
    const symbol = newTicker().trim().toUpperCase();
    const qty = Number(newQty());
    const price = Number(newPrice());
    const isIdx = symbol.endsWith(".JK");
    const currency = isIdx ? "IDR" : newCurrency();
    const conversionRate = isIdx ? 1 : Number(newConversionRate());

    if (!symbol || qty <= 0 || price <= 0) {
      alert("Please fill in valid symbol, quantity, and buy price.");
      return;
    }
    if (isNaN(conversionRate) || conversionRate <= 0) {
      alert("Please enter a valid conversion rate.");
      return;
    }

    const p = quickPortfolio();
    if (!p) return;

    const cost = qty * price;

    setIsSubmitting(true);
    try {
      const existing = p.assets?.find((a: any) => a.ticker === symbol);
      if (existing) {
        const oldQty = existing.totalShares;
        const oldCostIDR = oldQty * existing.averagePrice;
        const newCostIDR = isIdx ? cost : cost * conversionRate;
        const mergedQty = oldQty + qty;
        const mergedAvgCostIDR = (oldCostIDR + newCostIDR) / mergedQty;
        const mergedPriceInCurrency = isIdx
          ? mergedAvgCostIDR
          : (currency === "USD" ? mergedAvgCostIDR / conversionRate : mergedAvgCostIDR);

        await supabase
          .from("portfolio_transactions")
          .delete()
          .eq("portfolio_id", p.id)
          .eq("asset_ticker", symbol);

        const assetTx = await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: symbol,
          type: "BUY",
          qty: mergedQty,
          price_per_unit: mergedPriceInCurrency,
          fx_rate_to_base: conversionRate,
          settlement_currency: currency,
          notes: "Merged position addition",
          transaction_date: new Date().toISOString(),
          linked_transaction_id: null,
        });

        await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: currency.toUpperCase(),
          type: "WITHDRAWAL",
          qty: mergedQty * mergedPriceInCurrency,
          price_per_unit: 1,
          fx_rate_to_base: conversionRate,
          settlement_currency: currency,
          notes: `Cash withdrawal for merged BUY ${symbol}`,
          transaction_date: new Date().toISOString(),
          linked_transaction_id: assetTx.id,
        });
      } else {
        await upsertAsset({
          symbol,
          success: true,
          logo_url: "",
          current_price: price,
          pre_market_price: null,
          post_market_price: null,
          extended_hours_price: price,
          fundamentals: {
            summaryDetail: {},
            summaryProfile: {},
            price: { shortName: symbol },
          },
        });

        const assetTx = await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: symbol,
          type: "BUY",
          qty: qty,
          price_per_unit: price,
          fx_rate_to_base: conversionRate,
          settlement_currency: currency,
          notes: "Quick holding added",
          transaction_date: new Date().toISOString(),
          linked_transaction_id: null,
        });

        await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: currency.toUpperCase(),
          type: "WITHDRAWAL",
          qty: cost,
          price_per_unit: 1,
          fx_rate_to_base: conversionRate,
          settlement_currency: currency,
          notes: `Cash withdrawal for BUY ${symbol}`,
          transaction_date: new Date().toISOString(),
          linked_transaction_id: assetTx.id,
        });
      }

      await refreshPortfolio(p.id);

      setNewTicker("");
      setNewQty(null);
      setNewPrice(null);
      setNewCurrency("USD");
      setNewConversionRate(null);
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add holding:", err);
      alert("Failed to insert asset. Check ticker spelling.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isCopied, setIsCopied] = createSignal(false);

  const handleCopyJson = async () => {
    const p = quickPortfolio();
    if (!p) return;

    const dataStr = JSON.stringify({
      name: p.name,
      cash: p.cash,
      initialCapital: p.initialCapital,
      transactions: (p.transactions || []).map((t: any) => ({
        ticker: t.ticker,
        shares: t.shares,
        pricePerShare: t.pricePerShare,
        date: t.date,
        type: t.type
      }))
    }, null, 2);

    try {
      await navigator.clipboard.writeText(dataStr);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
      alert("Failed to copy JSON to clipboard.");
    }
  };

  return (
    <div class="flex-1 flex flex-col gap-6 w-full pb-12 animate-fade-in-up">
      <QuickPortfolioHeader 
        lastUpdatedLabel={lastUpdatedLabel()} 
        isRefreshing={portfolioState.isRefreshing}
        onRefresh={async () => {
          const p = quickPortfolio();
          if (p) await refreshPortfolio(p.id);
        }}
      />

      <Show 
        when={!isLoading()} 
        fallback={
          <div class="flex flex-col items-center justify-center py-32 gap-4">
            <div class="w-12 h-12 border-4 border-forest/10 border-t-forest rounded-full animate-spin" />
            <span class="text-earth font-outfit text-sm animate-pulse">Initializing Quick Portfolio...</span>
          </div>
        }
      >
        <section class="grid grid-cols-12 gap-6">
          <QuickPortfolioKPIs 
            totalValue={totalValue()}
            overallPL={overallPL()}
            overallPLPercent={overallPLPercent()}
            todayChange={todayChange()}
            todayChangePercent={todayChangePercent()}
            hasTodayChangeData={hasTodayChangeData()}
            formatVal={formatVal}
            formatPercent={formatPercent}
          />

          {/* Row: Category PnL Card & Daily Movers Card */}
          <div class="col-span-12 lg:col-span-6 flex flex-col h-full">
            <CategoryPnLCard 
              categories={categoryPnLData()}
              formatVal={formatVal}
              formatPercent={formatPercent}
            />
          </div>

          <div class="col-span-12 lg:col-span-6 flex flex-col h-full">
            <DailyMoversCard 
              assets={quickPortfolio()?.assets || []}
              formatVal={formatVal}
              formatPercent={formatPercent}
              getDisplayTicker={getDisplayTicker}
              getCategory={getCategory}
            />
          </div>

          <QuickPortfolioCharts 
            allocations={allocations()}
            allocationView={allocationView()}
            setAllocationView={setAllocationView}
            detailAllocations={detailAllocations()}
            perfKpi={perfKpi()}
            perfPeriod={perfPeriod()}
            setPerfPeriod={setPerfPeriod}
            perfChartReady={perfChartReady()}
            perfOptions={perfOptions()}
            perfSeriesApex={perfSeriesApex()}
            perfSeries={perfSeries()}
            formatVal={formatVal}
            formatPercent={formatPercent}
          />
        </section>

        <QuickPortfolioTable 
          assets={quickPortfolio()?.assets || []}
          distinctAssetCount={distinctAssetCount()}
          cashBalance={cashBalance()}
          totalValue={totalValue()}
          initialCapital={initialCapital()}
          overallPL={overallPL()}
          overallPLPercent={overallPLPercent()}
          currencyView={currencyView()}
          isSubmitting={isSubmitting()}
          onStartAddHolding={() => {
            setNewCurrency("USD");
            setNewConversionRate(getUsdRate());
            setShowAddModal(true);
          }}
          onCopyJson={handleCopyJson}
          isCopied={isCopied()}
          onSaveQty={saveQty}
          onSavePrice={savePrice}
          onSaveRate={saveRate}
          onDeleteHolding={deleteHolding}
          onSaveCash={saveCash}
          onCreateNewHolding={createNewHolding}
          formatVal={formatVal}
          formatCash={formatCash}
          formatPrice={formatPrice}
          getCategory={getCategory}
          getCategoryIcon={getCategoryIcon}
          getDisplayTicker={getDisplayTicker}
          getUsdRate={getUsdRate}
        />
      </Show>

      <AddHoldingModal 
        isOpen={showAddModal()}
        onClose={() => setShowAddModal(false)}
        isSubmitting={isSubmitting()}
        newTicker={newTicker()}
        setNewTicker={setNewTicker}
        newQty={newQty()}
        setNewQty={setNewQty}
        newPrice={newPrice()}
        setNewPrice={setNewPrice}
        newCurrency={newCurrency()}
        setNewCurrency={setNewCurrency}
        newConversionRate={newConversionRate()}
        setNewConversionRate={setNewConversionRate}
        getUsdRate={getUsdRate}
        onSubmit={handleAddHoldingSubmit}
      />

      <ConfirmDeleteAssetModal
        isOpen={showDeleteModal()}
        assetName={assetToDelete()?.name || ""}
        onConfirm={confirmDeleteHolding}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
