import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  untrack,
} from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { portfolioState } from "../../../../store/portfolioStore";
import type { PortfolioHistoryPoint } from "../../../../types";
import { formatPortfolioValue } from "../../../../utils/format";
import {
  buildPerformanceLineOptions,
  calculatePeriodStats,
  filterPerformanceHistory,
  PERFORMANCE_PERIODS,
  type PerformancePeriod,
} from "./performanceChartHelpers";

interface PerformanceHistoryChartProps {
  history?: PortfolioHistoryPoint[];
  nativeCurrency?: "IDR" | "USD";
  priceCurrency?: number;
  initialCapital?: number;
  totalValue?: number;
}

export const PerformanceHistoryChart = (
  props: PerformanceHistoryChartProps,
) => {
  const currency = () => portfolioState.currencyView;
  const [selectedPeriod, setSelectedPeriod] =
    createSignal<PerformancePeriod>("ALL");
  const [chartReady, setChartReady] = createSignal(false);

  onMount(() => {
    const timer = setTimeout(() => setChartReady(true), 80);
    onCleanup(() => clearTimeout(timer));
  });

  const filteredHistory = createMemo(() =>
    filterPerformanceHistory(props.history || [], selectedPeriod()),
  );

  const periodStats = createMemo(() =>
    calculatePeriodStats(
      filteredHistory(),
      selectedPeriod(),
      props.nativeCurrency ?? "IDR",
      currency(),
      props.totalValue ?? 0,
      props.initialCapital ?? 0,
      props.priceCurrency ?? 1,
    ),
  );

  const lineSeries = createMemo(() => [
    {
      name: "Portfolio Value",
      data: filteredHistory().map((h) => h.value),
    },
  ]);

  const lineOptions = createMemo(() =>
    buildPerformanceLineOptions(
      filteredHistory().map((h) => h.date),
      () => untrack(() => filteredHistory()),
      () => untrack(() => currency()),
      props.nativeCurrency,
    ),
  );

  return (
    <div class="flex-1 flex flex-col h-full">
      {/* Header section with Title and Period Tabs */}
      <div class="flex justify-between items-center mb-1">
        <h4 class="font-outfit font-bold text-forest text-base">
          Performance History
        </h4>

        {/* Period Tabs */}
        <div class="flex bg-sage/40 p-1 rounded-xl border border-forest/5 shadow-inner">
          <For each={PERFORMANCE_PERIODS}>
            {(period) => {
              const isActive = () => selectedPeriod() === period;
              return (
                <button
                  type="button"
                  onClick={() => setSelectedPeriod(period)}
                  class={`px-3 py-1.5 rounded-lg text-[10px] font-outfit font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider ${
                    isActive()
                      ? "bg-forest text-white shadow-sm"
                      : "text-earth/65 hover:text-forest hover:bg-forest/5"
                  }`}
                >
                  {period}
                </button>
              );
            }}
          </For>
        </div>
      </div>

      {/* Period Stats Summary */}
      <div class="mb-4 h-2 flex items-center">
        <Show when={periodStats()}>
          {(stats) => {
            const isGain = () => stats().isPositive;
            return (
              <div class="flex items-center gap-1.5 mt-4 justify-center md:justify-start text-xs font-outfit">
                <div
                  class={`px-2 py-0.5 rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 ${
                    isGain()
                      ? "bg-spring/10 text-spring border border-spring/20"
                      : "bg-red-500/10 text-red-500 border border-red-500/20"
                  }`}
                >
                  <span class="material-icons !text-sm">
                    {isGain() ? "trending_up" : "trending_down"}
                  </span>
                  {isGain() ? "+" : ""}
                  {formatPortfolioValue(
                    stats().gain,
                    currency(),
                    true,
                    currency(),
                  )}
                </div>
                <span
                  class={`text-xs font-bold ${
                    isGain() ? "text-spring" : "text-red-500"
                  }`}
                >
                  ({stats().percentage.toFixed(2)}%)
                </span>
                <span class="text-earth/40 font-medium">Profit / Loss</span>
              </div>
            );
          }}
        </Show>
      </div>

      {/* Chart Canvas */}
      <div class="flex-1 flex flex-col justify-center min-h-0">
        <Show
          when={chartReady() && filteredHistory().length > 0}
          fallback={
            <div class="flex-1 flex flex-col items-center justify-center text-earth/30 font-outfit text-sm italic py-10">
              <span class="material-icons text-4xl text-forest/15 mb-3">
                {chartReady() ? "analytics" : "hourglass_empty"}
              </span>
              {chartReady()
                ? "No history data available for this period"
                : "Loading metrics..."}
            </div>
          }
        >
          <SolidApexCharts
            options={lineOptions()}
            series={lineSeries()}
            type="area"
            height="100%"
          />
        </Show>
      </div>
    </div>
  );
};
