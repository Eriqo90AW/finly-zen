import type { DividendEntry } from "../../../types/dividend";

export type FilterTab = "all" | "paid" | "upcoming" | "projected";
export type SortOption = "default" | "yield" | "ttm_yield";
export type DividendDateViewType = "payment_date" | "ex_date" | "cum_date";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "upcoming", label: "Upcoming" },
  { key: "projected", label: "Projected" },
];

export const SORT_OPTIONS: { key: SortOption; label: string; shortLabel: string }[] = [
  { key: "default", label: "Newest Date", shortLabel: "Newest" },
  { key: "yield", label: "Yield", shortLabel: "Yield" },
  { key: "ttm_yield", label: "TTM Yield", shortLabel: "TTM" },
];

export function getDividendEntryKey(d: DividendEntry): string {
  return `${d.ticker}|${d.cum_date}|${d.amount}|${d.payment_date}`;
}

export interface FilterDividendOptions {
  activeTab: FilterTab;
  dateViewType: DividendDateViewType;
  showAllProjected: boolean;
  ignoredKeys: Set<string>;
  tickerFilter: string;
  minAmountFilter: number | null;
  sortBy: SortOption;
  ttmYields: Map<string, number | null>;
}

export function filterAndSortDividends(
  source: DividendEntry[],
  options: FilterDividendOptions,
): DividendEntry[] {
  const list =
    options.activeTab === "all"
      ? source
      : source.filter((d) => d.status === options.activeTab);

  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayMD = `${mm}-${dd}`;
  const query = options.tickerFilter.toLowerCase().trim();

  const result = list.filter((d) => {
    if (options.activeTab === "projected") {
      if (!options.showAllProjected) {
        const dateVal = d[options.dateViewType] || "";
        const valMD = dateVal.slice(5);
        if (valMD && valMD <= todayMD) return false;
      }
      if (options.ignoredKeys.has(getDividendEntryKey(d))) return false;
    }

    if (query && !d.ticker.toLowerCase().includes(query)) return false;

    if (options.minAmountFilter !== null && d.amount < options.minAmountFilter) {
      return false;
    }

    return true;
  });

  if (options.sortBy === "yield") {
    return [...result].sort((a, b) => {
      const yieldA = a.last_price != null && a.last_price > 0 ? a.amount / a.last_price : -1;
      const yieldB = b.last_price != null && b.last_price > 0 ? b.amount / b.last_price : -1;
      return yieldB - yieldA;
    });
  }

  if (options.sortBy === "ttm_yield") {
    return [...result].sort((a, b) => {
      const ttmA = options.ttmYields.get(a.ticker) ?? -1;
      const ttmB = options.ttmYields.get(b.ticker) ?? -1;
      return ttmB - ttmA;
    });
  }

  if (options.activeTab === "upcoming") {
    return [...result].sort((a, b) =>
      (a[options.dateViewType] || "").localeCompare(b[options.dateViewType] || ""),
    );
  }

  if (options.activeTab === "projected") {
    return [...result].sort((a, b) =>
      (a[options.dateViewType] || "").slice(5).localeCompare((b[options.dateViewType] || "").slice(5)),
    );
  }

  return [...result].sort((a, b) =>
    (b[options.dateViewType] || "").localeCompare(a[options.dateViewType] || ""),
  );
}
