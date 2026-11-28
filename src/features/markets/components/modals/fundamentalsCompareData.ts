import type { StockData } from "../../../../types";
import {
  formatMultiple,
  formatPercent,
  formatUSD,
  formatUSDCompact,
} from "../../../../utils/format";

export interface MetricDefinition {
  label: string;
  category: string;
  getValue: (d: StockData) => { rawValue: number | null | undefined; formatted: string };
  better: "lower" | "higher" | "closer_to_range" | "none";
  range?: [number, number];
  color: string;
}

export const COMPARE_CATEGORIES = [
  { title: "Valuation", icon: "bar_chart" },
  { title: "Profitability", icon: "payments" },
  { title: "Health & Risk", icon: "health_and_safety" },
  { title: "Market Data", icon: "public" },
] as const;

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Valuation
  {
    label: "P/E (TTM)",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.pe_ttm, formatted: formatMultiple(d.valuation.pe_ttm) }),
    better: "lower",
    color: "var(--color-fin-blue)",
  },
  {
    label: "P/E (Forward)",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.pe_forward, formatted: formatMultiple(d.valuation.pe_forward) }),
    better: "lower",
    color: "var(--color-fin-blue)",
  },
  {
    label: "PEG Ratio",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.advanced_ratios.peg_ratio, formatted: d.advanced_ratios.peg_ratio?.toFixed(2) || "N/A" }),
    better: "lower",
    color: "var(--color-fin-purple)",
  },
  {
    label: "P/S (TTM)",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.price_to_sales_ttm, formatted: formatMultiple(d.valuation.price_to_sales_ttm) }),
    better: "lower",
    color: "var(--color-fin-blue)",
  },
  {
    label: "P/B",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.price_to_book, formatted: formatMultiple(d.valuation.price_to_book) }),
    better: "lower",
    color: "var(--color-fin-blue)",
  },
  {
    label: "EV / Revenue",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.advanced_ratios.ev_to_revenue, formatted: formatMultiple(d.advanced_ratios.ev_to_revenue) }),
    better: "lower",
    color: "var(--color-fin-purple)",
  },
  {
    label: "EV / EBITDA",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.ev_to_ebitda, formatted: formatMultiple(d.valuation.ev_to_ebitda) }),
    better: "lower",
    color: "var(--color-fin-purple)",
  },
  // Profitability
  {
    label: "Gross Margin",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.gross_margin, formatted: formatPercent(d.advanced_ratios.gross_margin) }),
    better: "higher",
    color: "var(--color-fin-green)",
  },
  {
    label: "Operating Margin",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.operating_margin, formatted: formatPercent(d.advanced_ratios.operating_margin) }),
    better: "higher",
    color: "var(--color-fin-green)",
  },
  {
    label: "Net Margin",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.net_margin, formatted: formatPercent(d.advanced_ratios.net_margin) }),
    better: "higher",
    color: "var(--color-fin-green)",
  },
  {
    label: "Profit Margin",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.valuation.profit_margin, formatted: formatPercent(d.valuation.profit_margin) }),
    better: "higher",
    color: "var(--color-fin-green)",
  },
  {
    label: "ROE",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.roe, formatted: formatPercent(d.advanced_ratios.roe) }),
    better: "higher",
    color: "var(--color-fin-green)",
  },
  {
    label: "ROA",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.roa, formatted: formatPercent(d.advanced_ratios.roa) }),
    better: "higher",
    color: "var(--color-fin-green)",
  },
  // Health & Risk
  {
    label: "Current Ratio",
    category: "Health & Risk",
    getValue: (d) => ({ rawValue: d.advanced_ratios.current_ratio, formatted: d.advanced_ratios.current_ratio?.toFixed(2) || "N/A" }),
    better: "closer_to_range",
    range: [1.5, 3.0],
    color: "var(--color-fin-amber)",
  },
  {
    label: "Debt / Equity",
    category: "Health & Risk",
    getValue: (d) => ({ rawValue: d.advanced_ratios.debt_to_equity, formatted: d.advanced_ratios.debt_to_equity?.toFixed(2) || "N/A" }),
    better: "lower",
    color: "var(--color-fin-amber)",
  },
  {
    label: "Beta",
    category: "Health & Risk",
    getValue: (d) => ({ rawValue: d.advanced_ratios.beta, formatted: d.advanced_ratios.beta?.toFixed(2) || "N/A" }),
    better: "closer_to_range",
    range: [0.8, 1.2],
    color: "var(--color-earth)",
  },
  {
    label: "Short % of Float",
    category: "Health & Risk",
    getValue: (d) => ({
      rawValue: d.advanced_ratios.short_percent_of_float,
      formatted: d.advanced_ratios.short_percent_of_float != null ? `${(d.advanced_ratios.short_percent_of_float * 100).toFixed(2)}%` : "N/A",
    }),
    better: "lower",
    color: "var(--color-earth)",
  },
  {
    label: "Dividend Yield",
    category: "Health & Risk",
    getValue: (d) => ({
      rawValue: d.advanced_ratios.dividend_yield,
      formatted: d.advanced_ratios.dividend_yield != null ? `${(d.advanced_ratios.dividend_yield * 100).toFixed(2)}%` : "N/A",
    }),
    better: "higher",
    color: "var(--color-fin-green)",
  },
  {
    label: "Dividend Rate",
    category: "Health & Risk",
    getValue: (d) => ({
      rawValue: d.advanced_ratios.dividend_rate,
      formatted: d.advanced_ratios.dividend_rate != null ? formatUSD(d.advanced_ratios.dividend_rate) : "N/A",
    }),
    better: "higher",
    color: "var(--color-fin-green)",
  },
  // Market Data
  {
    label: "Shares Float",
    category: "Market Data",
    getValue: (d) => ({
      rawValue: d.advanced_ratios.float_shares,
      formatted: formatUSDCompact(d.advanced_ratios.float_shares).replace("$", ""),
    }),
    better: "none",
    color: "var(--color-earth)",
  },
];

export function getWinnerIndex(metricDef: MetricDefinition, companies: StockData[]): number | null {
  if (companies.length < 2) return null;

  const validEntries = companies
    .map((c, idx) => ({ v: metricDef.getValue(c).rawValue, idx }))
    .filter((entry): entry is { v: number; idx: number } =>
      entry.v !== null && entry.v !== undefined && !Number.isNaN(entry.v),
    );

  if (validEntries.length === 0) return null;

  if (metricDef.better === "lower") {
    let best = validEntries[0];
    for (let i = 1; i < validEntries.length; i++) {
      if (validEntries[i].v < best.v) best = validEntries[i];
    }
    return best.idx;
  }

  if (metricDef.better === "higher") {
    let best = validEntries[0];
    for (let i = 1; i < validEntries.length; i++) {
      if (validEntries[i].v > best.v) best = validEntries[i];
    }
    return best.idx;
  }

  if (metricDef.better === "closer_to_range" && metricDef.range) {
    const [min, max] = metricDef.range;
    let bestIdx = validEntries[0].idx;
    let bestDist = Math.max(0, min - validEntries[0].v) + Math.max(0, validEntries[0].v - max);

    for (let i = 1; i < validEntries.length; i++) {
      const entry = validEntries[i];
      const dist = Math.max(0, min - entry.v) + Math.max(0, entry.v - max);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = entry.idx;
      }
    }
    return bestIdx;
  }

  return null;
}
