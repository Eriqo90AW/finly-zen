import type { PortfolioAsset } from "../../../../types";
import type {
  EditableHoldingField,
  FilterCategoryOption,
  SortKey,
  SortOrder,
} from "../../types";

const STORAGE_HIDE_FX = "finly_zen_quick_portfolio_hide_fx_rate";
const STORAGE_SORT_BY = "finly_zen_quick_portfolio_sort_by";
const STORAGE_SORT_ORDER = "finly_zen_quick_portfolio_sort_order";
const STORAGE_ASSET_TYPE = "finly_zen_quick_portfolio_asset_type_filter";

export const readHideFxRate = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_HIDE_FX) === "true";
  } catch {
    return false;
  }
};

export const saveHideFxRate = (value: boolean): void => {
  try {
    localStorage.setItem(STORAGE_HIDE_FX, String(value));
  } catch {
    // ignore storage errors
  }
};

export const readSortBy = (): SortKey => {
  try {
    return (localStorage.getItem(STORAGE_SORT_BY) as SortKey) || "value";
  } catch {
    return "value";
  }
};

export const readSortOrder = (): SortOrder => {
  try {
    return (localStorage.getItem(STORAGE_SORT_ORDER) as SortOrder) || "desc";
  } catch {
    return "desc";
  }
};

export const saveSortPrefs = (key: SortKey, order: SortOrder): void => {
  try {
    localStorage.setItem(STORAGE_SORT_BY, key);
    localStorage.setItem(STORAGE_SORT_ORDER, order);
  } catch (e) {
    console.warn("localStorage sorting persistence failed:", e);
  }
};

export const readAssetTypeFilter = (): string => {
  try {
    return localStorage.getItem(STORAGE_ASSET_TYPE) || "ALL";
  } catch {
    return "ALL";
  }
};

export const saveAssetTypeFilter = (category: string): void => {
  try {
    localStorage.setItem(STORAGE_ASSET_TYPE, category);
  } catch (e) {
    console.warn("localStorage asset type filter persistence failed:", e);
  }
};

export const getNextSortOrder = (
  currentKey: SortKey,
  currentOrder: SortOrder,
  nextKey: SortKey,
): SortOrder => {
  if (currentKey === nextKey) {
    return currentOrder === "asc" ? "desc" : "asc";
  }
  return nextKey === "asset" ? "asc" : "desc";
};

export const computeCategoryCounts = (
  assets: PortfolioAsset[],
  getCategory: (ticker: string) => string,
): Record<string, number> => {
  const counts: Record<string, number> = { ALL: assets.length };
  for (const a of assets) {
    const cat = getCategory(a.ticker);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
};

export const buildFilterCategories = (
  assets: PortfolioAsset[],
  getCategory: (ticker: string) => string,
  getCategoryIcon: (category: string) => string,
): FilterCategoryOption[] => {
  const standard: FilterCategoryOption[] = [
    { id: "ALL", label: "All", icon: "layers" },
    { id: "Stocks", label: "Stocks", icon: getCategoryIcon("Stocks") },
    { id: "IDX", label: "IDX", icon: getCategoryIcon("IDX") },
    { id: "Crypto", label: "Crypto", icon: getCategoryIcon("Crypto") },
  ];

  const standardIds = new Set(standard.map((s) => s.id));
  const dynamicItems: FilterCategoryOption[] = [];

  for (const a of assets) {
    const cat = getCategory(a.ticker);
    if (cat && !standardIds.has(cat)) {
      standardIds.add(cat);
      dynamicItems.push({
        id: cat,
        label: cat,
        icon: getCategoryIcon(cat),
      });
    }
  }

  return [...standard, ...dynamicItems];
};

export const filterAssets = (
  assets: PortfolioAsset[],
  selectedType: string,
  searchQuery: string,
  getCategory: (ticker: string) => string,
): PortfolioAsset[] => {
  let list = assets;

  if (selectedType !== "ALL") {
    list = list.filter((a) => getCategory(a.ticker) === selectedType);
  }

  const query = searchQuery.toLowerCase().trim();
  if (query) {
    list = list.filter(
      (a) =>
        a.ticker.toLowerCase().includes(query) ||
        (a.name || "").toLowerCase().includes(query),
    );
  }

  return list;
};

const getSortComparable = (asset: PortfolioAsset, key: SortKey): string | number => {
  switch (key) {
    case "asset":
      return (asset.name || asset.ticker).toLowerCase();
    case "qty":
      return asset.totalShares;
    case "avgPrice":
      return asset.averagePrice;
    case "fxRate":
      return asset.conversionRate ?? 1;
    case "currentPrice":
      return asset.currentPrice;
    case "value":
    case "allocation":
      return asset.currentValue;
    case "gain":
      return asset.totalGainLoss;
  }
};

export const sortAssets = (
  assets: PortfolioAsset[],
  key: SortKey,
  order: SortOrder,
): PortfolioAsset[] => {
  return [...assets].sort((a, b) => {
    const valA = getSortComparable(a, key);
    const valB = getSortComparable(b, key);
    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });
};

export const formatEditableStartValue = (
  field: EditableHoldingField,
  currentVal: number,
  currencyView: "USD" | "IDR",
  usdRate: number,
): string => {
  let displayVal = currentVal;
  if (field === "avgPrice" && currencyView === "USD") {
    displayVal = currentVal / usdRate;
  }
  return Number.parseFloat(displayVal.toFixed(8)).toString();
};

export const convertAvgPriceToAssetCurrency = (
  val: number,
  assetCurrency: string,
  currencyView: "USD" | "IDR",
  usdRate: number,
): number => {
  if (assetCurrency === "USD" && currencyView === "IDR") {
    return val / usdRate;
  }
  if (assetCurrency === "IDR" && currencyView === "USD") {
    return val * usdRate;
  }
  return val;
};
