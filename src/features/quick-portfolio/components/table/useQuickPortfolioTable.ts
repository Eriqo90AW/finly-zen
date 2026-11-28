import { createMemo, createSignal } from "solid-js";
import { quickPortfolioSearch, setQuickPortfolioSearch } from "../../../../store/portfolioStore";
import type { PortfolioAsset } from "../../../../types";
import { parseLocaleFloat } from "../../model/quickPortfolioFormatters";
import type {
  EditableHoldingField,
  EditingCell,
  NewRowDraft,
  SortKey,
  SortOrder,
} from "../../types";
import {
  buildFilterCategories,
  computeCategoryCounts,
  convertAvgPriceToAssetCurrency,
  filterAssets,
  formatEditableStartValue,
  getNextSortOrder,
  readAssetTypeFilter,
  readHideFxRate,
  readSortBy,
  readSortOrder,
  saveAssetTypeFilter,
  saveHideFxRate,
  saveSortPrefs,
  sortAssets,
} from "./quickPortfolioTableHelpers";

export interface UseQuickPortfolioTableProps {
  assets: PortfolioAsset[];
  cashBalance: number;
  totalValue: number;
  overallPL: number;
  currencyView: "USD" | "IDR";
  isSubmitting: boolean;
  onSaveQty: (ticker: string, qty: number) => Promise<void>;
  onSavePrice: (ticker: string, price: number) => Promise<void>;
  onSaveRate: (ticker: string, rate: number) => Promise<void>;
  onSaveCash: (newCash: number) => Promise<void>;
  onCreateNewHolding: (
    ticker: string,
    qty: number,
    price: number,
    currency: string,
    conversionRate: number,
  ) => Promise<void>;
  getCategory: (ticker: string) => string;
  getCategoryIcon: (category: string) => string;
  getUsdRate: () => number;
}

