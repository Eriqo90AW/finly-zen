import { For, createMemo, createSignal } from "solid-js";
import { formatUSD, formatUSDCompact, formatPercent, formatMultiple } from "../../utils/format";
import type { MetricsCardProps, LocalMetric, MetricCategory } from "../../types";
import { evaluateMetric } from "../../utils/metricEvaluator";
import { Tooltip } from "../modules/Tooltip";
import { FundamentalsCompareModal } from "./modals/FundamentalsCompareModal";

export const MetricsCard = (props: MetricsCardProps) => {
  const [isCompareOpen, setIsCompareOpen] = createSignal(false);
  const categories = createMemo<MetricCategory[]>(() => {
    const valuation = props.data.valuation || {} as any;
    const advancedRatios = props.data.advanced_ratios || {} as any;

    return [
      {
        title: "Valuation",
        icon: "bar_chart",
        metrics: [
          { 
            label: "P/E (TTM)", 
            value: valuation.pe_ttm != null ? formatMultiple(valuation.pe_ttm) : "N/A", 
            rawValue: valuation.pe_ttm,
            color: "var(--color-fin-blue)",
            tooltipPosition: "bottom" as const
          },
          { 
            label: "P/E (Forward)", 
            value: valuation.pe_forward != null ? formatMultiple(valuation.pe_forward) : "N/A", 
            rawValue: valuation.pe_forward,
            color: "var(--color-fin-blue)",
            tooltipPosition: "bottom" as const
          },
          { 
            label: "PEG Ratio", 
            value: advancedRatios.peg_ratio != null ? advancedRatios.peg_ratio.toFixed(2) : "N/A", 
            rawValue: advancedRatios.peg_ratio,
            color: "var(--color-fin-purple)" 
          },
          { 
            label: "P/S (TTM)", 
            value: valuation.price_to_sales_ttm != null ? formatMultiple(valuation.price_to_sales_ttm) : "N/A", 
            rawValue: valuation.price_to_sales_ttm,
            color: "var(--color-fin-blue)" 
          },
          { 
            label: "P/B", 
            value: valuation.price_to_book != null ? formatMultiple(valuation.price_to_book) : "N/A", 
            rawValue: valuation.price_to_book,
            color: "var(--color-fin-blue)" 
          },
          { 
            label: "EV / Revenue", 
            value: advancedRatios.ev_to_revenue != null ? formatMultiple(advancedRatios.ev_to_revenue) : "N/A", 
            rawValue: advancedRatios.ev_to_revenue,
            color: "var(--color-fin-purple)" 
          },
          { 
            label: "EV / EBITDA", 
            value: valuation.ev_to_ebitda != null ? formatMultiple(valuation.ev_to_ebitda) : "N/A", 
            rawValue: valuation.ev_to_ebitda,
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
            value: advancedRatios.gross_margin != null ? formatPercent(advancedRatios.gross_margin) : "N/A", 
            rawValue: advancedRatios.gross_margin,
            color: "var(--color-fin-green)" 
          },
          { 
            label: "Operating Margin", 
            value: advancedRatios.operating_margin != null ? formatPercent(advancedRatios.operating_margin) : "N/A", 
            rawValue: advancedRatios.operating_margin,
            color: "var(--color-fin-green)" 
          },
          { 
            label: "Net Margin", 
            value: advancedRatios.net_margin != null ? formatPercent(advancedRatios.net_margin) : "N/A", 
            rawValue: advancedRatios.net_margin,
            color: "var(--color-fin-green)" 
          },
          { 
            label: "Profit Margin", 
            value: valuation.profit_margin != null ? formatPercent(valuation.profit_margin) : "N/A", 
            rawValue: valuation.profit_margin,
            color: "var(--color-fin-green)" 
          },
          { 
            label: "ROE", 
            value: advancedRatios.roe != null ? formatPercent(advancedRatios.roe) : "N/A", 
            rawValue: advancedRatios.roe,
            color: "var(--color-fin-green)" 
          },
          { 
            label: "ROA", 
            value: advancedRatios.roa != null ? formatPercent(advancedRatios.roa) : "N/A", 
            rawValue: advancedRatios.roa,
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
            value: advancedRatios.current_ratio != null ? advancedRatios.current_ratio.toFixed(2) : "N/A", 
            rawValue: advancedRatios.current_ratio,
            color: "var(--color-fin-amber)" 
          },
          { 
            label: "Debt / Equity", 
            value: advancedRatios.debt_to_equity != null ? advancedRatios.debt_to_equity.toFixed(2) : "N/A", 
            rawValue: advancedRatios.debt_to_equity,
            color: (advancedRatios.debt_to_equity ?? 0) > 2 ? "var(--color-fin-red)" : "var(--color-fin-amber)" 
          },
          { 
            label: "Beta", 
            value: advancedRatios.beta != null ? advancedRatios.beta.toFixed(2) : "N/A", 
            rawValue: advancedRatios.beta,
            color: "var(--color-earth)" 
          },
          { 
            label: "Short % of Float", 
            value: advancedRatios.short_percent_of_float != null 
              ? (advancedRatios.short_percent_of_float * 100).toFixed(2) + "%" 
              : "N/A", 
            rawValue: advancedRatios.short_percent_of_float,
            color: "var(--color-earth)" 
          },
          { 
            label: "Dividend Yield", 
            value: advancedRatios.dividend_yield != null 
              ? (advancedRatios.dividend_yield * 100).toFixed(2) + "%" 
              : "N/A", 
            rawValue: advancedRatios.dividend_yield,
            color: "var(--color-fin-green)" 
          },
          { 
            label: "Dividend Rate", 
            value: advancedRatios.dividend_rate != null 
              ? formatUSD(advancedRatios.dividend_rate) 
              : "N/A", 
            rawValue: advancedRatios.dividend_rate,
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
            value: advancedRatios.float_shares != null ? formatUSDCompact(advancedRatios.float_shares).replace("$", "") : "N/A", 
            rawValue: advancedRatios.float_shares,
            color: "var(--color-earth)" 
          },
        ]
      },
    ];
  });

  return (
    <div class="premium-card h-full flex flex-col overflow-hidden bg-gradient-to-b from-white to-sage/5 border-forest/10 hover:cursor-default">
      <div class="p-5 border-b border-forest/5 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="material-icons text-forest text-xl">assessment</span>
            <h4 class="font-outfit font-bold text-forest text-lg">Key Metrics</h4>
          </div>
          
          <button 
            onClick={() => setIsCompareOpen(true)}
            class="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black tracking-wider text-forest bg-forest/5 hover:bg-forest/10 border border-forest/10 rounded-lg transition-all cursor-pointer uppercase shadow-sm"
          >
            <span class="material-icons text-xs">compare_arrows</span>
            <span>Compare</span>
          </button>
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
                          return "bg-emerald-500/8 border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]";
                        case 'bad':
                          return "bg-rose-500/8 border-rose-500/10 hover:border-rose-500/30 hover:bg-rose-500/[0.04]";
                        case 'neutral':
                        default:
                          return "bg-amber-500/8 border-amber-500/10 hover:border-amber-500/30 hover:bg-amber-500/[0.04]";
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

      <FundamentalsCompareModal 
        isOpen={isCompareOpen()} 
        onClose={() => setIsCompareOpen(false)} 
        baseCompany={props.data} 
      />
    </div>
  );
};
