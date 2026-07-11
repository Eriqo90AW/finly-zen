import {
  createSignal,
  createMemo,
  onMount,
  onCleanup,
  Show,
  For,
  createEffect,
  untrack,
} from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  portfolioState,
  loadPortfolios,
  refreshPortfolio,
  quickPortfolioSearch,
  setQuickPortfolioSearch,
  adjustPortfolioCash,
} from "../store/portfolioStore";
import {
  addPortfolioTransaction,
  upsertAsset,
  fetchMultiStockPrices,
} from "../data/portfolioData";
import { supabase } from "../lib/supabase";
import { formatUSD, formatPercent, formatPortfolioValue, getUsdRate, usdRateReady } from "../utils/format";
import type { PortfolioAsset } from "../types";

const USER_ID = "a4d800bd-e779-4e7b-8982-2cab3d10035b";

// Initial Quick Portfolio configuration
const STARTING_CASH = 0.00;

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

  // Edit Cell State
  const [editingCell, setEditingCell] = createSignal<{ ticker: string; field: "qty" | "avgPrice" | "conversionRate" } | null>(null);
  const [isCashEditing, setIsCashEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal("");
  let qtyInputRef: HTMLInputElement | undefined;
  let priceInputRef: HTMLInputElement | undefined;
  let rateInputRef: HTMLInputElement | undefined;
  let cashInputRef: HTMLInputElement | undefined;

  // Inline new-row draft — only commits to DB when ticker, qty and price are all valid
  interface NewRowDraft {
    ticker: string;
    qty: string;
    avgPrice: string;
    currency: string;
    conversionRate: string;
  }
  const [newRowDraft, setNewRowDraft] = createSignal<NewRowDraft | null>(null);
  let newRowTickerRef: HTMLInputElement | undefined;
  let newRowQtyRef: HTMLInputElement | undefined;
  let newRowPriceRef: HTMLInputElement | undefined;
  let newRowCurrencyRef: HTMLSelectElement | undefined;
  let newRowRateRef: HTMLInputElement | undefined;

  // Last refreshed timestamp (for plain "Last updated" text)
  const [lastRefreshedAt, setLastRefreshedAt] = createSignal<number | null>(null);

  // Live clock tick — re-evaluates the relative "Last updated" label even when
  // no data changes, so "Just now" actually counts up to "Xs ago", "Xm ago"…
  const [now, setNow] = createSignal(Date.now());
  onMount(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    onCleanup(() => clearInterval(id));
  });

  // Performance chart period
  type PerfPeriod = "1D" | "1W" | "1M" | "1Y" | "ALL";
  const [perfPeriod, setPerfPeriod] = createSignal<PerfPeriod>("1M");

  // Pagination (Mocked showing 1 to N of N since we deal with active list)
  const [currentPage, setCurrentPage] = createSignal(1);

  // Auto-categorize ticker
  const getCategory = (ticker: string) => {
    const t = ticker.toUpperCase();
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
    return "phone_iphone"; // Default Stocks / Apple style
  };

  const currencyView = () => portfolioState.currencyView;

  const formatVal = (amount: number, isShort = false) => {
    const native = quickPortfolio()?.nativeCurrency || "IDR";
    return formatPortfolioValue(amount, currencyView(), isShort, native);
  };

  const getPortfolioRate = () => {
    const p = quickPortfolio();
    return p ? Number(p.price_currency || 1) : 1;
  };

  const formatCash = (amount: number, isShort = false) => {
    const native = quickPortfolio()?.nativeCurrency || "IDR";
    return formatPortfolioValue(amount, currencyView(), isShort, native, getPortfolioRate());
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

  // Reactive label — depends on the live `now()` tick so it stays current
  const lastUpdatedLabel = createMemo(() => {
    now(); // track the ticking clock
    return formatRelative(lastRefreshedAt());
  });

  // 1. Database Check & Initialization
  onMount(async () => {
    await loadAndInitialize();
  });

  const loadAndInitialize = async () => {
    setIsLoading(true);
    try {
      await usdRateReady;

      await loadPortfolios();

      let found = portfolioState.portfolios.find(p => p.name === "Quick Portfolio");

      // Insert Quick Portfolio only if it's missing AND the portfolios table is completely empty
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
        // Fallback to the first available portfolio if "Quick Portfolio" is missing but table is not empty
        found = portfolioState.portfolios[0];
      }

      // If the found portfolio is indeed "Quick Portfolio", ensure it uses IDR base currency
      if (found && found.name === "Quick Portfolio") {
        if (found.base_currency !== "IDR") {
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

  // Track when the global store finishes a refresh so we can show "Last updated: …"
  createEffect(() => {
    const refreshing = portfolioState.isRefreshing;
    if (!refreshing) {
      // Use the portfolio's updated_at from the DB when available, otherwise now
      const p = quickPortfolio();
      const dbTs = p?.updated_at ? new Date(p.updated_at).getTime() : null;
      setLastRefreshedAt(dbTs ?? Date.now());
    }
  });

  // 2. Calculations
  // Cash is stored natively as IDR. Assets are USD-native. We compute a
  // corrected USD total value so the rest of the UI (formatVal with USD
  // native) keeps working and cash no longer fluctuates with rate changes.
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

  // Today's Change: real per-asset sum using previousClose (in display currency)
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

  // Filter Assets
  const filteredAssets = createMemo(() => {
    const p = quickPortfolio();
    if (!p || !p.assets) return [];
    const query = quickPortfolioSearch().toLowerCase().trim();
    if (!query) return p.assets;
    return p.assets.filter((a: any) => 
      a.ticker.toLowerCase().includes(query) || 
      (a.name || "").toLowerCase().includes(query)
    );
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
      if (cat === "Stocks") stocksVal += a.currentValue;
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

  // Performance chart series — builds a smooth, period-aware mock history
  // (initial → current value) until real history is wired in. Points are
  // distributed in real time, so the x-axis reads as actual dates.
  const perfSeries = createMemo(() => {
    const init = initialCapital();
    const curr = totalValue();

    // Find a sensible "as of" — use the first transaction date if any, else
    // the portfolio created_at (fall back to 30 days ago).
    const p = quickPortfolio();
    const firstTxTs = p?.transactions?.length
      ? new Date(
          [...p.transactions].sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          )[0].date,
        ).getTime()
      : null;

    const now = Date.now();
    const startTs = firstTxTs ?? now - 30 * 24 * 60 * 60 * 1000;

    const period = perfPeriod();
    let cutoff = startTs;
    if (period === "1D") cutoff = now - 24 * 60 * 60 * 1000;
    else if (period === "1W") cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (period === "1M") cutoff = now - 30 * 24 * 60 * 60 * 1000;
    else if (period === "1Y") cutoff = now - 365 * 24 * 60 * 60 * 1000;
    // ALL → use startTs

    const effectiveStart = Math.max(cutoff, startTs);

    if (init === 0 && curr === 0) return [] as { date: number; value: number }[];

    const pointCount = period === "1D" ? 24 : period === "1W" ? 28 : 30;
    const startVal = init > 0 ? init : curr;
    const delta = curr - startVal;
    const span = now - effectiveStart;
    const step = span / (pointCount - 1);

    const points: { date: number; value: number }[] = [];
    // Seeded noise so the line wiggles but doesn't jump randomly on every render
    let seed = Math.floor(effectiveStart / (60 * 60 * 1000));
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < pointCount; i++) {
      const t = i === pointCount - 1 ? now : effectiveStart + i * step;
      // progress 0..1
      const prog = i / (pointCount - 1);
      // base interpolation
      const base = startVal + delta * prog;
      // wiggle: ±0.6% noise, decaying toward the ends
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

  // 3. Inline Edit Logic
  const startEdit = (ticker: string, field: "qty" | "avgPrice" | "conversionRate", currentVal: number) => {
    setEditingCell({ ticker, field });
    
    let displayVal = currentVal;
    if (field === "avgPrice" && currencyView() === "IDR") {
      displayVal = currentVal * getUsdRate();
    }

    setEditValue(parseFloat(displayVal.toFixed(8)).toString());
    setTimeout(() => {
      if (field === "qty") {
        qtyInputRef?.focus();
        qtyInputRef?.select();
      } else if (field === "conversionRate") {
        rateInputRef?.focus();
        rateInputRef?.select();
      } else {
        priceInputRef?.focus();
        priceInputRef?.select();
      }
    }, 50);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const saveEdit = async (ticker: string, field: "qty" | "avgPrice" | "conversionRate") => {
    let val = parseFloat(editValue());
    if (isNaN(val) || val < 0) {
      cancelEdit();
      return;
    }
    if (field === "conversionRate" && val <= 0) {
      cancelEdit();
      return;
    }

    if (field === "avgPrice" && currencyView() === "IDR") {
      val = val / getUsdRate();
    }

    const currentEditing = editingCell();
    setEditingCell(null);
    if (currentEditing) {
      await updateHolding(ticker, field, val);
    }
  };

  const handleKeyDown = (e: KeyboardEvent, ticker: string, field: "qty" | "avgPrice" | "conversionRate") => {
    if (e.key === "Enter") {
      saveEdit(ticker, field);
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const saveCashEdit = async () => {
    let val = parseFloat(editValue());
    setIsCashEditing(false);
    if (!isNaN(val)) {
      if (currencyView() === "IDR") {
        val = val / getPortfolioRate();
      }
      await updateInitialCapitalFromCash(val);
    }
  };

  const openNewRowDraft = () => {
    if (isSubmitting()) return;
    setNewRowDraft({
      ticker: "",
      qty: "",
      avgPrice: "",
      currency: "USD",
      conversionRate: getUsdRate().toFixed(2),
    });
    setTimeout(() => {
      newRowTickerRef?.focus();
    }, 50);
  };

  const cancelNewRowDraft = () => {
    if (isSubmitting()) return;
    setNewRowDraft(null);
  };

  const commitNewRowDraft = async () => {
    const draft = newRowDraft();
    if (!draft) return;

    const symbol = draft.ticker.trim().toUpperCase();
    const qty = parseFloat(draft.qty);
    const price = parseFloat(draft.avgPrice);
    const currency = draft.currency;
    const conversionRate = parseFloat(draft.conversionRate);

    if (!symbol) {
      newRowTickerRef?.focus();
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      newRowQtyRef?.focus();
      return;
    }
    if (isNaN(price) || price <= 0) {
      newRowPriceRef?.focus();
      return;
    }
    if (isNaN(conversionRate) || conversionRate <= 0) {
      newRowRateRef?.focus();
      return;
    }

    await createNewHolding(symbol, qty, price, currency, conversionRate);
  };

  const handleNewRowDraftKeyDown = (
    e: KeyboardEvent,
    field: "ticker" | "qty" | "avgPrice" | "currency" | "conversionRate",
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "ticker") {
        newRowQtyRef?.focus();
        newRowQtyRef?.select();
      } else if (field === "qty") {
        newRowPriceRef?.focus();
        newRowPriceRef?.select();
      } else if (field === "avgPrice") {
        newRowRateRef?.focus();
        newRowRateRef?.select();
      } else {
        commitNewRowDraft();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelNewRowDraft();
    }
  };

  const createNewHolding = async (
    ticker: string,
    qty: number,
    price: number,
    currency: string,
    conversionRate: number,
  ) => {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;

    const p = quickPortfolio();
    if (!p) return;

    // Check if ticker already exists
    const existing = p.assets?.find((a: any) => a.ticker === symbol);
    if (existing) {
      alert("Asset holding already exists! Use the row to update qty/price instead.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upsert Asset metadata first so the row can render with a sensible
      // currentPrice fallback while the live multi-stock fetch runs.
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
        price_currency: conversionRate,
        currency,
        notes: "Quick holding added",
        transaction_date: new Date().toISOString(),
        linked_transaction_id: null,
      });

      const costUSD = currency === "USD" ? qty * price : qty * price / conversionRate;

      await addPortfolioTransaction({
        portfolio_id: p.id,
        asset_ticker: currency.toUpperCase(),
        type: "WITHDRAWAL",
        qty: costUSD,
        price_per_unit: 1,
        price_currency: conversionRate,
        currency,
        notes: `Cash withdrawal for BUY ${symbol}`,
        transaction_date: new Date().toISOString(),
        linked_transaction_id: assetTx.id,
      });

      await refreshPortfolio(p.id);

      const updated = portfolioState.portfolios.find(x => x.id === p.id);
      if (updated) {
        setQuickPortfolio(updated);
      }

      // Close the draft only after a successful commit
      setNewRowDraft(null);
    } catch (err) {
      console.error("Failed to add inline holding:", err);
      alert("Failed to add holding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      saveCashEdit();
    } else if (e.key === "Escape") {
      setIsCashEditing(false);
    }
  };

  const updateInitialCapitalFromCash = async (newCashUSD: number) => {
    const p = quickPortfolio();
    if (!p) return;

    try {
      await adjustPortfolioCash(p.id, newCashUSD);
      const found = portfolioState.portfolios.find(x => x.id === p.id);
      if (found) {
        setQuickPortfolio(found);
      }
    } catch (err) {
      console.error("Failed to update cash balance:", err);
      alert("Error updating cash balance");
    }
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
      // Delete old transaction logs
      const { error: deleteError } = await supabase
        .from("portfolio_transactions")
        .delete()
        .eq("portfolio_id", p.id)
        .eq("asset_ticker", ticker);

      if (deleteError) throw deleteError;

      // Insert new consolidated transaction with the updated conversion rate
      if (newQty > 0) {
        const assetTx = await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: ticker.toUpperCase(),
          type: "BUY",
          qty: newQty,
          price_per_unit: newAvgPrice,
          price_currency: newConversionRate,
          currency: asset.currency || "USD",
          notes: "Consolidated holding edit",
          transaction_date: new Date().toISOString(),
          linked_transaction_id: null,
        });

        const newCostUSD = asset.currency === "USD" ? newQty * newAvgPrice : newQty * newAvgPrice / newConversionRate;

        await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: (asset.currency || "USD").toUpperCase(),
          type: "WITHDRAWAL",
          qty: newCostUSD,
          price_per_unit: 1,
          price_currency: newConversionRate,
          currency: asset.currency || "USD",
          notes: `Cash withdrawal for consolidated BUY ${ticker}`,
          transaction_date: new Date().toISOString(),
          linked_transaction_id: assetTx.id,
        });
      }

      // Reload
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

  const deleteHolding = async (ticker: string) => {
    const p = quickPortfolio();
    if (!p) return;

    const asset = p.assets.find((a: any) => a.ticker === ticker);
    if (!asset) return;

    const confirmed = confirm(`Remove ${asset.name || asset.ticker} from your portfolio?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const { error: deleteError } = await supabase
        .from("portfolio_transactions")
        .delete()
        .eq("portfolio_id", p.id)
        .eq("asset_ticker", ticker);

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
    }
  };

  // 4. Add Holding Modal Submission
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

    const costUSD = currency === "USD" ? qty * price : qty * price / conversionRate;
    const newCash = p.cash - costUSD;

    setIsSubmitting(true);
    try {
      // Check if holding already exists. If so, merge them
      const existing = p.assets.find((a: any) => a.ticker === symbol);
      if (existing) {
        const oldCostUSD = existing.totalShares * existing.averagePrice;
        const mergedQty = existing.totalShares + qty;
        const mergedAvgPriceUSD = (oldCostUSD + costUSD) / mergedQty;
        const mergedNewCash = p.cash - costUSD;

        // Delete old transactions
        await supabase
          .from("portfolio_transactions")
          .delete()
          .eq("portfolio_id", p.id)
          .eq("asset_ticker", symbol);

        // Add consolidated BUY
        await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: symbol,
          type: "BUY",
          qty: mergedQty,
          price_per_unit: currency === "USD" ? mergedAvgPriceUSD : mergedAvgPriceUSD * conversionRate,
          price_currency: currency === "USD" ? conversionRate : 1,
          currency,
          notes: "Merged position addition",
          transaction_date: new Date().toISOString(),
        });

        await updatePortfolioCash(p.id, mergedNewCash);
      } else {
        // Upsert Asset metadata first
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

        // Add standard BUY transaction
        await addPortfolioTransaction({
          portfolio_id: p.id,
          asset_ticker: symbol,
          type: "BUY",
          qty,
          price_per_unit: price,
          price_currency: conversionRate,
          currency,
          notes: "Quick holding added",
          transaction_date: new Date().toISOString(),
        });

        // Update Cash
        await updatePortfolioCash(p.id, newCash);
      }

      // Refresh
      await refreshPortfolio(p.id);
      
      // Reset Modal fields
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

  // 5. JSON Export/Import Utilities
  const handleExport = () => {
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

    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", "quick_portfolio_export.json");
    link.click();
  };

  const handleImport = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.transactions || !Array.isArray(data.transactions)) {
          alert("Invalid export JSON format.");
          return;
        }

        const p = quickPortfolio();
        if (!p) return;

        setIsLoading(true);

        // Delete existing transactions
        const { error: deleteError } = await supabase
          .from("portfolio_transactions")
          .delete()
          .eq("portfolio_id", p.id);

        if (deleteError) throw deleteError;

        // Re-insert transactions
        for (const t of data.transactions) {
          await upsertAsset({
            symbol: t.ticker,
            success: true,
            logo_url: "",
            current_price: t.pricePerShare,
            pre_market_price: null,
            post_market_price: null,
            extended_hours_price: t.pricePerShare,
            fundamentals: {
              summaryDetail: {},
              summaryProfile: {},
              price: { shortName: t.ticker },
            },
          });

          await addPortfolioTransaction({
            portfolio_id: p.id,
            asset_ticker: t.ticker.toUpperCase(),
            type: t.type || "BUY",
            qty: t.shares,
            price_per_unit: t.pricePerShare,
            price_currency: getPortfolioRate(),
            currency: "USD",
            notes: "Imported holding",
            transaction_date: t.date || new Date().toISOString(),
          });
        }

        // Reconcile cash
        const newCash = Number(data.cash ?? p.cash);
        await adjustPortfolioCash(p.id, newCash);

        await refreshPortfolio(p.id);
        alert("Portfolio imported successfully!");
      } catch (err) {
        console.error("Import failure:", err);
        alert("Failed to parse JSON file.");
      } finally {
        setIsLoading(false);
        target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div class="flex-1 flex flex-col gap-6 w-full pb-12 animate-fade-in-up">
      {/* Page Header */}
      <div class="flex justify-between items-end">
        <div>
          <h2 class="font-headline-xl text-3xl font-bold text-forest">Quick Portfolio</h2>
          <p class="font-body-md text-sm text-earth mt-1">Real-time asset management and performance tracking.</p>
        </div>
        <div class="flex gap-3 items-center select-none">
          <div class="font-label-sm text-xs text-earth flex items-center gap-1.5 px-1 py-1">
            <span class="material-icons !text-sm text-forest/40">sync</span>
            <span>Last updated: {lastUpdatedLabel()}</span>
          </div>
        </div>
      </div>

      <Show 
        when={!isLoading()} 
        fallback={
          <div class="flex flex-col items-center justify-center py-32 gap-4">
            <div class="w-12 h-12 border-4 border-forest/10 border-t-forest rounded-full animate-spin" />
            <span class="text-earth font-outfit text-sm animate-pulse">Initializing Quick Portfolio...</span>
          </div>
        }
      >
        {/* Top Section: KPIs & Charts */}
        <section class="grid grid-cols-12 gap-6">
          
          {/* KPI Cards (Left 4 columns) */}
          <div class="col-span-12 lg:col-span-4 flex flex-col gap-4">
            
            {/* KPI 1: Total Portfolio Value */}
            <div class="bg-white rounded-2xl p-5 border border-forest/10 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div class="absolute top-0 right-0 w-24 h-24 bg-forest/5 rounded-bl-full opacity-50 -mr-8 -mt-8"></div>
              <p class="font-label-md text-xs text-earth uppercase tracking-wider mb-1 font-bold">Total Portfolio Value</p>
              <h3 class="text-3xl font-outfit font-bold text-near-black tracking-tight">{formatVal(totalValue())}</h3>
            </div>

            {/* KPI 2: Overall P/L */}
            <div class="bg-white rounded-2xl p-5 border border-forest/10 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
              <p class="font-label-md text-xs text-earth uppercase tracking-wider mb-1 font-bold">Overall P/L</p>
              <div class="flex items-baseline gap-2 mt-1">
                <h3 class="text-2xl font-outfit font-bold tracking-tight" classList={{ "text-forest": overallPL() >= 0, "text-red-600": overallPL() < 0 }}>
                  {overallPL() >= 0 ? "+" : ""}{formatVal(overallPL())}
                </h3>
                <span class="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  classList={{ 
                    "bg-forest/10 text-forest": overallPL() >= 0, 
                    "bg-red-50 text-red-600": overallPL() < 0 
                  }}
                >
                  <span class="material-icons !text-xs font-bold">{overallPL() >= 0 ? "trending_up" : "trending_down"}</span>
                  {formatPercent(overallPLPercent())}
                </span>
              </div>
            </div>

            {/* KPI 3: Today's Change */}
            <div class="bg-white rounded-2xl p-5 border border-forest/10 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
              <p class="font-label-md text-xs text-earth uppercase tracking-wider mb-1 font-bold">Today's Change</p>
              <Show
                when={hasTodayChangeData()}
                fallback={
                  <div class="flex items-baseline gap-2 mt-1">
                    <h3 class="text-2xl font-outfit font-bold tracking-tight text-earth/50">—</h3>
                    <span class="text-[10px] text-earth/50 font-outfit font-semibold uppercase tracking-wider">
                      Awaiting previous close
                    </span>
                  </div>
                }
              >
                <div class="flex items-baseline gap-2 mt-1">
                  <h3
                    class="text-2xl font-outfit font-bold tracking-tight"
                    classList={{
                      "text-forest": todayChange() >= 0,
                      "text-red-600": todayChange() < 0,
                    }}
                  >
                    {todayChange() >= 0 ? "+" : ""}{formatVal(todayChange())}
                  </h3>
                  <span
                    class="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    classList={{
                      "bg-forest/10 text-forest": todayChange() >= 0,
                      "bg-red-50 text-red-600": todayChange() < 0,
                    }}
                  >
                    <span class="material-icons !text-xs font-bold">
                      {todayChange() >= 0 ? "trending_up" : "trending_down"}
                    </span>
                    {formatPercent(todayChangePercent())}
                  </span>
                </div>
              </Show>
            </div>

          </div>

          {/* Charts Area (Right 8 columns) */}
          <div class="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Asset Allocation Donut */}
            <div class="bg-white rounded-2xl p-5 border border-forest/10 shadow-sm flex flex-col">
              <h4 class="font-outfit text-sm font-bold text-near-black mb-4 uppercase tracking-wider">Asset Allocation</h4>
              
              <div class="flex-1 flex items-center justify-center relative min-h-[140px]">
                {/* Dynamic CSS Donut representation */}
                <div class="w-32 h-32 rounded-full relative" 
                  style={{
                    background: `conic-gradient(
                      #1a4d2e 0% ${allocations().stocks}%, 
                      #2d7d46 ${allocations().stocks}% ${allocations().stocks + allocations().crypto}%, 
                      #52c278 ${allocations().stocks + allocations().crypto}% ${allocations().stocks + allocations().crypto + allocations().etfs}%, 
                      #cbd5e1 ${allocations().stocks + allocations().crypto + allocations().etfs}% 100%
                    )`,
                    "mask-image": "radial-gradient(transparent 55%, black 56%)",
                    "-webkit-mask-image": "radial-gradient(transparent 55%, black 56%)"
                  }}
                />
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="font-outfit text-[10px] text-earth uppercase font-semibold">Total</span>
                  <span class="font-outfit text-sm text-forest font-bold">100%</span>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-earth">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full bg-[#1a4d2e]"></div>
                  <span>Stocks ({allocations().stocks.toFixed(1)}%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full bg-[#2d7d46]"></div>
                  <span>Crypto ({allocations().crypto.toFixed(1)}%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full bg-[#52c278]"></div>
                  <span>ETFs ({allocations().etfs.toFixed(1)}%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full bg-[#cbd5e1]"></div>
                  <span>Cash ({allocations().cash.toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            {/* Performance Trend */}
            <div class="bg-white rounded-2xl p-5 border border-forest/10 shadow-sm flex flex-col">
              <div class="flex justify-between items-start mb-3 gap-3">
                <div>
                  <h4 class="font-outfit text-sm font-bold text-near-black uppercase tracking-wider">Performance Trend</h4>
                  <Show when={perfKpi()}>
                    {(kpi) => {
                      const positive = () => kpi().isPositive;
                      return (
                        <div class="flex items-baseline gap-1.5 mt-1.5">
                          <span
                            class="font-outfit text-xl font-bold tracking-tight"
                            classList={{
                              "text-forest": positive(),
                              "text-red-600": !positive(),
                            }}
                          >
                            {positive() ? "+" : ""}{formatVal(kpi().change)}
                          </span>
                          <span
                            class="text-[10px] font-outfit font-bold uppercase tracking-wider"
                            classList={{
                              "text-forest": positive(),
                              "text-red-600": !positive(),
                            }}
                          >
                            ({formatPercent(kpi().pct)})
                          </span>
                          <span class="text-[10px] text-earth/60 font-outfit font-semibold uppercase tracking-wider ml-1">
                            · {perfPeriod()}
                          </span>
                        </div>
                      );
                    }}
                  </Show>
                </div>

                <div class="flex bg-sage/40 p-1 rounded-xl border border-forest/5 shadow-inner shrink-0">
                  <For each={["1D", "1W", "1M", "1Y", "ALL"] as PerfPeriod[]}>
                    {(p) => {
                      const active = () => perfPeriod() === p;
                      return (
                        <button
                          onClick={() => setPerfPeriod(p)}
                          class="px-2.5 py-1 rounded-lg text-[10px] font-outfit font-bold transition-all duration-200 uppercase tracking-wider cursor-pointer"
                          classList={{
                            "bg-forest text-white shadow-sm": active(),
                            "text-earth/65 hover:text-forest hover:bg-forest/5": !active(),
                          }}
                        >
                          {p}
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>

              <div class="flex-1 min-h-[200px]">
                <Show
                  when={perfChartReady() && perfSeries().length > 1}
                  fallback={
                    <div class="h-full flex flex-col items-center justify-center text-earth/40 font-outfit text-sm italic py-10">
                      <span class="material-icons !text-4xl text-forest/15 mb-3">
                        {perfChartReady() ? "analytics" : "hourglass_empty"}
                      </span>
                      {perfChartReady()
                        ? "Add a holding to see your trend"
                        : "Loading chart..."}
                    </div>
                  }
                >
                  <SolidApexCharts
                    options={perfOptions()}
                    series={perfSeriesApex()}
                    type="area"
                    height="100%"
                    width="100%"
                  />
                </Show>
              </div>
            </div>

          </div>

        </section>

        {/* Main Section: Quick Update Sheet */}
        <section class="bg-white rounded-2xl border border-forest/10 shadow-sm flex flex-col overflow-hidden">
          
          {/* Table Header Control Bar */}
          <div class="p-4 border-b border-forest/5 flex justify-between items-center bg-white/60 backdrop-blur-sm">
            <div class="flex items-center gap-3">
              <button 
                onClick={() => {
                  setNewCurrency("USD");
                  setNewConversionRate(getUsdRate());
                  setShowAddModal(true);
                }}
                class="bg-forest text-white font-outfit text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 hover:bg-forest/90 transition-all shadow-sm hover:shadow cursor-pointer"
              >
                <span class="material-icons !text-sm">add</span>
                Add Holding
              </button>
              
              <div class="relative w-64">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-earth !text-sm">search</span>
                <input 
                  type="text" 
                  value={quickPortfolioSearch()}
                  onInput={(e) => setQuickPortfolioSearch(e.currentTarget.value)}
                  placeholder="Filter holdings..." 
                  class="w-full bg-sage/30 border border-transparent rounded-full py-1.5 pl-9 pr-4 font-outfit text-xs text-near-black placeholder:text-earth/60 focus:bg-white focus:border-forest/30 transition-all focus:outline-none"
                />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button 
                onClick={handleExport}
                class="text-earth hover:text-forest border border-forest/10 hover:bg-sage/20 px-3.5 py-1.5 rounded-xl font-outfit text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span class="material-icons !text-sm">file_download</span>
                Export JSON
              </button>
              
              <label class="text-earth hover:text-forest border border-forest/10 hover:bg-sage/20 px-3.5 py-1.5 rounded-xl font-outfit text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
                <span class="material-icons !text-sm">file_upload</span>
                Import JSON
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport}
                  class="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Spreadsheet Grid Table */}
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse whitespace-nowrap">
              <thead class="bg-sage/20 border-b border-forest/5 text-[11px] text-earth">
                <tr>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider w-1/4">Asset</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider w-1/6">Category</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">Quantity</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">Avg Price</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-[90px]">Currency</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-[110px]">Rate</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">Current Price</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">Total Value</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">Gain</th>
                  <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-[100px]">Allocation</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-forest/5 text-xs bg-white">
                <For each={filteredAssets()}>
                  {(asset) => {
                    const cat = getCategory(asset.ticker);
                    const isQtyEditing = () => editingCell()?.ticker === asset.ticker && editingCell()?.field === "qty";
                    const isPriceEditing = () => editingCell()?.ticker === asset.ticker && editingCell()?.field === "avgPrice";
                    const isRateEditing = () => editingCell()?.ticker === asset.ticker && editingCell()?.field === "conversionRate";

                    return (
                      <tr class="hover:bg-sage/10 transition-colors group">
                        
                        {/* Asset Column */}
                        <td class="px-6 py-4 border-r border-transparent group-hover:border-forest/5 transition-colors overflow-hidden">
                          <div class="flex items-center gap-3">
                            <div class="w-7 h-7 rounded-lg bg-sage flex items-center justify-center text-forest overflow-hidden shrink-0">
                              <Show 
                                when={asset.logoUrl} 
                                fallback={<span class="material-icons !text-sm">{getCategoryIcon(cat)}</span>}
                              >
                                <img src={asset.logoUrl} alt={asset.ticker} class="w-full h-full object-cover animate-fade-in" />
                              </Show>
                            </div>
                            <div class="min-w-0">
                              <div class="font-bold text-near-black truncate">{asset.name || asset.ticker}</div>
                              <div class="text-[10px] text-earth uppercase font-semibold">{getDisplayTicker(asset.ticker)}</div>
                            </div>
                          </div>
                        </td>

                        {/* Category Column */}
                        <td class="px-6 py-4 border-r border-transparent group-hover:border-forest/5 transition-colors">
                          <span class="px-2.5 py-0.5 rounded-full bg-sage/50 text-forest text-[10px] font-bold">
                            {cat}
                          </span>
                        </td>

                        {/* Quantity Column (Editable) */}
                        <Show 
                          when={isQtyEditing()} 
                          fallback={
                            <td 
                              onClick={() => startEdit(asset.ticker, "qty", asset.totalShares)}
                              class="px-6 py-4 text-right font-mono text-near-black font-semibold hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                            >
                              {parseFloat(asset.totalShares.toFixed(8)).toString()}
                            </td>
                          }
                        >
                          <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner">
                            <div class="flex items-center justify-end">
                              <input
                                ref={qtyInputRef}
                                type="number"
                                step="any"
                                autocomplete="off"
                                value={editValue()}
                                onInput={(e) => setEditValue(e.currentTarget.value)}
                                onBlur={() => saveEdit(asset.ticker, "qty")}
                                onKeyDown={(e) => handleKeyDown(e, asset.ticker, "qty")}
                                class="w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                              />
                            </div>
                            <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">Edit</div>
                          </td>
                        </Show>

                        {/* Avg Buy Price Column (Editable) */}
                        <Show
                          when={isPriceEditing()}
                          fallback={
                            <td
                              onClick={() => startEdit(asset.ticker, "avgPrice", asset.averagePrice)}
                              class="px-6 py-4 text-right font-mono text-earth hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                            >
                              {formatVal(asset.averagePrice)}
                            </td>
                          }
                        >
                          <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner">
                            <div class="flex items-center justify-end">
                              <input
                                ref={priceInputRef}
                                type="number"
                                step="any"
                                autocomplete="off"
                                value={editValue()}
                                onInput={(e) => setEditValue(e.currentTarget.value)}
                                onBlur={() => saveEdit(asset.ticker, "avgPrice")}
                                onKeyDown={(e) => handleKeyDown(e, asset.ticker, "avgPrice")}
                                class="w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                              />
                            </div>
                            <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">Edit</div>
                          </td>
                        </Show>

                        {/* Currency Column (read-only) */}
                        <td class="px-6 py-4 text-right font-mono text-earth border-r border-transparent group-hover:border-forest/5 transition-colors">
                          {asset.currency || "USD"}
                        </td>

                        {/* Conversion Rate Column (Editable) */}
                        <Show
                          when={isRateEditing()}
                          fallback={
                            <td
                              onClick={() => startEdit(asset.ticker, "conversionRate", asset.conversionRate ?? 1)}
                              class="px-6 py-4 text-right font-mono text-earth hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                            >
                              {(asset.conversionRate ?? 1).toFixed(2)}
                            </td>
                          }
                        >
                          <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner">
                            <div class="flex items-center justify-end">
                              <input
                                ref={rateInputRef}
                                type="number"
                                step="any"
                                min="1"
                                autocomplete="off"
                                value={editValue()}
                                onInput={(e) => setEditValue(e.currentTarget.value)}
                                onBlur={() => saveEdit(asset.ticker, "conversionRate")}
                                onKeyDown={(e) => handleKeyDown(e, asset.ticker, "conversionRate")}
                                class="w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                              />
                            </div>
                            <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">Edit</div>
                          </td>
                        </Show>

                        {/* Current Price Column */}
                        <td class="px-6 py-4 text-right font-mono text-near-black font-bold border-r border-transparent group-hover:border-forest/5 transition-colors">
                          {formatVal(asset.currentPrice)}
                        </td>

                        {/* Total Value Column */}
                        <td class="px-6 py-4 text-right font-mono text-near-black font-bold border-r border-transparent group-hover:border-forest/5 transition-colors">
                          {formatVal(asset.currentValue)}
                        </td>

                        {/* P/L ($/%) Column */}
                        <td class="px-6 py-4 text-right border-r border-transparent group-hover:border-forest/5 transition-colors">
                          <div class="flex flex-col items-end">
                            <span class="font-mono font-bold" classList={{ "text-forest": asset.totalGainLoss >= 0, "text-red-600": asset.totalGainLoss < 0 }}>
                              {asset.totalGainLoss >= 0 ? "+" : ""}{formatVal(asset.totalGainLoss)}
                            </span>
                            <span class="text-[10px] font-mono font-bold" classList={{ "text-forest": asset.totalGainLoss >= 0, "text-red-600": asset.totalGainLoss < 0 }}>
                              {asset.averagePrice > 0 ? formatPercent(asset.totalGainLoss / (asset.totalShares * asset.averagePrice)) : "0.00%"}
                            </span>
                          </div>
                        </td>

                        {/* Allocation Column */}
                        <td class="px-6 py-4 text-right">
                          <div class="flex items-center justify-end gap-2">
                            <div class="flex-1 max-w-[80px]">
                              {(() => {
                                const alloc = (asset.currentValue / (totalValue() || 1)) * 100;
                                return (
                                  <>
                                    <div class="w-full bg-sage/60 rounded-full h-1.5 mb-1 overflow-hidden border border-forest/30">
                                      <div class="bg-forest h-1.5 rounded-full" style={{ width: `${alloc}%` }} />
                                    </div>
                                    <div class="text-right text-[10px] text-earth font-mono">{alloc.toFixed(1)}%</div>
                                  </>
                                );
                              })()}
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteHolding(asset.ticker)}
                              disabled={isSubmitting()}
                              class="opacity-0 group-hover:opacity-100 transition-opacity text-earth/40 hover:text-red-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
                              title="Remove holding"
                            >
                              <span class="material-icons !text-sm">delete</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  }}
                </For>

                {/* New Row Template — placeholder OR inline draft (no DB write until committed) */}
                <Show
                  when={newRowDraft()}
                  fallback={
                    <tr
                      class="hover:bg-sage/10 transition-colors group opacity-75 hover:opacity-100"
                    >
                      <td
                        colspan="10"
                        class="px-6 py-3 cursor-pointer"
                        classList={{ "cursor-not-allowed": isSubmitting() }}
                        onClick={() => openNewRowDraft()}
                      >
                        <div class="flex items-center gap-3">
                          <div class="w-7 h-7 rounded-lg bg-sage/50 flex items-center justify-center text-forest/40 shrink-0">
                            <span class="material-icons !text-sm">add</span>
                          </div>
                          <span class="font-bold text-earth/50 italic hover:text-forest text-[11px]">
                            + Add Asset (fill ticker, quantity, buy price, currency & conversion rate)
                          </span>
                        </div>
                      </td>
                    </tr>
                  }
                >
                  {(draft) => {
                    const update = (patch: Partial<NewRowDraft>) =>
                      setNewRowDraft({ ...draft(), ...patch });
                    return (
                      <tr class="bg-sage/15 border-y-2 border-dashed border-forest/30">
                        {/* Asset / Ticker */}
                        <td class="px-6 py-3 border-r border-forest/5">
                          <div class="flex items-center gap-3">
                            <div class="w-7 h-7 rounded-lg bg-forest text-white flex items-center justify-center shrink-0">
                              <span class="material-icons !text-sm">edit</span>
                            </div>
                            <input
                              ref={newRowTickerRef}
                              type="text"
                              placeholder="TICKER"
                              autocomplete="off"
                              autocapitalize="characters"
                              spellcheck={false}
                              disabled={isSubmitting()}
                              value={draft().ticker}
                              onInput={(e) => update({ ticker: e.currentTarget.value.toUpperCase() })}
                              onKeyDown={(e) => handleNewRowDraftKeyDown(e, "ticker")}
                              class="bg-white border border-forest/30 rounded px-2 py-1 font-bold text-near-black text-xs w-24 uppercase focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                            />
                          </div>
                        </td>

                        {/* Category preview */}
                        <td class="px-6 py-3 border-r border-forest/5">
                          <span
                            class="px-2.5 py-0.5 rounded-full bg-sage/50 text-forest text-[10px] font-bold"
                            classList={{ "opacity-30": !draft().ticker }}
                          >
                            {draft().ticker ? getCategory(draft().ticker) : "—"}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td class="px-6 py-3 text-right border-r border-forest/5">
                          <input
                            ref={newRowQtyRef}
                            type="number"
                            step="0.00000001"
                            min="0"
                            placeholder="0.00"
                            autocomplete="off"
                            disabled={isSubmitting()}
                            value={draft().qty}
                            onInput={(e) => update({ qty: e.currentTarget.value })}
                            onKeyDown={(e) => handleNewRowDraftKeyDown(e, "qty")}
                            class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-24 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                          />
                        </td>

                        {/* Avg Buy Price */}
                        <td class="px-6 py-3 text-right border-r border-forest/5">
                          <input
                            ref={newRowPriceRef}
                            type="number"
                            step="0.00000001"
                            min="0"
                            placeholder="0.00"
                            autocomplete="off"
                            disabled={isSubmitting()}
                            value={draft().avgPrice}
                            onInput={(e) => update({ avgPrice: e.currentTarget.value })}
                            onKeyDown={(e) => handleNewRowDraftKeyDown(e, "avgPrice")}
                            class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-24 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                          />
                        </td>

                        {/* Currency */}
                        <td class="px-6 py-3 text-right border-r border-forest/5">
                          <select
                            ref={newRowCurrencyRef}
                            disabled={isSubmitting()}
                            value={draft().currency}
                            onChange={(e) => {
                              const c = e.currentTarget.value;
                              update({
                                currency: c,
                                conversionRate: c === "IDR" ? "1" : getUsdRate().toFixed(2),
                              });
                            }}
                            onKeyDown={(e) => handleNewRowDraftKeyDown(e, "currency")}
                            class="bg-white border border-forest/30 rounded px-1.5 py-1 font-mono text-near-black text-xs w-20 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                          >
                            <option value="USD">USD</option>
                            <option value="IDR">IDR</option>
                          </select>
                        </td>

                        {/* Conversion Rate */}
                        <td class="px-6 py-3 text-right border-r border-forest/5">
                          <input
                            ref={newRowRateRef}
                            type="number"
                            step="any"
                            min="1"
                            placeholder={draft().currency === "IDR" ? "1" : getUsdRate().toFixed(2)}
                            autocomplete="off"
                            disabled={isSubmitting() || draft().currency === "IDR"}
                            value={draft().conversionRate}
                            onInput={(e) => update({ conversionRate: e.currentTarget.value })}
                            onKeyDown={(e) => handleNewRowDraftKeyDown(e, "conversionRate")}
                            class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-24 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 disabled:bg-sage/30 disabled:text-earth/60"
                          />
                        </td>

                        {/* Current Price / Total Value / P/L — placeholders */}
                        <td class="px-6 py-3 text-right font-mono text-earth/30 border-r border-forest/5">—</td>
                        <td class="px-6 py-3 text-right font-mono text-earth/30 border-r border-forest/5">—</td>
                        <td class="px-6 py-3 text-right font-mono text-earth/30 border-r border-forest/5">—</td>

                        {/* Save / Cancel */}
                        <td class="px-6 py-3 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <Show
                              when={!isSubmitting()}
                              fallback={
                                <span class="flex items-center gap-1 text-[9px] text-forest font-outfit font-bold uppercase tracking-wider">
                                  <span class="w-3 h-3 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
                                  Saving…
                                </span>
                              }
                            >
                              <button
                                type="button"
                                onClick={commitNewRowDraft}
                                class="bg-forest text-white rounded-lg p-1.5 hover:bg-forest/90 transition-colors shadow-sm cursor-pointer"
                                title="Save holding (Enter)"
                              >
                                <span class="material-icons !text-sm leading-none">check</span>
                              </button>
                              <button
                                type="button"
                                onClick={cancelNewRowDraft}
                                class="bg-earth/15 text-earth rounded-lg p-1.5 hover:bg-earth/25 transition-colors cursor-pointer"
                                title="Cancel (Esc)"
                              >
                                <span class="material-icons !text-sm leading-none">close</span>
                              </button>
                            </Show>
                          </div>
                        </td>
                      </tr>
                    );
                  }}
                </Show>
              </tbody>

              {/* Total Row */}
              <tfoot class="bg-sage/10 border-t-2 border-forest/10 font-outfit text-xs font-bold text-near-black">
                <tr>
                  <td class="px-6 py-4" colspan="2">Cash Balance</td>
                  <Show
                    when={isCashEditing()}
                    fallback={
                      <td
                        onClick={() => {
                          setIsCashEditing(true);
                          const val = currencyView() === "IDR" ? cashBalance() * getPortfolioRate() : cashBalance();
                          setEditValue(val.toFixed(2));
                          setTimeout(() => {
                            cashInputRef?.focus();
                            cashInputRef?.select();
                          }, 50);
                        }}
                        class="px-6 py-4 text-right font-mono hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                        colspan="6"
                      >
                        {formatCash(cashBalance())}
                      </td>
                    }
                  >
                    <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner" colspan="6">
                      <div class="flex items-center justify-end">
                        <input
                          ref={cashInputRef}
                          type="number"
                          step="any"
                          autocomplete="off"
                          value={editValue()}
                          onInput={(e) => setEditValue(e.currentTarget.value)}
                          onBlur={saveCashEdit}
                          onKeyDown={handleCashKeyDown}
                          class="w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                        />
                      </div>
                      <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">Edit</div>
                    </td>
                  </Show>
                  <td class="px-6 py-4 text-right font-mono" colspan="2">
                    {((cashValueUSD() / (totalValue() || 1)) * 100).toFixed(1)}% of total
                  </td>
                </tr>
                <tr class="bg-sage/20 border-t border-forest/10 text-sm">
                  <td class="px-6 py-4 font-bold" colspan="7">Total Holdings Value</td>
                  <td class="px-6 py-4 text-right font-mono font-extrabold">{formatVal(totalValue())}</td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex flex-col items-end">
                      <span class="font-mono font-extrabold" classList={{ "text-forest": overallPL() >= 0, "text-red-600": overallPL() < 0 }}>
                        {overallPL() >= 0 ? "+" : ""}{formatVal(overallPL())}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right font-mono text-xs">
                    {formatPercent(overallPLPercent())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom margin spacer */}
          <div class="h-2 bg-transparent" />

        </section>
      </Show>

      {/* --- ADD HOLDING MODAL --- */}
      <Show when={showAddModal()}>
        <div 
          onClick={() => setShowAddModal(false)}
          class="fixed inset-0 z-50 flex items-center justify-center bg-forest/30 backdrop-blur-xs p-6"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative flex flex-col border border-forest/10 animate-scale-in"
          >
            <div class="absolute top-0 left-0 w-full h-1.5 bg-forest"></div>
            <h3 class="text-xl font-cormorant text-forest font-bold mb-4">Add Asset Holding</h3>
            
            <form onSubmit={handleAddHoldingSubmit} class="flex flex-col gap-4">
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Ticker Symbol</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. MSFT, GOOG, ETH-USD"
                  value={newTicker()}
                  onInput={(e) => setNewTicker(e.currentTarget.value.toUpperCase())}
                  class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Quantity</label>
                  <input 
                    type="number" 
                    step="0.00000001"
                    required
                    min="0"
                    placeholder="0.00"
                    value={newQty() || ""}
                    onInput={(e) => setNewQty(parseFloat(e.currentTarget.value))}
                    class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Avg Buy Price</label>
                  <input 
                    type="number" 
                    step="0.00000001"
                    required
                    min="0"
                    placeholder="$0.00"
                    value={newPrice() || ""}
                    onInput={(e) => setNewPrice(parseFloat(e.currentTarget.value))}
                    class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Currency</label>
                  <select
                    value={newCurrency()}
                    onChange={(e) => {
                      const c = e.currentTarget.value;
                      setNewCurrency(c);
                      setNewConversionRate(c === "IDR" ? 1 : getUsdRate());
                    }}
                    class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="IDR">IDR</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Conversion Rate</label>
                  <input 
                    type="number"
                    step="any"
                    required
                    min="1"
                    placeholder={newCurrency() === "IDR" ? "1" : getUsdRate().toFixed(2)}
                    value={newConversionRate() ?? ""}
                    onInput={(e) => setNewConversionRate(parseFloat(e.currentTarget.value))}
                    class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
                  />
                </div>
              </div>

              <div class="flex gap-3 justify-end mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  class="px-4 py-2 text-xs font-bold text-earth hover:text-forest transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting()}
                  class="px-5 py-2 text-xs font-bold bg-forest text-white rounded-lg hover:brightness-95 transition-all shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Show when={isSubmitting()} fallback="ADD POSITION">
                    <div class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-1" />
                    ADDING...
                  </Show>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