export const useQuickPortfolioTable = (props: UseQuickPortfolioTableProps) => {
  const [hideFxRate, setHideFxRate] = createSignal<boolean>(readHideFxRate());
  const [previousHideFxRateState, setPreviousHideFxRateState] = createSignal<boolean | null>(null);
  const [sortBy, setSortBy] = createSignal<SortKey>(readSortBy());
  const [sortOrder, setSortOrder] = createSignal<SortOrder>(readSortOrder());
  const [selectedAssetType, setSelectedAssetType] = createSignal<string>(readAssetTypeFilter());

  const [editingCell, setEditingCell] = createSignal<EditingCell | null>(null);
  const [isCashEditing, setIsCashEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal("");
  const [newRowDraft, setNewRowDraft] = createSignal<NewRowDraft | null>(null);

  const toggleHideFxRate = () => {
    const next = !hideFxRate();
    setHideFxRate(next);
    setPreviousHideFxRateState(null);
    saveHideFxRate(next);
  };

  const handleSort = (key: SortKey) => {
    const nextOrder = getNextSortOrder(sortBy(), sortOrder(), key);
    setSortBy(key);
    setSortOrder(nextOrder);
    saveSortPrefs(key, nextOrder);
  };

  const handleSelectAssetType = (category: string) => {
    setSelectedAssetType(category);
    saveAssetTypeFilter(category);
  };

  const resetFilters = () => {
    setSelectedAssetType("ALL");
    setQuickPortfolioSearch("");
  };

  const categoryCounts = createMemo(() => computeCategoryCounts(props.assets, props.getCategory));
  const filterCategories = createMemo(() =>
    buildFilterCategories(props.assets, props.getCategory, props.getCategoryIcon),
  );
  const filteredAssets = createMemo(() =>
    filterAssets(props.assets, selectedAssetType(), quickPortfolioSearch(), props.getCategory),
  );
  const isFiltered = createMemo(
    () => selectedAssetType() !== "ALL" || Boolean(quickPortfolioSearch().trim()),
  );
  const sortedAssets = createMemo(() => sortAssets(filteredAssets(), sortBy(), sortOrder()));

  const dynamicTotalValue = createMemo(() => {
    if (!isFiltered()) return props.totalValue;
    return filteredAssets().reduce((sum, a) => sum + (a.currentValue || 0), 0);
  });

  const dynamicPL = createMemo(() => {
    if (!isFiltered()) return props.overallPL;
    return filteredAssets().reduce((sum, a) => sum + (a.totalGainLoss || 0), 0);
  });

  const dynamicPLPercent = createMemo(() => {
    const totalCost = filteredAssets().reduce((sum, a) => {
      const cost = a.currentValue - a.totalGainLoss;
      return sum + Math.max(cost, 0);
    }, 0);
    return totalCost > 0 ? dynamicPL() / totalCost : 0;
  });

  const dynamicTotalLabel = createMemo(() => {
    if (selectedAssetType() !== "ALL") return `Total ${selectedAssetType()} Value`;
    if (quickPortfolioSearch().trim()) return "Filtered Holdings Value";
    return "Total Holdings Value";
  });

  const startEdit = (ticker: string, field: EditableHoldingField, currentVal: number) => {
    setEditingCell({ ticker, field });
    setEditValue(
      formatEditableStartValue(field, currentVal, props.currencyView, props.getUsdRate()),
    );
  };

  const saveEdit = async (ticker: string, field: EditableHoldingField) => {
    let val = parseLocaleFloat(editValue());
    if (Number.isNaN(val) || val < 0 || (field === "conversionRate" && val <= 0)) {
      setEditingCell(null);
      return;
    }

    if (field === "avgPrice") {
      const asset = props.assets.find((a) => a.ticker === ticker);
      const assetCurrency = asset?.currency || "USD";
      val = convertAvgPriceToAssetCurrency(
        val,
        assetCurrency,
        props.currencyView,
        props.getUsdRate(),
      );
    }

    const currentEditing = editingCell();
    setEditingCell(null);
    if (!currentEditing) return;

    if (field === "qty") await props.onSaveQty(ticker, val);
    else if (field === "avgPrice") await props.onSavePrice(ticker, val);
    else if (field === "conversionRate") await props.onSaveRate(ticker, val);
  };

  const handleCellKeyDown = (e: KeyboardEvent, ticker: string, field: EditableHoldingField) => {
    if (e.key === "Enter") void saveEdit(ticker, field);
    else if (e.key === "Escape") setEditingCell(null);
  };

  const startCashEdit = () => {
    setIsCashEditing(true);
    const val =
      props.currencyView === "IDR" ? props.cashBalance : props.cashBalance / props.getUsdRate();
    setEditValue(val.toFixed(2));
  };

  const saveCashEdit = async () => {
    let val = parseLocaleFloat(editValue());
    setIsCashEditing(false);
    if (!Number.isNaN(val)) {
      if (props.currencyView === "USD") {
        val = val * props.getUsdRate();
      }
      await props.onSaveCash(val);
    }
  };

  const handleCashKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") void saveCashEdit();
    else if (e.key === "Escape") setIsCashEditing(false);
  };

  const restoreFxVisibility = () => {
    const prev = previousHideFxRateState();
    if (prev !== null) {
      setHideFxRate(prev);
      setPreviousHideFxRateState(null);
    }
  };

  const openNewRowDraft = () => {
    if (props.isSubmitting) return;
    setPreviousHideFxRateState(hideFxRate());
    setHideFxRate(false);
    setNewRowDraft({
      ticker: "",
      qty: "",
      avgPrice: "",
      currency: "USD",
      conversionRate: props.getUsdRate().toFixed(2),
    });
  };

  const cancelNewRowDraft = () => {
    if (props.isSubmitting) return;
    setNewRowDraft(null);
    restoreFxVisibility();
  };

  const commitNewRowDraft = async (
    symbol: string,
    qty: number,
    price: number,
    currency: string,
    conversionRate: number,
  ) => {
    await props.onCreateNewHolding(symbol, qty, price, currency, conversionRate);
    setNewRowDraft(null);
    restoreFxVisibility();
  };

  const updateNewRowDraft = (patch: Partial<NewRowDraft>) => {
    setNewRowDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return {
    hideFxRate,
    sortBy,
    sortOrder,
    selectedAssetType,
    editingCell,
    isCashEditing,
    editValue,
    setEditValue,
    newRowDraft,
    categoryCounts,
    filterCategories,
    isFiltered,
    sortedAssets,
    dynamicTotalValue,
    dynamicPL,
    dynamicPLPercent,
    dynamicTotalLabel,
    toggleHideFxRate,
    handleSort,
    handleSelectAssetType,
    resetFilters,
    startEdit,
    saveEdit,
    handleCellKeyDown,
    startCashEdit,
    saveCashEdit,
    handleCashKeyDown,
    openNewRowDraft,
    cancelNewRowDraft,
    commitNewRowDraft,
    updateNewRowDraft,
  };
};
