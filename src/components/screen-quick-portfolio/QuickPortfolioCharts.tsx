import { Show, For, createMemo, createSignal } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AllocationItem } from "../../types";

type PerfPeriod = "1D" | "1W" | "1M" | "1Y" | "ALL";

type AllocationView = "category" | "detail";
type AllocationBasis = "market" | "cost";

interface QuickPortfolioChartsProps {
  allocations: {
    stocks: number;
    idx: number;
    crypto: number;
    cash: number;
    market?: { stocks: number; idx: number; crypto: number; cash: number };
    cost?: { stocks: number; idx: number; crypto: number; cash: number };
    marketValues: { stocks: number; idx: number; crypto: number; cash: number };
    costValues: { stocks: number; idx: number; crypto: number; cash: number };
    drift?: { stocks: number; idx: number; crypto: number; cash: number };
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
  const [allocBasis, setAllocBasis] = createSignal<AllocationBasis>("market");

  const categoryColors = {
    stocks: "#1a4d2e",
    idx: "#52c278",
    crypto: "#2d7d46",
    cash: "#cbd5e1",
  };

  const activeCategoryAllocations = createMemo(() => {
    if (allocBasis() === "cost" && props.allocations.cost) {
      return props.allocations.cost;
    }
    return props.allocations.market || {
      stocks: props.allocations.stocks,
      idx: props.allocations.idx,
      crypto: props.allocations.crypto,
      cash: props.allocations.cash,
    };
  });

  const createDonutOptions = (labels: string[], colors: string[]): ApexOptions => ({
    chart: {
      type: "donut",
      animations: { enabled: false },
      dropShadow: { enabled: false },
    },
    labels,
    colors,
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
  });

  const detailDonutOptions = createMemo(() =>
    createDonutOptions(
      props.detailAllocations.map((item) => item.ticker),
      props.detailAllocations.map((item) => item.color),
    )
  );

  const detailDonutSeries = createMemo(() =>
    props.detailAllocations.map((item) =>
      allocBasis() === "cost" ? item.costPercentage ?? item.percentage : item.percentage
    )
  );

  const categoryDonutOptions = createMemo(() =>
    createDonutOptions(
      ["Stocks", "IDX", "Crypto", "Cash"],
      [categoryColors.stocks, categoryColors.idx, categoryColors.crypto, categoryColors.cash],
    )
  );

  const categoryDonutSeries = createMemo(() => {
    const allocations = activeCategoryAllocations();
    return [allocations.stocks, allocations.idx, allocations.crypto, allocations.cash];
  });

  const categoryAllocationItems = createMemo(() => {
    const market = props.allocations.market || {
      stocks: props.allocations.stocks,
      idx: props.allocations.idx,
      crypto: props.allocations.crypto,
      cash: props.allocations.cash,
    };
    const cost = props.allocations.cost || market;
    const marketValues = props.allocations.marketValues;
    const costValues = props.allocations.costValues;
    const drift = props.allocations.drift || { stocks: 0, idx: 0, crypto: 0, cash: 0 };

    return [
      { ticker: "Stocks", percentage: market.stocks, costPercentage: cost.stocks, marketValue: marketValues.stocks, costValue: costValues.stocks, drift: drift.stocks, color: categoryColors.stocks },
      { ticker: "IDX", percentage: market.idx, costPercentage: cost.idx, marketValue: marketValues.idx, costValue: costValues.idx, drift: drift.idx, color: categoryColors.idx },
      { ticker: "Crypto", percentage: market.crypto, costPercentage: cost.crypto, marketValue: marketValues.crypto, costValue: costValues.crypto, drift: drift.crypto, color: categoryColors.crypto },
      { ticker: "Cash", percentage: market.cash, costPercentage: cost.cash, marketValue: marketValues.cash, costValue: costValues.cash, drift: drift.cash, color: categoryColors.cash },
    ].sort((a, b) => {
      const aValue = allocBasis() === "cost" ? a.costPercentage : a.percentage;
      const bValue = allocBasis() === "cost" ? b.costPercentage : b.percentage;
      return bValue - aValue;
    });
  });

  return (
    <div class="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Asset Allocation Card */}
      <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium flex flex-col group transition-all h-[280px] overflow-hidden">
        <div class="flex items-center justify-between mb-4 gap-2 shrink-0 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="material-icons text-forest !text-xl">pie_chart</span>
            <h3 class="text-xs sm:text-sm font-outfit font-bold text-forest uppercase tracking-wider shrink-0">
              Asset Allocation
            </h3>
          </div>
          
          <div class="flex items-center justify-end gap-2 flex-wrap">
            {/* Market vs Cost basis pill toggle */}
            <div class="flex bg-sage/50 p-1 rounded-xl border border-forest/10 shrink-0">
              <button
                onClick={() => setAllocBasis("market")}
                class="px-2.5 py-1 rounded-lg text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
                classList={{
                  "bg-forest text-white shadow-xs": allocBasis() === "market",
                  "text-earth hover:text-forest": allocBasis() !== "market",
                }}
              >
                Market
              </button>
              <button
                onClick={() => setAllocBasis("cost")}
                class="px-2.5 py-1 rounded-lg text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
                classList={{
                  "bg-forest text-white shadow-xs": allocBasis() === "cost",
                  "text-earth hover:text-forest": allocBasis() !== "cost",
                }}
              >
                Cost
              </button>
            </div>

            {/* Category vs Detail toggle */}
            <div class="flex bg-sage/50 p-1 rounded-xl border border-forest/10 shrink-0">
              <button
                onClick={() => props.setAllocationView("category")}
                class="px-2.5 py-1 rounded-lg text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
                classList={{
                  "bg-forest text-white shadow-xs": props.allocationView === "category",
                  "text-earth hover:text-forest": props.allocationView !== "category",
                }}
              >
                Category
              </button>
              <button
                onClick={() => props.setAllocationView("detail")}
                class="px-2.5 py-1 rounded-lg text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
                classList={{
                  "bg-forest text-white shadow-xs": props.allocationView === "detail",
                  "text-earth hover:text-forest": props.allocationView !== "detail",
                }}
              >
                Detail
              </button>
            </div>
          </div>
        </div>

        <Show
          when={props.allocationView === "category"}
          fallback={
            /* Detail view: ApexCharts donut + scrollable ticker list with Market, Cost & Drift */
            <div class="flex-1 min-h-0 grid grid-cols-2 gap-4">
              <div class="relative min-w-0 min-h-0 h-full">
                <SolidApexCharts
                  options={detailDonutOptions()}
                  series={detailDonutSeries()}
                  type="donut"
                  height="100%"
                />
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div class="flex flex-col items-center font-outfit">
                    <span class="text-[8px] text-earth uppercase font-semibold">
                      {allocBasis() === "market" ? "Mkt Value" : "Cost Basis"}
                    </span>
                    <span class="text-xs text-forest font-bold">100%</span>
                  </div>
                </div>
              </div>

              <div class="min-w-0 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar-thin -mr-1 pr-1 space-y-1">
                <For each={props.detailAllocations}>
                  {(item) => {
                    const drift = item.drift ?? 0;
                    const isPos = drift >= 0;
                    return (
                      <div class="flex items-center justify-between group hover:bg-sage/40 px-2 py-1 rounded-lg transition-all">
                        <div class="flex items-center gap-2 min-w-0 flex-1 mr-1">
                          <div
                            class="w-1.5 h-6 rounded-full shrink-0"
                            style={{ "background-color": item.color }}
                          />
                          <div class="flex flex-col min-w-0 overflow-hidden">
                            <span class="text-xs font-outfit font-bold text-near-black group-hover:text-forest transition-colors leading-tight truncate">
                              {item.ticker}
                            </span>
                            <div class="flex items-center gap-1.5 text-[9px] text-earth/70 font-mono mt-0.5">
                              <span>{item.percentage.toFixed(1)}%</span>
                              <span>·</span>
                              <span>{(item.costPercentage ?? item.percentage).toFixed(1)}% Cost</span>
                            </div>
                          </div>
                        </div>
                        <div class="flex flex-col items-end shrink-0 gap-0.5">
                          <div class="flex items-center gap-1.5 font-outfit font-bold">
                            <span class="text-xs text-forest">
                              {allocBasis() === "market"
                                ? item.percentage.toFixed(1)
                                : (item.costPercentage ?? item.percentage).toFixed(1)}%
                            </span>
                            <span
                              class={`text-[8.5px] px-1.5 py-0.25 rounded-full font-bold font-mono ${
                                isPos
                                  ? "bg-emerald-500/10 text-emerald-700"
                                  : "bg-rose-500/10 text-rose-600"
                              }`}
                              title="Allocation Drift (Market % − Cost %)"
                            >
                              {isPos ? "+" : ""}{drift.toFixed(1)}%
                            </span>
                          </div>
                          <span class="text-[9px] font-semibold text-earth/70 truncate max-w-[100px]">
                            {props.formatVal(
                              allocBasis() === "cost"
                                ? (item.costBasis ?? item.value)
                                : item.value
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          }
        >
          {/* Category view: ApexCharts donut + scrollable category list with Market, Cost & Drift */}
          <div class="flex-1 min-h-0 grid grid-cols-2 gap-4">
            <div class="relative min-w-0 min-h-0 h-full">
              <SolidApexCharts
                options={categoryDonutOptions()}
                series={categoryDonutSeries()}
                type="donut"
                height="100%"
              />
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="flex flex-col items-center font-outfit">
                  <span class="text-[8px] text-earth uppercase font-semibold">
                    {allocBasis() === "market" ? "Mkt Value" : "Cost Basis"}
                  </span>
                  <span class="text-xs text-forest font-bold">100%</span>
                </div>
              </div>
            </div>

            <div class="min-w-0 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar-thin -mr-1 pr-1 space-y-1">
              <For each={categoryAllocationItems()}>
                {(item) => {
                  const isPos = item.drift >= 0;
                  const selectedPercentage = () =>
                    allocBasis() === "market" ? item.percentage : item.costPercentage;

                  return (
                    <div class="flex items-center justify-between group hover:bg-sage/40 px-2 py-1 rounded-lg transition-all">
                      <div class="flex items-center gap-2 min-w-0 flex-1 mr-1">
                        <div
                          class="w-1.5 h-6 rounded-full shrink-0"
                          style={{ "background-color": item.color }}
                        />
                        <div class="flex flex-col min-w-0 overflow-hidden">
                          <span class="text-xs font-outfit font-bold text-near-black group-hover:text-forest transition-colors leading-tight truncate">
                            {item.ticker}
                          </span>
                          <div class="flex items-center gap-1.5 text-[9px] text-earth/70 font-mono mt-0.5">
                            <span>{item.percentage.toFixed(1)}%</span>
                            <span>·</span>
                            <span>{item.costPercentage.toFixed(1)}% Cost</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex flex-col items-end shrink-0 gap-0.5">
                        <div class="flex items-center gap-1.5 font-outfit font-bold">
                          <span class="text-xs text-forest">{selectedPercentage().toFixed(1)}%</span>
                          <span
                            class={`text-[8.5px] px-1.5 py-0.25 rounded-full font-bold font-mono ${
                              isPos
                                ? "bg-emerald-500/10 text-emerald-700"
                                : "bg-rose-500/10 text-rose-600"
                            }`}
                            title="Allocation Drift (Market % − Cost %)"
                          >
                            {isPos ? "+" : ""}{item.drift.toFixed(1)}%
                          </span>
                        </div>
                        <span class="text-[9px] font-semibold text-earth/70 truncate max-w-[100px]">
                          {props.formatVal(
                            allocBasis() === "cost" ? item.costValue : item.marketValue
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>

      {/* Performance Trend */}
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
                      {positive() ? "+" : ""}{props.formatVal(kpi().change)}
                    </span>
                    <span
                      class={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        positive() ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-600"
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
            <For each={["1D", "1W", "1M", "1Y", "ALL"] as PerfPeriod[]}>
              {(p) => {
                const active = () => props.perfPeriod === p;
                return (
                  <button
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
          background: transparent;
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
