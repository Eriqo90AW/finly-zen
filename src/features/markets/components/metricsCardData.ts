import type { MetricCategory, StockData } from "../../../types";
import { formatMultiple, formatPercent, formatUSD, formatUSDCompact } from "../../../utils/format";

export const buildMetricCategories = (data: StockData): MetricCategory[] => {
  const valuation = data.valuation;
  const advancedRatios = data.advanced_ratios;

  return [
    {
      title: "Valuation",
      icon: "bar_chart",
      metrics: [
        {
          label: "P/E (TTM)",
          value: valuation?.pe_ttm != null ? formatMultiple(valuation.pe_ttm) : "N/A",
          rawValue: valuation?.pe_ttm,
          color: "var(--color-fin-blue)",
          tooltipPosition: "bottom",
        },
        {
          label: "P/E (Forward)",
          value: valuation?.pe_forward != null ? formatMultiple(valuation.pe_forward) : "N/A",
          rawValue: valuation?.pe_forward,
          color: "var(--color-fin-blue)",
          tooltipPosition: "bottom",
        },
        {
          label: "PEG Ratio",
          value: advancedRatios?.peg_ratio != null ? advancedRatios.peg_ratio.toFixed(2) : "N/A",
          rawValue: advancedRatios?.peg_ratio,
          color: "var(--color-fin-purple)",
        },
        {
          label: "P/S (TTM)",
          value:
            valuation?.price_to_sales_ttm != null
              ? formatMultiple(valuation.price_to_sales_ttm)
              : "N/A",
          rawValue: valuation?.price_to_sales_ttm,
          color: "var(--color-fin-blue)",
        },
        {
          label: "P/B",
          value: valuation?.price_to_book != null ? formatMultiple(valuation.price_to_book) : "N/A",
          rawValue: valuation?.price_to_book,
          color: "var(--color-fin-blue)",
        },
        {
          label: "EV / Revenue",
          value:
            advancedRatios?.ev_to_revenue != null
              ? formatMultiple(advancedRatios.ev_to_revenue)
              : "N/A",
          rawValue: advancedRatios?.ev_to_revenue,
          color: "var(--color-fin-purple)",
        },
        {
          label: "EV / EBITDA",
          value: valuation?.ev_to_ebitda != null ? formatMultiple(valuation.ev_to_ebitda) : "N/A",
          rawValue: valuation?.ev_to_ebitda,
          color: "var(--color-fin-purple)",
        },
      ],
    },
    {
      title: "Profitability",
      icon: "payments",
      metrics: [
        {
          label: "Gross Margin",
          value:
            advancedRatios?.gross_margin != null
              ? formatPercent(advancedRatios.gross_margin)
              : "N/A",
          rawValue: advancedRatios?.gross_margin,
          color: "var(--color-fin-green)",
        },
        {
          label: "Operating Margin",
          value:
            advancedRatios?.operating_margin != null
              ? formatPercent(advancedRatios.operating_margin)
              : "N/A",
          rawValue: advancedRatios?.operating_margin,
          color: "var(--color-fin-green)",
        },
        {
          label: "Net Margin",
          value:
            advancedRatios?.net_margin != null ? formatPercent(advancedRatios.net_margin) : "N/A",
          rawValue: advancedRatios?.net_margin,
          color: "var(--color-fin-green)",
        },
        {
          label: "Profit Margin",
          value: valuation?.profit_margin != null ? formatPercent(valuation.profit_margin) : "N/A",
          rawValue: valuation?.profit_margin,
          color: "var(--color-fin-green)",
        },
        {
          label: "ROE",
          value: advancedRatios?.roe != null ? formatPercent(advancedRatios.roe) : "N/A",
          rawValue: advancedRatios?.roe,
          color: "var(--color-fin-green)",
        },
        {
          label: "ROA",
          value: advancedRatios?.roa != null ? formatPercent(advancedRatios.roa) : "N/A",
          rawValue: advancedRatios?.roa,
          color: "var(--color-fin-green)",
        },
      ],
    },
    {
      title: "Health & Risk",
      icon: "health_and_safety",
      metrics: [
        {
          label: "Current Ratio",
          value:
            advancedRatios?.current_ratio != null ? advancedRatios.current_ratio.toFixed(2) : "N/A",
          rawValue: advancedRatios?.current_ratio,
          color: "var(--color-fin-amber)",
        },
        {
          label: "Debt / Equity",
          value:
            advancedRatios?.debt_to_equity != null
              ? advancedRatios.debt_to_equity.toFixed(2)
              : "N/A",
          rawValue: advancedRatios?.debt_to_equity,
          color:
            (advancedRatios?.debt_to_equity ?? 0) > 2
              ? "var(--color-fin-red)"
              : "var(--color-fin-amber)",
        },
        {
          label: "Beta",
          value: advancedRatios?.beta != null ? advancedRatios.beta.toFixed(2) : "N/A",
          rawValue: advancedRatios?.beta,
          color: "var(--color-earth)",
        },
        {
          label: "Short % of Float",
          value:
            advancedRatios?.short_percent_of_float != null
              ? `${(advancedRatios.short_percent_of_float * 100).toFixed(2)}%`
              : "N/A",
          rawValue: advancedRatios?.short_percent_of_float,
          color: "var(--color-earth)",
        },
        {
          label: "Dividend Yield",
          value:
            advancedRatios?.dividend_yield != null
              ? `${(advancedRatios.dividend_yield * 100).toFixed(2)}%`
              : "N/A",
          rawValue: advancedRatios?.dividend_yield,
          color: "var(--color-fin-green)",
        },
        {
          label: "Dividend Rate",
          value:
            advancedRatios?.dividend_rate != null
              ? formatUSD(advancedRatios.dividend_rate)
              : "N/A",
          rawValue: advancedRatios?.dividend_rate,
          color: "var(--color-fin-green)",
        },
      ],
    },
    {
      title: "Market Data",
      icon: "public",
      metrics: [
        {
          label: "Shares Float",
          value:
            advancedRatios?.float_shares != null
              ? formatUSDCompact(advancedRatios.float_shares).replace("$", "")
              : "N/A",
          rawValue: advancedRatios?.float_shares,
          color: "var(--color-earth)",
        },
      ],
    },
  ];
};

export interface MetricSignalPresentation {
  rowClass: string;
  badgeClass: string;
  icon: string;
  overlayClass: string;
}

export const getMetricSignalPresentation = (
  value: string,
  signal: "good" | "bad" | "neutral",
): MetricSignalPresentation => {
  if (value === "N/A") {
    return {
      rowClass: "bg-white/40 border-forest/5 hover:border-forest/20",
      badgeClass: "bg-neutral-100 text-neutral-500 border-neutral-200/50",
      icon: "-",
      overlayClass: "bg-neutral-500",
    };
  }

  switch (signal) {
    case "good":
      return {
        rowClass:
          "bg-emerald-500/8 border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]",
        badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
        icon: "✅",
        overlayClass: "bg-emerald-500",
      };
    case "bad":
      return {
        rowClass:
          "bg-rose-500/8 border-rose-500/10 hover:border-rose-500/30 hover:bg-rose-500/[0.04]",
        badgeClass: "bg-rose-500/15 text-rose-700 border-rose-500/20",
        icon: "🔴",
        overlayClass: "bg-rose-500",
      };
    default:
      return {
        rowClass:
          "bg-amber-500/8 border-amber-500/10 hover:border-amber-500/30 hover:bg-amber-500/[0.04]",
        badgeClass: "bg-amber-500/15 text-amber-700 border-amber-500/20",
        icon: "⚠️",
        overlayClass: "bg-amber-500",
      };
  }
};
