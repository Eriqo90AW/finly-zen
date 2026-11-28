import { createMemo, createSignal, For, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import type { AllocationItem } from "../../../../types";
import type { AllocationBasis, AllocationView, PortfolioAllocations } from "../../types";
import {
  buildCategoryAllocationItems,
  CATEGORY_CHART_COLORS,
  createDonutOptions,
} from "./chartOptions";

interface AllocationChartCardProps {
  allocations: PortfolioAllocations;
  allocationView: AllocationView;
  setAllocationView: (v: AllocationView) => void;
  detailAllocations: AllocationItem[];
  formatVal: (amount: number) => string;
}

export const AllocationChartCard = (props: AllocationChartCardProps) => {
  const [allocBasis, setAllocBasis] = createSignal<AllocationBasis>("market");

  const activeCategoryAllocations = createMemo(() => {
    if (allocBasis() === "cost") {
      return props.allocations.cost;
    }
    return props.allocations.market;
  });

  const detailDonutOptions = createMemo(() =>
    createDonutOptions(
      props.detailAllocations.map((item) => item.ticker),
      props.detailAllocations.map((item) => item.color),
    ),
  );

  const detailDonutSeries = createMemo(() =>
    props.detailAllocations.map((item) =>
      allocBasis() === "cost" ? (item.costPercentage ?? item.percentage) : item.percentage,
    ),
  );

  const categoryDonutOptions = createMemo(() =>
    createDonutOptions(
      ["Stocks", "IDX", "Crypto", "Cash"],
      [
        CATEGORY_CHART_COLORS.stocks,
        CATEGORY_CHART_COLORS.idx,
        CATEGORY_CHART_COLORS.crypto,
        CATEGORY_CHART_COLORS.cash,
      ],
    ),
  );

  const categoryDonutSeries = createMemo(() => {
    const active = activeCategoryAllocations();
    return [active.stocks, active.idx, active.crypto, active.cash];
  });

  const categoryAllocationItems = createMemo(() =>
    buildCategoryAllocationItems(props.allocations, allocBasis()),
  );

  return (
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
              type="button"
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
              type="button"
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
              type="button"
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
              type="button"
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
                              : (item.costPercentage ?? item.percentage).toFixed(1)}
                            %
                          </span>
                          <span
                            class={`text-[8.5px] px-1.5 py-0.25 rounded-full font-bold font-mono ${
                              isPos
                                ? "bg-emerald-500/10 text-emerald-700"
                                : "bg-rose-500/10 text-rose-600"
                            }`}
                            title="Allocation Drift (Market % − Cost %)"
                          >
                            {isPos ? "+" : ""}
                            {drift.toFixed(1)}%
                          </span>
                        </div>
                        <span class="text-[9px] font-semibold text-earth/70 truncate max-w-[100px]">
                          {props.formatVal(
                            allocBasis() === "cost" ? (item.costBasis ?? item.value) : item.value,
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
                          {isPos ? "+" : ""}
                          {item.drift.toFixed(1)}%
                        </span>
                      </div>
                      <span class="text-[9px] font-semibold text-earth/70 truncate max-w-[100px]">
                        {props.formatVal(allocBasis() === "cost" ? item.costValue : item.marketValue)}
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
  );
};
