export interface MarketCapItem {
  rank: number;
  ticker: string;
  name: string;
  logoUrl?: string;
  category: "US" | "IDX" | "Crypto" | "Commodity";
  price: number;
  currency: string;
  dayChangePct: number;
  marketCap: number; // in USD
  peRatio?: number | null;
  psRatio?: number | null;
  pbRatio?: number | null;
  evEbitda?: number | null;
  roe?: number | null;
  netMargin?: number | null;
  dividendYield?: number | null;
}

export type SortField =
  | "rank"
  | "name"
  | "price"
  | "dayChangePct"
  | "marketCap"
  | "peRatio"
  | "psRatio"
  | "pbRatio"
  | "evEbitda"
  | "roe"
  | "dividendYield";

export interface SortColumnConfig {
  field: SortField;
  label: string;
  align: "left" | "right";
  paddingClass: string;
}

export const SORT_COLUMNS: SortColumnConfig[] = [
  { field: "name", label: "Asset", align: "left", paddingClass: "px-6" },
  { field: "price", label: "Price", align: "right", paddingClass: "px-6" },
  { field: "dayChangePct", label: "24h %", align: "right", paddingClass: "px-6" },
  { field: "marketCap", label: "Market Cap", align: "right", paddingClass: "px-6" },
  { field: "peRatio", label: "P/E (TTM)", align: "right", paddingClass: "px-5" },
  { field: "psRatio", label: "P/S", align: "right", paddingClass: "px-5" },
  { field: "pbRatio", label: "P/B", align: "right", paddingClass: "px-5" },
  { field: "evEbitda", label: "EV/EBITDA", align: "right", paddingClass: "px-5" },
  { field: "roe", label: "ROE %", align: "right", paddingClass: "px-5" },
  { field: "dividendYield", label: "Div Yield", align: "right", paddingClass: "px-5" },
];

export const sortMarketCapItems = (
  items: MarketCapItem[],
  field: SortField,
  order: "asc" | "desc",
): MarketCapItem[] => {
  return [...items].sort((a, b) => {
    if (field === "name") {
      const cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      return order === "asc" ? cmp : -cmp;
    }

    const valA = a[field] ?? Number.NEGATIVE_INFINITY;
    const valB = b[field] ?? Number.NEGATIVE_INFINITY;
    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });
};

export const formatMarketCapValue = (
  val: number,
  currencyView: "USD" | "IDR",
  usdRate: number,
): string => {
  if (!val || val <= 0) return "—";
  const rate = currencyView === "IDR" ? usdRate : 1;
  const converted = val * rate;
  const symbol = currencyView === "IDR" ? "Rp " : "$";

  if (converted >= 1e12) return `${symbol}${(converted / 1e12).toFixed(2)}T`;
  if (converted >= 1e9) return `${symbol}${(converted / 1e9).toFixed(2)}B`;
  if (converted >= 1e6) return `${symbol}${(converted / 1e6).toFixed(2)}M`;
  return `${symbol}${converted.toLocaleString()}`;
};

export const formatMarketCapPrice = (
  price: number,
  currency: string,
  currencyView: "USD" | "IDR",
  usdRate: number,
): string => {
  let display = price;
  if (currency === "USD" && currencyView === "IDR") {
    display = price * usdRate;
  } else if (currency === "IDR" && currencyView === "USD") {
    display = price / usdRate;
  }

  if (currencyView === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(display);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(display);
};

export const formatRatioMultiple = (val?: number | null): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return "—";
  return `${val.toFixed(1)}x`;
};

export const formatRatioPercent = (val?: number | null): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return "—";
  return `${(val * 100).toFixed(1)}%`;
};
