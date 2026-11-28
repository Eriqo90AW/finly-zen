import { createMemo, For, type JSX, Show } from "solid-js";
import type { Estimate, EstimatesTableProps } from "../../../types";
import { formatPercent, formatUSD, formatUSDCompact } from "../../../utils/format";

interface EstimateColumn {
  label: string;
  data: Estimate | undefined;
  period: string;
  isCurrent: boolean;
  type: "quarter" | "year";
}

interface EstimateRowProps {
  label: string;
  subLabel?: string;
  columns: EstimateColumn[];
  render: (est: Estimate | undefined) => JSX.Element;
}

const EstimateRow = (props: EstimateRowProps) => (
  <tr class="border-b border-forest/5 hover:bg-sage/10 transition-colors">
    <td class="py-4 pl-4 pr-2">
      <div class="flex flex-col">
        <span class="text-xs font-bold text-forest">{props.label}</span>
        <Show when={props.subLabel}>
          <span class="text-[10px] text-earth/60 tracking-tight">{props.subLabel}</span>
        </Show>
      </div>
    </td>
    <For each={props.columns}>
      {(col) => (
        <td
          class={`py-4 px-4 text-sm font-outfit text-forest font-medium ${col.isCurrent ? "bg-earth/6" : "bg-earth/3"}`}
        >
          {props.render(col.data)}
        </td>
      )}
    </For>
  </tr>
);

export const EstimatesTable = (props: EstimatesTableProps) => {
  const estimates = createMemo(() => props.data.earnings_estimates?.by_period);

  const columns = createMemo<EstimateColumn[]>(() => [
    { label: "Current Quarter", data: estimates()?.current_quarter, period: "Jun 2026", isCurrent: true, type: "quarter" },
    { label: "Next Quarter", data: estimates()?.next_quarter, period: "Sep 2026", isCurrent: false, type: "quarter" },
    { label: "Current Year", data: estimates()?.current_year, period: "Dec 2026", isCurrent: true, type: "year" },
    { label: "Next Year", data: estimates()?.next_year, period: "Dec 2027", isCurrent: false, type: "year" },
  ]);

  return (
    <div class="premium-card overflow-hidden hover:cursor-default">
      <div class="p-4 sm:p-6 border-b border-forest/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sage/5">
        <div>
          <h4 class="font-outfit font-bold text-forest text-base sm:text-lg">Earnings Estimates</h4>
          <p class="text-xs text-earth/60">Forward-looking analyst projections & revisions</p>
        </div>
        <div class="flex gap-2">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-forest/10 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span class="text-[10px] font-bold text-forest uppercase tracking-widest">Growth</span>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-forest/10 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
            <span class="text-[10px] font-bold text-forest uppercase tracking-widest">
              Revision
            </span>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full min-w-[600px] text-left border-collapse">
          <thead>
            <tr class="bg-forest/5">
              <th class="py-3 pl-4 pr-2 text-[10px] font-bold text-earth uppercase tracking-widest w-[180px]">
                Metric
              </th>
              <For each={columns()}>
                {(col) => (
                  <th class={`py-3 px-4 ${col.isCurrent ? "bg-earth/6" : "bg-earth/3"}`}>
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
            <EstimateRow
              label="EPS Average"
              subLabel="Estimate"
              columns={columns()}
              render={(est) => (est ? formatUSD(est.eps_avg, 2) : "N/A")}
            />
            <EstimateRow
              label="EPS Growth"
              subLabel="QoQ and YoY"
              columns={columns()}
              render={(est) => (
                <span class={est && est.eps_growth > 0 ? "text-[#10B981]" : "text-[#F43F5E]"}>
                  {est ? formatPercent(est.eps_growth) : "N/A"}
                </span>
              )}
            />
            <EstimateRow
              label="Revenue Avg"
              subLabel="Total Sales"
              columns={columns()}
              render={(est) => (est ? formatUSDCompact(est.revenue_avg) : "N/A")}
            />
            <EstimateRow
              label="Revenue Growth"
              subLabel="QoQ and YoY"
              columns={columns()}
              render={(est) => (
                <span class={est && est.revenue_growth > 0 ? "text-[#10B981]" : "text-[#F43F5E]"}>
                  {est ? formatPercent(est.revenue_growth) : "N/A"}
                </span>
              )}
            />
            <EstimateRow
              label="7D Revisions"
              subLabel="Upgrades"
              columns={columns()}
              render={(est) => (
                <div class="flex items-center gap-2">
                  <span
                    class={`px-1.5 py-0.5 rounded text-[10px] font-bold ${est && (est.eps_revisions_up_7d ?? 0) > 0 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-earth/5 text-earth/40"}`}
                  >
                    {est ? (est.eps_revisions_up_7d ?? 0) : 0}↑
                  </span>
                </div>
              )}
            />
            <EstimateRow
              label="30D Revisions"
              subLabel="Up / Down"
              columns={columns()}
              render={(est) => (
                <div class="flex items-center gap-2">
                  <span
                    class={`px-1.5 py-0.5 rounded text-[10px] font-bold ${est && (est.eps_revisions_up_30d ?? 0) > 0 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-earth/5 text-earth/40"}`}
                  >
                    {est ? (est.eps_revisions_up_30d ?? 0) : 0}↑
                  </span>
                  <span class="text-earth/20 text-[10px]">/</span>
                  <span
                    class={`px-1.5 py-0.5 rounded text-[10px] font-bold ${est && (est.eps_revisions_down_30d ?? 0) > 0 ? "bg-[#F43F5E]/10 text-[#F43F5E]" : "bg-earth/5 text-earth/40"}`}
                  >
                    {est ? (est.eps_revisions_down_30d ?? 0) : 0}↓
                  </span>
                </div>
              )}
            />
            <EstimateRow
              label="EPS Range"
              subLabel="Low — High"
              columns={columns()}
              render={(est) => (
                <span class="text-earth text-xs font-medium">
                  {est ? `${formatUSD(est.eps_low, 2)} — ${formatUSD(est.eps_high, 2)}` : "N/A"}
                </span>
              )}
            />
            <tr class="bg-forest/5">
              <td class="py-3 pl-4 pr-2 text-[10px] font-bold text-earth uppercase tracking-widest">
                Analysts
              </td>
              <For each={columns()}>
                {(col) => (
                  <td
                    class={`py-3 px-4 text-xs font-bold text-forest ${col.isCurrent ? "bg-earth/6" : "bg-earth/3"}`}
                  >
                    {col.data?.eps_num_analysts ?? 0} Analysts
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
