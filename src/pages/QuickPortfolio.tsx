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
import type { PortfolioAsset } from "../types";
import type { ApexOptions } from "apexcharts";

// Import sub-components
import { QuickPortfolioHeader } from "../components/screen-quick-portfolio/QuickPortfolioHeader";
import { QuickPortfolioKPIs } from "../components/screen-quick-portfolio/QuickPortfolioKPIs";
import { QuickPortfolioCharts } from "../components/screen-quick-portfolio/QuickPortfolioCharts";
import { QuickPortfolioTable } from "../components/screen-quick-portfolio/QuickPortfolioTable";
import { AddHoldingModal } from "../components/screen-quick-portfolio/AddHoldingModal";
import { ConfirmDeleteAssetModal } from "../components/screen-quick-portfolio/ConfirmDeleteAssetModal";

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

  // Performance chart period
  type PerfPeriod = "1D" | "1W" | "1M" | "1Y" | "ALL";
  const [perfPeriod, setPerfPeriod] = createSignal<PerfPeriod>("1M");

  // Auto-categorize ticker
  const getCategory = (ticker: string) => {
    const t = ticker.toUpperCase();
    if (t.endsWith(".JK")) return "IDX";
    if (t === "VOO") return "ETFs";
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
    if (category === "ETFs") return "account_balance";
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

    const hasFraction = displayAmount % 1 !== 0;
    const decimals = hasFraction ? 8 : (display === 'USD' ? 2 : 0);

    if (display === 'USD') {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: Math.max(2, decimals),
      }).format(displayAmount);
    } else {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
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
    const diff = Date.now() - ts;
    if (diff < 30_000) return "Just now";
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    const d = new Date(ts);
    return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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

  // Track when the global store finishes a refresh
  createEffect(() => {
    const refreshing = portfolioState.isRefreshing;
    if (!refreshing) {
      const p = quickPortfolio();
      const dbTs = p?.updated_at ? new Date(p.updated_at).getTime() : null;
      setLastRefreshedAt(dbTs ?? Date.now());
    }
  });

  // Calculations
  const assetsValueUSD = createMemo(() => {
    const p = quickPortfolio();
    if (!p || !p.assets) return 0;
    return p.assets.reduce((sum: number, a: PortfolioAsset) => sum + a.currentValue, 0);
  });

  const cashBalance = () => quickPortfolio()?.cash || 0;
  const cashValueUSD = createMemo(() => cashBalance());

  const totalValue = createMemo(() => assetsValueUSD() + cashValueUSD());
  const initialCapital = () => quickPortfolio()?.initialCapital || 0;

  const overallPL = () => totalValue() - initialCapital();
  const overallPLPercent = () => initialCapital() > 0 ? (overallPL() / initialCapital()) : 0;

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

  // Dynamic Conic Allocation percentages
  const allocations = createMemo(() => {
    const p = quickPortfolio();
    if (!p) return { stocks: 0, crypto: 0, etfs: 0, cash: 0 };
    const total = totalValue() || 1;

    let stocksVal = 0;
    let cryptoVal = 0;
    let etfsVal = 0;

    (p.assets || []).forEach((a: any) => {
      const cat = getCategory(a.ticker);
      if (cat === "Stocks" || cat === "IDX") stocksVal += a.currentValue;
      else if (cat === "Crypto") cryptoVal += a.currentValue;
      else if (cat === "ETFs") etfsVal += a.currentValue;
    });

    return {
      stocks: (stocksVal / total) * 100,
      crypto: (cryptoVal / total) * 100,
      etfs: (etfsVal / total) * 100,
      cash: (cashValueUSD() / total) * 100,
    };
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

    const oldQty = asset.totalShares;
    const oldAvgPrice = asset.averagePrice;
    const oldConversionRate = asset.conversionRate ?? 1;

    const newQty = field === "qty" ? newVal : oldQty;
    const newAvgPrice = field === "avgPrice" ? newVal : oldAvgPrice;
    const newConversionRate = field === "conversionRate" ? newVal : oldConversionRate;

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
          settlement_currency: asset.currency || "USD",
          notes: "Consolidated holding edit",
          transaction_date: new Date().toISOString(),
          linked_transaction_id: null,
        });

        const newCost = newQty * newAvgPrice;

        await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: (asset.currency || "USD").toUpperCase(),
          type: "WITHDRAWAL",
          qty: newCost,
          price_per_unit: 1,
          fx_rate_to_base: newConversionRate,
          settlement_currency: asset.currency || "USD",
          notes: `Cash withdrawal for consolidated BUY ${ticker}`,
          transaction_date: new Date().toISOString(),
          linked_transaction_id: assetTx.id,
        });
      }

      await refreshPortfolio(p.id);
      const updated = portfolioState.portfolios.find(x => x.id === p.id);
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

      const updated = portfolioState.portfolios.find(x => x.id === p.id);
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
      const found = portfolioState.portfolios.find(x => x.id === p.id);
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
        fx_rate_to_base: conversionRate,
        settlement_currency: currency,
        notes: "Quick holding added",
        transaction_date: new Date().toISOString(),
        linked_transaction_id: null,
      });

      const cost = qty * price;

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

      await refreshPortfolio(p.id);

      const updated = portfolioState.portfolios.find(x => x.id === p.id);
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
    const currency = newCurrency();
    const conversionRate = Number(newConversionRate());

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
    const costIDR = currency === "IDR" ? cost : cost * conversionRate;
    const costUSD = currency === "USD" ? cost : cost / conversionRate;
    const newCash = p.cash - costIDR;

    setIsSubmitting(true);
    try {
      const existing = p.assets.find((a: any) => a.ticker === symbol);
      if (existing) {
        const oldCostUSD = existing.totalShares * existing.averagePrice;
        const mergedQty = existing.totalShares + qty;
        const mergedAvgPriceUSD = (oldCostUSD + costUSD) / mergedQty;
        const mergedNewCash = p.cash - costIDR;

        await supabase
          .from("portfolio_transactions")
          .delete()
          .eq("portfolio_id", p.id)
          .eq("asset_ticker", symbol);

        await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: symbol,
          type: "BUY",
          qty: mergedQty,
          price_per_unit: currency === "USD" ? mergedAvgPriceUSD : mergedAvgPriceUSD * conversionRate,
          fx_rate_to_base: currency === "USD" ? conversionRate : 1,
          settlement_currency: currency,
          notes: "Merged position addition",
          transaction_date: new Date().toISOString(),
          linked_transaction_id: null,
        });

        await adjustPortfolioCash(p.id, mergedNewCash);
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

        await addPortfolioTransaction({
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

        await adjustPortfolioCash(p.id, newCash);
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
      <QuickPortfolioHeader lastUpdatedLabel={lastUpdatedLabel()} />

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

          <QuickPortfolioCharts 
            allocations={allocations()}
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
          cashBalance={cashBalance()}
          totalValue={totalValue()}
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
