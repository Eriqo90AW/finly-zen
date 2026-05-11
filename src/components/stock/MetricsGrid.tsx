import { For, createMemo } from "solid-js";
import { StockData } from "../../data/stockData";
import { formatUSD, formatUSDCompact, formatPercent, formatMultiple } from "../../utils/format";

interface MetricsGridProps {
  data: StockData;
}

export const MetricsGrid = (props: MetricsGridProps) => {
  const metrics = createMemo(() => [
    { label: "P/E (TTM)", value: formatMultiple(props.data.valuation.pe_ttm), color: "var(--color-fin-blue)" },
    { label: "P/E (Forward)", value: formatMultiple(props.data.valuation.pe_forward), color: "var(--color-fin-blue)" },
    { label: "EV / Revenue", value: formatMultiple(props.data.advanced_ratios.ev_to_revenue), color: "var(--color-fin-purple)" },
    { label: "Profit Margin", value: formatPercent(props.data.valuation.profit_margin), color: "var(--color-fin-green)" },
    { label: "ROE", value: formatPercent(props.data.advanced_ratios.roe), color: "var(--color-fin-green)" },
    { label: "Current Ratio", value: props.data.advanced_ratios.current_ratio.toFixed(2), color: "var(--color-fin-amber)" },
    { label: "Debt / Equity", value: props.data.advanced_ratios.debt_to_equity.toFixed(2), color: props.data.advanced_ratios.debt_to_equity > 10 ? "var(--color-fin-red)" : "var(--color-fin-amber)" },
    { label: "Float Shares", value: formatUSDCompact(props.data.advanced_ratios.float_shares).replace("$", ""), color: "var(--color-earth)" },
    { label: "PEG Ratio", value: props.data.advanced_ratios.peg_ratio.toFixed(2), color: "var(--color-fin-purple)" },
    { label: "Beta", value: props.data.advanced_ratios.beta.toFixed(2), color: "var(--color-earth)" },
  ]);

  return (
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <For each={metrics()}>
        {(metric) => (
          <div class="fin-metric-card p-5 flex flex-col gap-2 relative overflow-hidden group">
            <div 
              class="absolute left-0 top-0 bottom-0 w-1 opacity-20" 
              style={{ "background-color": metric.color }} 
            />
            <span class="text-[10px] font-bold text-earth uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
              {metric.label}
            </span>
            <span class="text-3xl font-cormorant font-bold text-forest">
              {metric.value}
            </span>
          </div>
        )}
      </For>
    </div>
  );
};

