import { For, createMemo } from "solid-js";
import { StockData } from "../../data/stockData";
import { formatUSDCompact, formatPercent, formatMultiple } from "../../utils/format";


interface MetricsCardProps {
  data: StockData;
}

export const MetricsCard = (props: MetricsCardProps) => {
  const categories = createMemo(() => [
    {
      title: "Valuation",
      icon: "analytics",
      metrics: [
        { label: "P/E (TTM)", value: formatMultiple(props.data.valuation.pe_ttm), color: "var(--color-fin-blue)" },
        { label: "P/E (Forward)", value: formatMultiple(props.data.valuation.pe_forward), color: "var(--color-fin-blue)" },
        { label: "PEG Ratio", value: props.data.advanced_ratios.peg_ratio?.toFixed(2) || "N/A", color: "var(--color-fin-purple)" },
        { label: "EV / Revenue", value: formatMultiple(props.data.advanced_ratios.ev_to_revenue), color: "var(--color-fin-purple)" },
      ]
    },
    {
      title: "Profitability",
      icon: "payments",
      metrics: [
        { label: "Profit Margin", value: formatPercent(props.data.valuation.profit_margin), color: "var(--color-fin-green)" },
        { label: "ROE", value: formatPercent(props.data.advanced_ratios.roe), color: "var(--color-fin-green)" },
      ]
    },
    {
      title: "Health & Risk",
      icon: "health_and_safety",
      metrics: [
        { label: "Current Ratio", value: props.data.advanced_ratios.current_ratio?.toFixed(2) || "N/A", color: "var(--color-fin-amber)" },
        { label: "Debt / Equity", value: props.data.advanced_ratios.debt_to_equity?.toFixed(2) || "N/A", color: (props.data.advanced_ratios.debt_to_equity ?? 0) > 2 ? "var(--color-fin-red)" : "var(--color-fin-amber)" },
        { label: "Beta", value: props.data.advanced_ratios.beta?.toFixed(2) || "N/A", color: "var(--color-earth)" },
      ]
    },
    {
      title: "Market Data",
      icon: "public",
      metrics: [
        { label: "Float Shares", value: formatUSDCompact(props.data.advanced_ratios.float_shares).replace("$", ""), color: "var(--color-earth)" },
      ]
    },
    {
      title: "Profile",
      icon: "business",
      metrics: [
        { label: "Sector", value: props.data.sector || "N/A", color: "var(--color-fin-blue)" },
        { label: "Industry", value: props.data.industry || "N/A", color: "var(--color-fin-purple)" },
      ]
    }
  ]);

  return (
    <div class="premium-card h-full flex flex-col overflow-hidden bg-gradient-to-b from-white to-sage/5 border-forest/10">
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
                  {(metric) => (
                    <div class="flex justify-between items-center p-3 rounded-xl bg-white/40 border border-forest/5 hover:border-forest/20 hover:bg-white hover:shadow-md transition-all group cursor-default">
                      <div class="flex items-center gap-2">
                        <div class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ "background-color": metric.color }} />
                        <span class="text-xs text-earth font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                          {metric.label}
                        </span>
                      </div>
                      <span class="text-base font-cormorant font-bold text-forest group-hover:scale-105 transition-transform origin-right">
                        {metric.value}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

