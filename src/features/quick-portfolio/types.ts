import type { PortfolioAsset } from "../../types";

export type PerfPeriod = "1D" | "1W" | "1M" | "1Y" | "ALL";
export type AllocationView = "category" | "detail";
export type AllocationBasis = "market" | "cost";
export type AssetCategory = "Stocks" | "IDX" | "Crypto";
export type EditableHoldingField = "qty" | "avgPrice" | "conversionRate";
export type SortKey =
  | "asset"
  | "qty"
  | "avgPrice"
  | "fxRate"
  | "currentPrice"
  | "value"
  | "gain"
  | "allocation";
export type SortOrder = "asc" | "desc";

export interface CategoryPnLItem {
  category: AssetCategory;
  icon: string;
  totalValue: number;
  overallPL: number;
  overallPLPercent: number;
  todayChange: number;
  todayChangePercent: number;
  assetCount: number;
}

export interface CategoryBreakdownValues {
  stocks: number;
  idx: number;
  crypto: number;
  cash: number;
}

export interface PortfolioAllocations {
  stocks: number;
  idx: number;
  crypto: number;
  cash: number;
  market: CategoryBreakdownValues;
  cost: CategoryBreakdownValues;
  marketValues: CategoryBreakdownValues;
  costValues: CategoryBreakdownValues;
  drift: CategoryBreakdownValues;
}

export interface PerfPoint {
  date: number;
  value: number;
}

export interface PerfKpi {
  change: number;
  pct: number;
  isPositive: boolean;
}

export interface PerfSeriesApexItem {
  name: string;
  data: number[];
}

export interface AssetDeleteTarget {
  ticker: string;
  name: string;
}

export interface EditingCell {
  ticker: string;
  field: EditableHoldingField;
}

export interface NewRowDraft {
  ticker: string;
  qty: string;
  avgPrice: string;
  currency: string;
  conversionRate: string;
}

export interface FilterCategoryOption {
  id: string;
  label: string;
  icon: string;
}

export interface CategoryAllocationDisplayItem {
  ticker: string;
  percentage: number;
  costPercentage: number;
  marketValue: number;
  costValue: number;
  drift: number;
  color: string;
}

export type HoldingFormatter = (amount: number, isShort?: boolean) => string;
export type AssetLookup = PortfolioAsset;
