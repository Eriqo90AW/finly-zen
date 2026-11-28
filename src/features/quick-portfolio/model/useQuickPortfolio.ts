import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { ApexOptions } from "apexcharts";
import { portfolioState, refreshPortfolio } from "../../../store/portfolioStore";
import type { Portfolio } from "../../../types";
import { formatPortfolioValue, getUsdRate } from "../../../utils/format";
import { buildPerfChartOptions } from "../components/charts/chartOptions";
import type {
  AllocationView,
  AssetDeleteTarget,
  EditableHoldingField,
  PerfPeriod,
  PerfSeriesApexItem,
} from "../types";
import {
  createInlineHoldingPosition,
  deleteHoldingPosition,
  formatPortfolioExportJson,
  loadOrInitializeQuickPortfolio,
  updateCashBalance,
  updateHoldingPosition,
} from "./quickPortfolioActions";
import {
  computeAllocations,
  computeCategoryPnL,
  computeDetailAllocations,
  computePerfKpi,
  computePerformanceSeries,
  computePortfolioKpis,
} from "./quickPortfolioCalculations";
import {
  formatPortfolioPrice,
  formatRelativeTime,
  getCategory,
  getCategoryIcon,
  getDisplayTicker,
} from "./quickPortfolioFormatters";
import { useAddHoldingForm } from "./useAddHoldingForm";

