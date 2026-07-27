import { Show, For, createMemo } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AllocationItem } from "../../types";

type PerfPeriod = "1D" | "1W" | "1M" | "1Y" | "ALL";

type AllocationView = "category" | "detail";

interface QuickPortfolioChartsProps {
  allocations: {
    stocks: number;
    idx: number;
    crypto: number;
    cash: number;
  };
  allocationView: AllocationView;
  setAllocationView: (v: AllocationView) => void;
  detailAllocations: AllocationItem[];
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
  const categoryColors = {
    stocks: "#1a4d2e",
    idx: "#52c278",
    crypto: "#2d7d46",
    cash: "#cbd5e1",
  };

  const detailDonutOptions = createMemo((): ApexOptions => ({
    chart: {
      type: "donut",
      animations: { enabled: false },
      dropShadow: { enabled: false },
    },
    labels: props.detailAllocations.map((item) => item.ticker),
    colors: props.detailAllocations.map((item) => item.color),
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { show: false },
    tooltip: { enabled: false },
    states: { hover: { filter: { type: "none" } } },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: "78%",
          labels: { show: false },
        },
      },
    },
  }));

  const detailDonutSeries = createMemo(() =>
    props.detailAllocations.map((item) => item.percentage),
  );

  return (
    <div class="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Asset Allocation Card */}
      <div class="bg-white rounded-2xl p-4 border border-forest/10 shadow-sm flex flex-col group hover:shadow-md transition-all h-60">
        <div class="flex items-center justify-between mb-2 gap-2 shrink-0">
          <div class="flex items-center gap-2">
            <span class="material-icons text-forest !text-base">pie_chart</span>
            <h4 class="font-outfit text-[11px] text-earth uppercase tracking-wider font-bold shrink-0">
              Asset Allocation
            </h4>
          </div>
          <div class="flex bg-sage/40 p-0.5 rounded-lg border border-forest/5 shadow-inner shrink-0">
            <button
              onClick={() => props.setAllocationView("category")}
              class="px-2 py-0.5 rounded-md text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
              classList={{
                "bg-forest text-white shadow-xs": props.allocationView === "category",
                "text-earth/70 hover:text-forest": props.allocationView !== "category",
              }}
            >
              Category
            </button>
            <button
              onClick={() => props.setAllocationView("detail")}
              class="px-2 py-0.5 rounded-md text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
              classList={{
                "bg-forest text-white shadow-xs": props.allocationView === "detail",
                "text-earth/70 hover:text-forest": props.allocationView !== "detail",
              }}
            >
              Detail
            </button>
          </div>
        </div>

        <Show
          when={props.allocationView === "category"}
          fallback={
            /* Detail view: ApexCharts donut + scrollable ticker list */
            <div class="flex-1 min-h-0 flex flex-col justify-between">
              <div class="relative h-[95px] shrink-0 mb-1">
                <SolidApexCharts
                  options={detailDonutOptions()}
                  series={detailDonutSeries()}
                  type="donut"
                  height="100%"
                />
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div class="flex flex-col items-center font-outfit">
                    <span class="text-[9px] text-earth uppercase font-semibold">Total</span>
                    <span class="text-xs text-forest font-bold">100%</span>
                  </div>
                </div>
              </div>

              <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar-thin -mr-1 pr-1 space-y-1">
                <For each={props.detailAllocations}>
                  {(item) => (
                    <div class="flex items-center justify-between group hover:bg-earth/5 px-1.5 py-0.5 rounded-lg transition-colors duration-150">
                      <div class="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                        <div
                          class="w-1 h-6 rounded-full shrink-0"
                          style={{ "background-color": item.color }}
                        />
                        <div class="flex flex-col min-w-0 overflow-hidden">
                          <span class="text-[11px] font-outfit font-bold text-earth group-hover:text-forest transition-colors leading-tight truncate">
                            {item.ticker}
                          </span>
                          <span class="text-[9px] text-earth/40 truncate max-w-[80px]">
                            {item.isCash ? "" : item.name}
                          </span>
                        </div>
                      </div>
                      <div class="flex flex-col items-end shrink-0">
                        <span class="text-[11px] font-outfit font-bold text-forest">
                          {item.percentage.toFixed(1)}%
                        </span>
                        <span class="text-[9px] font-semibold text-earth/40 truncate max-w-[80px]">
                          {props.formatVal(item.value)}
                        </span>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          }
        >
          {/* Category view: CSS conic donut + 2x2 legend */}
          <div class="flex-1 min-h-0 flex flex-col justify-between">
            <div class="flex-1 min-h-0 flex items-center justify-center relative py-1">
              <div
                class="w-24 h-24 rounded-full relative"
                style={{
                  background: `conic-gradient(
                    ${categoryColors.stocks} 0% ${props.allocations.stocks}%,
                    ${categoryColors.idx} ${props.allocations.stocks}% ${props.allocations.stocks + props.allocations.idx}%,
                    ${categoryColors.crypto} ${props.allocations.stocks + props.allocations.idx}% ${props.allocations.stocks + props.allocations.idx + props.allocations.crypto}%,
                    ${categoryColors.cash} ${props.allocations.stocks + props.allocations.idx + props.allocations.crypto}% 100%
                  )`,
                  "mask-image": "radial-gradient(transparent 55%, black 56%)",
                  "-webkit-mask-image": "radial-gradient(transparent 55%, black 56%)",
                }}
              />
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="font-outfit text-[10px] text-earth uppercase font-semibold">Total</span>
                <span class="font-outfit text-sm text-forest font-bold">100%</span>
              </div>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-earth shrink-0">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-[#1a4d2e]" />
                <span>Stocks ({props.allocations.stocks.toFixed(1)}%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-[#52c278]" />
                <span>IDX ({props.allocations.idx.toFixed(1)}%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-[#2d7d46]" />
                <span>Crypto ({props.allocations.crypto.toFixed(1)}%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-[#cbd5e1]" />
                <span>Cash ({props.allocations.cash.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Performance Trend */}
      <div class="bg-white rounded-2xl p-4 border border-forest/10 shadow-sm flex flex-col group hover:shadow-md transition-all h-60">
        <div class="flex justify-between items-start mb-2 gap-3 shrink-0">
          <div>
            <div class="flex items-center gap-2">
              <span class="material-icons text-forest !text-base">show_chart</span>
              <h4 class="font-outfit text-[11px] text-earth uppercase tracking-wider font-bold">
                Performance Trend
              </h4>
            </div>
            <Show when={props.perfKpi}>
              {(kpi) => {
                const positive = () => kpi().isPositive;
                return (
                  <div class="flex items-center gap-1.5 mt-1 font-mono">
                    <span
                      class="font-outfit text-sm font-bold tracking-tight"
                      classList={{
                        "text-forest": positive(),
                        "text-red-600": !positive(),
                      }}
                    >
                      {positive() ? "+" : ""}{props.formatVal(kpi().change)}
                    </span>
                    <span
                      class={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold font-mono ${
                        positive() ? "bg-forest/10 text-forest" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {props.formatPercent(kpi().pct / 100)}
                    </span>
                  </div>
                );
              }}
            </Show>
          </div>

          <div class="flex bg-sage/40 p-0.5 rounded-lg border border-forest/5 shadow-inner shrink-0">
            <For each={["1D", "1W", "1M", "1Y", "ALL"] as PerfPeriod[]}>
              {(p) => {
                const active = () => props.perfPeriod === p;
                return (
                  <button
                    onClick={() => props.setPerfPeriod(p)}
                    class="px-2 py-0.5 rounded-md text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
                    classList={{
                      "bg-forest text-white shadow-xs": active(),
                      "text-earth/70 hover:text-forest": !active(),
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

      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(26, 77, 46, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(26, 77, 46, 0.35);
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 77, 46, 0.6);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};
