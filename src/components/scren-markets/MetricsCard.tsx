import { For, createMemo } from "solid-js";
import { formatUSD, formatUSDCompact, formatPercent, formatMultiple } from "../../utils/format";
import type { MetricsCardProps, LocalMetric, MetricCategory } from "../../types";
import { evaluateMetric } from "../../utils/metricEvaluator";
import { Tooltip } from "../modules/Tooltip";

export const MetricsCard = (props: MetricsCardProps) => {
  const categories = createMemo<MetricCategory[]>(() => [
    {
      title: "Valuation",
      icon: "bar_chart",
      metrics: [
        { 
          label: "P/E (TTM)", 
          value: formatMultiple(props.data.valuation.pe_ttm), 
          rawValue: props.data.valuation.pe_ttm,
          color: "var(--color-fin-blue)",
          tooltipPosition: "bottom" as const
        },
        { 
          label: "P/E (Forward)", 
          value: formatMultiple(props.data.valuation.pe_forward), 
          rawValue: props.data.valuation.pe_forward,
          color: "var(--color-fin-blue)",
          tooltipPosition: "bottom" as const
        },
        { 
          label: "PEG Ratio", 
          value: props.data.advanced_ratios.peg_ratio?.toFixed(2) || "N/A", 
          rawValue: props.data.advanced_ratios.peg_ratio,
          color: "var(--color-fin-purple)" 
        },
        { 
          label: "P/S (TTM)", 
          value: formatMultiple(props.data.valuation.price_to_sales_ttm), 
          rawValue: props.data.valuation.price_to_sales_ttm,
          color: "var(--color-fin-blue)" 
        },
        { 
          label: "P/B", 
          value: formatMultiple(props.data.valuation.price_to_book), 
          rawValue: props.data.valuation.price_to_book,
          color: "var(--color-fin-blue)" 
        },
        { 
          label: "EV / Revenue", 
          value: formatMultiple(props.data.advanced_ratios.ev_to_revenue), 
          rawValue: props.data.advanced_ratios.ev_to_revenue,
          color: "var(--color-fin-purple)" 
        },
        { 
          label: "EV / EBITDA", 
          value: formatMultiple(props.data.valuation.ev_to_ebitda), 
          rawValue: props.data.valuation.ev_to_ebitda,
          color: "var(--color-fin-purple)" 
        },
      ]
    },
    {
      title: "Profitability",
      icon: "payments",
      metrics: [
        { 
          label: "Gross Margin", 
          value: formatPercent(props.data.advanced_ratios.gross_margin), 
          rawValue: props.data.advanced_ratios.gross_margin,
          color: "var(--color-fin-green)" 
        },
        { 
          label: "Operating Margin", 
          value: formatPercent(props.data.advanced_ratios.operating_margin), 
          rawValue: props.data.advanced_ratios.operating_margin,
          color: "var(--color-fin-green)" 
        },
        { 
          label: "Net Margin", 
          value: formatPercent(props.data.advanced_ratios.net_margin), 
          rawValue: props.data.advanced_ratios.net_margin,
          color: "var(--color-fin-green)" 
        },
        { 
          label: "Profit Margin", 
          value: formatPercent(props.data.valuation.profit_margin), 
          rawValue: props.data.valuation.profit_margin,
          color: "var(--color-fin-green)" 
        },
        { 
          label: "ROE", 
          value: formatPercent(props.data.advanced_ratios.roe), 
          rawValue: props.data.advanced_ratios.roe,
          color: "var(--color-fin-green)" 
        },
        { 
          label: "ROA", 
          value: formatPercent(props.data.advanced_ratios.roa), 
          rawValue: props.data.advanced_ratios.roa,
          color: "var(--color-fin-green)" 
        },
      ]
    },
    {
      title: "Health & Risk",
      icon: "health_and_safety",
      metrics: [  
        { 
          label: "Current Ratio", 
          value: props.data.advanced_ratios.current_ratio?.toFixed(2) || "N/A", 
          rawValue: props.data.advanced_ratios.current_ratio,
          color: "var(--color-fin-amber)" 
        },
        { 
          label: "Debt / Equity", 
          value: props.data.advanced_ratios.debt_to_equity?.toFixed(2) || "N/A", 
          rawValue: props.data.advanced_ratios.debt_to_equity,
          color: (props.data.advanced_ratios.debt_to_equity ?? 0) > 2 ? "var(--color-fin-red)" : "var(--color-fin-amber)" 
        },
        { 
          label: "Beta", 
          value: props.data.advanced_ratios.beta?.toFixed(2) || "N/A", 
          rawValue: props.data.advanced_ratios.beta,
          color: "var(--color-earth)" 
        },
        { 
          label: "Short % of Float", 
          value: props.data.advanced_ratios.short_percent_of_float != null 
            ? (props.data.advanced_ratios.short_percent_of_float * 100).toFixed(2) + "%" 
            : "N/A", 
          rawValue: props.data.advanced_ratios.short_percent_of_float,
          color: "var(--color-earth)" 
        },
        { 
          label: "Dividend Yield", 
          value: props.data.advanced_ratios.dividend_yield != null 
            ? (props.data.advanced_ratios.dividend_yield * 100).toFixed(2) + "%" 
            : "N/A", 
          rawValue: props.data.advanced_ratios.dividend_yield,
          color: "var(--color-fin-green)" 
        },
        { 
          label: "Dividend Rate", 
          value: props.data.advanced_ratios.dividend_rate != null 
            ? formatUSD(props.data.advanced_ratios.dividend_rate) 
            : "N/A", 
          rawValue: props.data.advanced_ratios.dividend_rate,
          color: "var(--color-fin-green)" 
        },
      ]
    },
    {
      title: "Market Data",
      icon: "public",
      metrics: [
        { 
          label: "Shares Float", 
          value: formatUSDCompact(props.data.advanced_ratios.float_shares).replace("$", ""), 
          rawValue: props.data.advanced_ratios.float_shares,
          color: "var(--color-earth)" 
        },
      ]
    },
  ]);

  return (
    <div class="premium-card h-full flex flex-col overflow-hidden bg-gradient-to-b from-white to-sage/5 border-forest/10 hover:cursor-default">
      <div class="p-5 border-b border-forest/5 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div class="flex items-center gap-2">
          <span class="material-icons text-forest text-xl">assessment</span>
          <h4 class="font-outfit font-bold text-forest text-lg">Key Metrics</h4>
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        <For each={categories()}>
          {(category) => (
            <div class="space-y-3">
              <div class="flex items-center gap-2 opacity-60">
                <span class="material-icons text-sm">{category.icon}</span>
                <h5 class="text-[10px] font-bold uppercase tracking-[0.15em] text-earth">
                  {category.title}
                </h5>
              </div>
              
              <div class="grid gap-2">
                <For each={category.metrics}>
                  {(metric) => {
                    const evalResult = createMemo(() => evaluateMetric(metric.label, metric.rawValue));
                    
                    const rowStyles = createMemo(() => {
                      if (metric.value === "N/A") return "bg-white/40 border-forest/5 hover:border-forest/20";
                      
                      switch (evalResult().signal) {
                        case 'good':
                          return "bg-emerald-500/[0.02] border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]";
                        case 'bad':
                          return "bg-rose-500/[0.02] border-rose-500/10 hover:border-rose-500/30 hover:bg-rose-500/[0.04]";
                        case 'neutral':
                        default:
                          return "bg-amber-500/[0.02] border-amber-500/10 hover:border-amber-500/30 hover:bg-amber-500/[0.04]";
                      }
                    });

                    const badgeStyles = createMemo(() => {
                      if (metric.value === "N/A") return "bg-neutral-100 text-neutral-500 border-neutral-200/50";
                      
                      switch (evalResult().signal) {
                        case 'good':
                          return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
                        case 'bad':
                          return "bg-rose-500/15 text-rose-700 border-rose-500/20";
                        case 'neutral':
                        default:
                          return "bg-amber-500/15 text-amber-700 border-amber-500/20";
                      }
                    });

                    const signalIcon = createMemo(() => {
                      if (metric.value === "N/A") return "-";
                      switch (evalResult().signal) {
                        case 'good': return "✅";
                        case 'bad': return "🔴";
                        case 'neutral': default: return "⚠️";
                      }
                    });

                    const tooltipOverlayColor = createMemo(() => {
                      if (metric.value === "N/A") return "bg-neutral-500";
                      switch (evalResult().signal) {
                        case 'good': return "bg-emerald-500";
                        case 'bad': return "bg-rose-500";
                        case 'neutral': default: return "bg-amber-500";
                      }
                    });

                    const tooltipContent = (
                      <div class="space-y-1.5 text-left">
                        <div class="flex items-center gap-1.5 font-bold text-white text-xs border-b border-white/10 pb-1">
                          <span>{signalIcon()}</span>
                          <span>{metric.label} Verdict</span>
                        </div>
                        <p class="text-[11px] text-white/90 leading-relaxed font-outfit">
                          {evalResult().tooltip}
                        </p>
                        <div class="text-[10px] text-white/60 font-semibold pt-0.5">
                          {evalResult().thresholdContext}
                        </div>
                      </div>
                    );

                    return (
                      <Tooltip class="w-full block rounded-xl" position={metric.tooltipPosition || "bottom"} content={tooltipContent} overlayBgClass={tooltipOverlayColor()}>
                        <div class={`flex justify-between items-center p-3 rounded-xl border transition-all group cursor-pointer ${rowStyles()}`}>
                          <div class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ "background-color": metric.color }} />
                            <span class="text-xs text-earth font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                              {metric.label}
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="text-base font-outfit font-bold text-forest group-hover:scale-102 transition-transform origin-right">
                              {metric.value}
                            </span>
                            <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyles()}`}>
                              {evalResult().badgeText}
                            </span>
                          </div>
                        </div>
                      </Tooltip>
                    );
                  }}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
