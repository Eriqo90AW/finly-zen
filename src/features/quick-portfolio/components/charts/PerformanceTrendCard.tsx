import { For, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { PerfKpi, PerfPeriod, PerfPoint, PerfSeriesApexItem } from "../../types";

const PERF_PERIODS: PerfPeriod[] = ["1D", "1W", "1M", "1Y", "ALL"];

interface PerformanceTrendCardProps {
  perfKpi: PerfKpi | null;
  perfPeriod: PerfPeriod;
  setPerfPeriod: (p: PerfPeriod) => void;
  perfChartReady: boolean;
  perfOptions: ApexOptions;
  perfSeriesApex: PerfSeriesApexItem[];
  perfSeries: PerfPoint[];
  formatVal: (amount: number) => string;
  formatPercent: (amount: number) => string;
}

export const PerformanceTrendCard = (props: PerformanceTrendCardProps) => {
  return (
    <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium flex flex-col group transition-all min-h-[260px]">
      <div class="flex justify-between items-start mb-4 gap-3 shrink-0">
        <div>
          <div class="flex items-center gap-2">
            <span class="material-icons text-forest !text-xl">show_chart</span>
            <h3 class="text-xs sm:text-sm font-outfit font-bold text-forest uppercase tracking-wider">
              Performance Trend
            </h3>
          </div>
          <Show when={props.perfKpi}>
            {(kpi) => {
              const positive = () => kpi().isPositive;
              return (
                <div class="flex items-center gap-2 mt-1 font-outfit">
                  <span
                    class="text-sm font-bold tracking-tight"
                    classList={{
                      "text-emerald-700": positive(),
                      "text-rose-600": !positive(),
                    }}
                  >
                    {positive() ? "+" : ""}
                    {props.formatVal(kpi().change)}
                  </span>
                  <span
                    class={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      positive()
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-rose-500/10 text-rose-600"
                    }`}
                  >
                    {props.formatPercent(kpi().pct / 100)}
                  </span>
                </div>
              );
            }}
          </Show>
        </div>

        <div class="flex bg-sage/50 p-1 rounded-xl border border-forest/10 shrink-0">
          <For each={PERF_PERIODS}>
            {(p) => {
              const active = () => props.perfPeriod === p;
              return (
                <button
                  type="button"
                  onClick={() => props.setPerfPeriod(p)}
                  class="px-2.5 py-1 rounded-lg text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
                  classList={{
                    "bg-forest text-white shadow-xs": active(),
                    "text-earth hover:text-forest": !active(),
                  }}
                >
                  {p}
                </button>
              );
            }}
          </For>
        </div>
      </div>

      <div class="flex-1 min-h-0 w-full">
        <Show
          when={props.perfChartReady && props.perfSeries.length > 1}
          fallback={
            <div class="h-full flex flex-col items-center justify-center text-earth/40 font-outfit text-sm italic py-10">
              <span class="material-icons !text-4xl text-forest/15 mb-3">
                {props.perfChartReady ? "analytics" : "hourglass_empty"}
              </span>
              {props.perfChartReady ? "Add a holding to see your trend" : "Loading chart..."}
            </div>
          }
        >
          <SolidApexCharts
            options={props.perfOptions}
            series={props.perfSeriesApex}
            type="area"
            height="100%"
            width="100%"
          />
        </Show>
      </div>
    </div>
  );
};