export const useQuickPortfolio = () => {
  const [quickPortfolio, setQuickPortfolio] = createSignal<Portfolio | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const [assetToDelete, setAssetToDelete] = createSignal<AssetDeleteTarget | null>(null);

  const [lastRefreshedAt, setLastRefreshedAt] = createSignal<number | null>(null);
  const [now, setNow] = createSignal(Date.now());
  const [allocationView, setAllocationView] = createSignal<AllocationView>("category");
  const [perfPeriod, setPerfPeriod] = createSignal<PerfPeriod>("1D");
  const [perfChartReady, setPerfChartReady] = createSignal(false);
  const [isCopied, setIsCopied] = createSignal(false);

  const addForm = useAddHoldingForm(quickPortfolio, setIsSubmitting);

  onMount(() => {
    const tickId = setInterval(() => setNow(Date.now()), 10_000);
    const chartTimer = setTimeout(() => setPerfChartReady(true), 80);
    onCleanup(() => {
      clearInterval(tickId);
      clearTimeout(chartTimer);
    });
  });

  onMount(async () => {
    setIsLoading(true);
    try {
      setQuickPortfolio(await loadOrInitializeQuickPortfolio());
    } catch (err) {
      console.error("Error loading or seeding Quick Portfolio:", err);
    } finally {
      setIsLoading(false);
    }
  });

  createEffect(() => {
    const found = portfolioState.portfolios.find((p) => p.name === "Quick Portfolio");
    if (found) setQuickPortfolio(found);
  });

  createEffect(() => {
    if (!portfolioState.isRefreshing) setLastRefreshedAt(Date.now());
  });

  const currencyView = () => portfolioState.currencyView;

  const formatVal = (amount: number, isShort = false) =>
    formatPortfolioValue(amount, currencyView(), isShort, quickPortfolio()?.nativeCurrency || "IDR");

  const formatPrice = (amount: number) =>
    formatPortfolioPrice(amount, quickPortfolio()?.nativeCurrency || "IDR", currencyView());

  const formatCash = (amount: number, isShort = false) =>
    formatPortfolioValue(amount, currencyView(), isShort, quickPortfolio()?.nativeCurrency || "IDR");

  const lastUpdatedLabel = createMemo(() => formatRelativeTime(lastRefreshedAt(), now()));
  const kpis = createMemo(() => computePortfolioKpis(quickPortfolio()));

  const categoryPnLData = createMemo(() => computeCategoryPnL(quickPortfolio()?.assets || []));
  const allocations = createMemo(() => {
    const k = kpis();
    return computeAllocations(quickPortfolio(), k.totalValue, k.initialCapital, k.cashBalance);
  });
  const detailAllocations = createMemo(() => {
    const k = kpis();
    return computeDetailAllocations(quickPortfolio(), k.totalValue, k.initialCapital, k.cashBalance);
  });
  const perfSeries = createMemo(() => {
    const k = kpis();
    return computePerformanceSeries(quickPortfolio(), k.initialCapital, k.totalValue, perfPeriod());
  });
  const perfKpi = createMemo(() => computePerfKpi(perfSeries()));
  const perfOptions = createMemo<ApexOptions>(() =>
    buildPerfChartOptions(perfSeries(), perfPeriod(), perfSeries, formatVal),
  );
  const perfSeriesApex = createMemo<PerfSeriesApexItem[]>(() => [
    { name: "Portfolio Value", data: perfSeries().map((p) => p.value) },
  ]);

  const updateHolding = async (ticker: string, field: EditableHoldingField, newVal: number) => {
    const p = quickPortfolio();
    if (!p) return;
    setIsSubmitting(true);
    try {
      const updated = await updateHoldingPosition(p, ticker, field, newVal);
      if (updated) setQuickPortfolio(updated);
    } catch (err) {
      console.error("Failed to update holding:", err);
      alert("Failed to update holding. Please check database logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteHolding = (ticker: string) => {
    const asset = quickPortfolio()?.assets.find((a) => a.ticker === ticker);
    if (!asset) return;
    setAssetToDelete({ ticker, name: asset.name || asset.ticker });
    setShowDeleteModal(true);
  };

  const confirmDeleteHolding = async () => {
    const target = assetToDelete();
    const p = quickPortfolio();
    if (!target || !p) return;

    setIsSubmitting(true);
    try {
      const updated = await deleteHoldingPosition(p, target.ticker);
      if (updated) setQuickPortfolio(updated);
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
      const updated = await updateCashBalance(p, newCash);
      if (updated) setQuickPortfolio(updated);
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
    conversionRate: number,
  ) => {
    const symbol = ticker.trim().toUpperCase();
    const p = quickPortfolio();
    if (!symbol || !p) return;

    if (p.assets?.find((a) => a.ticker === symbol)) {
      alert("Asset holding already exists! Use the row to update qty/price instead.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await createInlineHoldingPosition(
        p,
        symbol,
        qty,
        price,
        currency,
        conversionRate,
      );
      if (updated) setQuickPortfolio(updated);
    } catch (err) {
      console.error("Failed to add inline holding:", err);
      alert("Failed to add holding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyJson = async () => {
    const p = quickPortfolio();
    if (!p) return;
    try {
      await navigator.clipboard.writeText(formatPortfolioExportJson(p));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
      alert("Failed to copy JSON to clipboard.");
    }
  };

  const handleRefresh = async () => {
    const p = quickPortfolio();
    if (p) await refreshPortfolio(p.id);
  };

  return {
    quickPortfolio,
    isLoading,
    isSubmitting,
    isRefreshing: () => portfolioState.isRefreshing,
    currencyView,
    lastUpdatedLabel,
    cashBalance: () => kpis().cashBalance,
    totalValue: () => kpis().totalValue,
    initialCapital: () => kpis().initialCapital,
    overallPL: () => kpis().overallPL,
    overallPLPercent: () => kpis().overallPLPercent,
    todayChange: () => kpis().todayChange,
    todayChangePercent: () => kpis().todayChangePercent,
    hasTodayChangeData: () => kpis().hasTodayChangeData,
    distinctAssetCount: () => kpis().distinctAssetCount,
    categoryPnLData,
    allocations,
    allocationView,
    setAllocationView,
    detailAllocations,
    perfPeriod,
    setPerfPeriod,
    perfSeries,
    perfKpi,
    perfOptions,
    perfSeriesApex,
    perfChartReady,
    isCopied,
    showDeleteModal,
    setShowDeleteModal,
    assetToDelete,
    ...addForm,
    formatVal,
    formatPrice,
    formatCash,
    getCategory,
    getCategoryIcon,
    getDisplayTicker,
    getUsdRate,
    saveQty: (ticker: string, qty: number) => updateHolding(ticker, "qty", qty),
    savePrice: (ticker: string, price: number) => updateHolding(ticker, "avgPrice", price),
    saveRate: (ticker: string, rate: number) => updateHolding(ticker, "conversionRate", rate),
    requestDeleteHolding,
    confirmDeleteHolding,
    saveCash,
    createNewHolding,
    handleCopyJson,
    handleRefresh,
  };
};
