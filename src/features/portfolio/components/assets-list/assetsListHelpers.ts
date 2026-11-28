import type { PortfolioAsset } from "../../../../types";
import { getMarketStatus } from "../../../../utils/marketTime";

export type AssetSortKey = "ticker" | "value" | "price" | "gain" | "allocation";
export type SortOrder = "asc" | "desc";
export type WeightFilter = "underweight" | "overweight";

const SORT_BY_KEY = "finly_zen_assets_sort_by";
const SORT_ORDER_KEY = "finly_zen_assets_sort_order";

const VALID_SORT_KEYS: readonly AssetSortKey[] = [
  "ticker",
  "value",
  "price",
  "gain",
  "allocation",
];

export const getSavedSortBy = (): AssetSortKey => {
  try {
    const saved = localStorage.getItem(SORT_BY_KEY);
    if (saved && (VALID_SORT_KEYS as readonly string[]).includes(saved)) {
      return saved as AssetSortKey;
    }
    return "value";
  } catch {
    return "value";
  }
};

export const getSavedSortOrder = (): SortOrder => {
  try {
    const saved = localStorage.getItem(SORT_ORDER_KEY);
    return saved === "asc" || saved === "desc" ? saved : "desc";
  } catch {
    return "desc";
  }
};

export const saveAssetSort = (key: AssetSortKey, order: SortOrder): void => {
  try {
    localStorage.setItem(SORT_BY_KEY, key);
    localStorage.setItem(SORT_ORDER_KEY, order);
  } catch (e) {
    console.warn("localStorage sorting persistence failed:", e);
  }
};

export const getActiveAssetPrice = (
  asset: PortfolioAsset,
  session: string,
): number => {
  if (
    session === "Pre-market" &&
    asset.preMarketPrice != null &&
    !Number.isNaN(asset.preMarketPrice)
  ) {
    return asset.preMarketPrice;
  }
  if (
    session === "After-hours" &&
    asset.afterHoursPrice != null &&
    !Number.isNaN(asset.afterHoursPrice)
  ) {
    return asset.afterHoursPrice;
  }
  return asset.currentPrice ?? 0;
};

export const sortPortfolioAssets = (
  assets: PortfolioAsset[],
  key: AssetSortKey,
  order: SortOrder,
): PortfolioAsset[] => {
  const list = [...assets];
  const { session } = getMarketStatus();

  list.sort((a, b) => {
    if (key === "ticker") {
      const valA = a.ticker.toLowerCase();
      const valB = b.ticker.toLowerCase();
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    }

    const priceA = getActiveAssetPrice(a, session);
    const priceB = getActiveAssetPrice(b, session);

    let valA = 0;
    let valB = 0;

    if (key === "value" || key === "allocation") {
      valA = a.totalShares * priceA;
      valB = b.totalShares * priceB;
    } else if (key === "price") {
      valA = priceA;
      valB = priceB;
    } else if (key === "gain") {
      valA = a.totalShares * priceA - a.totalShares * a.averagePrice;
      valB = b.totalShares * priceB - b.totalShares * b.averagePrice;
    }

    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });

  return list;
};

export const filterPortfolioAssets = (
  assets: PortfolioAsset[],
  filters: Set<string>,
): PortfolioAsset[] => {
  if (filters.size === 0) return assets;

  return assets.filter((asset) => {
    const isUnderweight = asset.targetAllocation > asset.actualAllocation;
    const isOverweight = asset.targetAllocation < asset.actualAllocation;

    if (filters.has("underweight") && isUnderweight) return true;
    if (filters.has("overweight") && isOverweight) return true;
    return false;
  });
};
