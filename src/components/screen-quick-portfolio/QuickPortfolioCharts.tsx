import { Show, For } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import type { ApexOptions } from "apexcharts";

type PerfPeriod = "1D" | "1W" | "1M" | "1Y" | "ALL";

interface QuickPortfolioChartsProps {
  allocations: {
    stocks: number;
    crypto: number;
    etfs: number;
    cash: number;
  };
  perfKpi: {
    change: number;
    pct: number;
    isPositive: boolean;
  } | null;
  perfPeriod: PerfPeriod;
  setPerfPeriod: (p: PerfPeriod) => void;
  perfChartReady: boolean;
  perfOptions: ApexOptions;
  perfSeriesApex: any;
  perfSeries: any[];
  formatVal: (amount: number) => string;
  formatPercent: (amount: number) => string;
}

export const QuickPortfolioCharts = (props: QuickPortfolioChartsProps) => {
  return (
    <div class="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Asset Allocation Donut */}
      <div class="bg-white rounded-2xl p-5 border border-forest/10 shadow-sm flex flex-col">
        <h4 class="font-outfit text-sm font-bold text-near-black mb-4 uppercase tracking-wider">Asset Allocation</h4>
        
        <div class="flex-1 flex items-center justify-center relative min-h-[140px]">
          <div class="w-32 h-32 rounded-full relative" 
            style={{
              background: `conic-gradient(
                #1a4d2e 0% ${props.allocations.stocks}%, 
                #2d7d46 ${props.allocations.stocks}% ${props.allocations.stocks + props.allocations.crypto}%, 
                #52c278 ${props.allocations.stocks + props.allocations.crypto}% ${props.allocations.stocks + props.allocations.crypto + props.allocations.etfs}%, 
                #cbd5e1 ${props.allocations.stocks + props.allocations.crypto + props.allocations.etfs}% 100%
              )`,
              "mask-image": "radial-gradient(transparent 55%, black 56%)",
              "-webkit-mask-image": "radial-gradient(transparent 55%, black 56%)"
            }}
          />
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="font-outfit text-[10px] text-earth uppercase font-semibold">Total</span>
            <span class="font-outfit text-sm text-forest font-bold">100%</span>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-earth">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-[#1a4d2e]"></div>
            <span>Stocks ({props.allocations.stocks.toFixed(1)}%)</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-[#2d7d46]"></div>
            <span>Crypto ({props.allocations.crypto.toFixed(1)}%)</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-[#52c278]"></div>
            <span>ETFs ({props.allocations.etfs.toFixed(1)}%)</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-[#cbd5e1]"></div>
            <span>Cash ({props.allocations.cash.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Performance Trend */}
      <div class="bg-white rounded-2xl p-5 border border-forest/10 shadow-sm flex flex-col">
        <div class="flex justify-between items-start mb-3 gap-3">
          <div>
            <h4 class="font-outfit text-sm font-bold text-near-black uppercase tracking-wider">Performance Trend</h4>
            <Show when={props.perfKpi}>
              {(kpi) => {
                const positive = () => kpi().isPositive;
                return (
                  <div class="flex items-baseline gap-1.5 mt-1.5">
                    <span
                      class="font-outfit text-xl font-bold tracking-tight"
                      classList={{
                        "text-forest": positive(),
                        "text-red-600": !positive(),
                      }}
                    >
                      {positive() ? "+" : ""}{props.formatVal(kpi().change)}
                    </span>
                    <span
                      class="text-[10px] font-outfit font-bold uppercase tracking-wider"
                      classList={{
                        "text-forest": positive(),
                        "text-red-600": !positive(),
                      }}
                    >
                      ({props.formatPercent(kpi().pct / 100)})
                    </span>
                    <span class="text-[10px] text-earth/60 font-outfit font-semibold uppercase tracking-wider ml-1">
                      · {props.perfPeriod}
                    </span>
                  </div>
                );
              }}
            </Show>
          </div>

          <div class="flex bg-sage/40 p-1 rounded-xl border border-forest/5 shadow-inner shrink-0">
            <For each={["1D", "1W", "1M", "1Y", "ALL"] as PerfPeriod[]}>
              {(p) => {
                const active = () => props.perfPeriod === p;
                return (
                  <button
                    onClick={() => props.setPerfPeriod(p)}
                    class="px-2.5 py-1 rounded-lg text-[10px] font-outfit font-bold transition-all duration-200 uppercase tracking-wider cursor-pointer border-0"
                    classList={{
                      "bg-forest text-white shadow-sm": active(),
                      "text-earth/65 hover:text-forest hover:bg-forest/5": !active(),
                    }}
                  >
                    {p}
                  </button>
                );
              }}
            </For>
          </div>
        </div>

        <div class="flex-1 min-h-[200px]">
          <Show
            when={props.perfChartReady && props.perfSeries.length > 1}
            fallback={
              <div class="h-full flex flex-col items-center justify-center text-earth/40 font-outfit text-sm italic py-10">
                <span class="material-icons !text-4xl text-forest/15 mb-3">
                  {props.perfChartReady ? "analytics" : "hourglass_empty"}
                </span>
                {props.perfChartReady
                  ? "Add a holding to see your trend"
                  : "Loading chart..."}
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
    </div>
  );
};
