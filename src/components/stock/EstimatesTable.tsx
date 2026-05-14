import { For, Show } from "solid-js";
import { StockData, Estimate } from "../../data/stockData";
import { formatUSD, formatUSDCompact, formatPercent } from "../../utils/format";

interface EstimatesTableProps {
  data: StockData;
}

export const EstimatesTable = (props: EstimatesTableProps) => {
  const estimates = props.data.earnings_estimates.by_period;
  
  const columns = [
    { label: "Current Quarter", data: estimates.current_quarter, period: "Jun 2026", isCurrent: true, type: "quarter" },
    { label: "Next Quarter", data: estimates.next_quarter, period: "Sep 2026", isCurrent: false, type: "quarter" },
    { label: "Current Year", data: estimates.current_year, period: "Dec 2026", isCurrent: true, type: "year" },
    { label: "Next Year", data: estimates.next_year, period: "Dec 2027", isCurrent: false, type: "year" },
  ];

  const Row = (props: { label: string, render: (est: Estimate) => any, subLabel?: string }) => (
    <tr class="border-b border-forest/5 hover:bg-sage/10 transition-colors">
      <td class="py-4 pl-4 pr-2">
        <div class="flex flex-col">
          <span class="text-xs font-bold text-forest">{props.label}</span>
          <Show when={props.subLabel}>
            <span class="text-[10px] text-earth/60 tracking-tight">{props.subLabel}</span>
          </Show>
        </div>
      </td>
      <For each={columns}>
        {(col) => (
          <td class={`py-4 px-4 text-sm font-outfit text-forest font-medium ${col.isCurrent ? "bg-earth/8" : "bg-earth/5"}`}>
            {props.render(col.data)}
          </td>
        )}
      </For>
    </tr>
  );

  return (
    <div class="premium-card overflow-hidden">
      <div class="p-6 border-b border-forest/5 flex items-center justify-between bg-sage/5">
        <div>
          <h4 class="font-outfit font-bold text-forest text-lg">Earnings Estimates</h4>
          <p class="text-xs text-earth/60">Forward-looking analyst projections & revisions</p>
        </div>
        <div class="flex gap-2">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-forest/10 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            <span class="text-[10px] font-bold text-forest uppercase tracking-widest">Growth</span>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-forest/10 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-[#6366F1]"></span>
            <span class="text-[10px] font-bold text-forest uppercase tracking-widest">Revision</span>
          </div>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-forest/5">
              <th class="py-3 pl-4 pr-2 text-[10px] font-bold text-earth uppercase tracking-widest w-[180px]">Metric</th>
              <For each={columns}>
                {(col) => (
                  <th class={`py-3 px-4 ${col.isCurrent ? "bg-earth/10" : "bg-earth/5"}`}>
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-forest">{col.label}</span>
                      <span class="text-[9px] text-earth/60 font-medium">{col.period}</span>
                    </div>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <Row 
              label="EPS Average" 
              subLabel="Estimate"
              render={(est) => formatUSD(est.eps_avg, 2)} 
            />
            <Row 
              label="EPS Growth" 
              subLabel="QoQ and YoY"
              render={(est) => (
                <span class={est.eps_growth > 0 ? "text-[#10B981]" : "text-[#F43F5E]"}>
                  {formatPercent(est.eps_growth)}
                </span>
              )} 
            />
            <Row 
              label="Revenue Avg" 
              subLabel="Total Sales"
              render={(est) => formatUSDCompact(est.revenue_avg)} 
            />
            <Row 
              label="Revenue Growth" 
              subLabel="QoQ and YoY"
              render={(est) => (
                <span class={est.revenue_growth > 0 ? "text-[#10B981]" : "text-[#F43F5E]"}>
                  {formatPercent(est.revenue_growth)}
                </span>
              )} 
            />
            <Row 
              label="7D Revisions" 
              subLabel="Upgrades"
              render={(est) => (
                <div class="flex items-center gap-2">
                  <span class={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(est.eps_revisions_up_7d ?? 0) > 0 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-earth/5 text-earth/40"}`}>
                    {est.eps_revisions_up_7d ?? 0}↑
                  </span>
                </div>
              )} 
            />
            <Row 
              label="30D Revisions" 
              subLabel="Up / Down"
              render={(est) => (
                <div class="flex items-center gap-2">
                  <span class={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(est.eps_revisions_up_30d ?? 0) > 0 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-earth/5 text-earth/40"}`}>
                    {est.eps_revisions_up_30d ?? 0}↑
                  </span>
                  <span class="text-earth/20 text-[10px]">/</span>
                  <span class={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(est.eps_revisions_down_30d ?? 0) > 0 ? "bg-[#F43F5E]/10 text-[#F43F5E]" : "bg-earth/5 text-earth/40"}`}>
                    {est.eps_revisions_down_30d ?? 0}↓
                  </span>
                </div>
              )} 
            />
            <Row 
              label="EPS Range" 
              subLabel="Low — High"
              render={(est) => (
                <span class="text-earth text-xs font-medium">
                  {formatUSD(est.eps_low, 2)} — {formatUSD(est.eps_high, 2)}
                </span>
              )} 
            />
            <tr class="bg-forest/5">
              <td class="py-3 pl-4 pr-2 text-[10px] font-bold text-earth uppercase tracking-widest">Analysts</td>
              <For each={columns}>
                {(col) => (
                  <td class={`py-3 px-4 text-xs font-bold text-forest ${col.isCurrent ? "bg-earth/10" : "bg-earth/5"}`}>
                    {col.data.eps_num_analysts} Analysts
                  </td>
                )}
              </For>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

