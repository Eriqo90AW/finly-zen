import {
  createSignal,
  createMemo,
  onMount,
  onCleanup,
  For,
  Show,
  untrack,
} from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { formatPortfolioValue } from "../../../utils/format";
import { portfolioState } from "../../../store/portfolioStore";
import type { PortfolioHistoryPoint } from "../../../types";

interface PerformanceHistoryChartProps {
  history?: PortfolioHistoryPoint[];
}

export const PerformanceHistoryChart = (
  props: PerformanceHistoryChartProps,
) => {
  const currency = () => portfolioState.currencyView;
  const periods = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
  const [selectedPeriod, setSelectedPeriod] =
    createSignal<(typeof periods)[number]>("ALL");
  const [chartReady, setChartReady] = createSignal(false);

  onMount(() => {
    const timer = setTimeout(() => setChartReady(true), 80);
    onCleanup(() => clearTimeout(timer));
  });

  const latestDate = createMemo(() => {
    const history = props.history || [];
    if (history.length === 0) return new Date();
    return new Date(history[history.length - 1].date);
  });

  const filteredHistory = createMemo(() => {
    const history = props.history || [];
    const period = selectedPeriod();
    if (period === "ALL" || history.length === 0) return history;

    const baseDate = latestDate();
    const cutoff = new Date(baseDate);

    if (period === "1W") cutoff.setDate(baseDate.getDate() - 7);
    else if (period === "1M") cutoff.setMonth(baseDate.getMonth() - 1);
    else if (period === "3M") cutoff.setMonth(baseDate.getMonth() - 3);
    else if (period === "6M") cutoff.setMonth(baseDate.getMonth() - 6);
    else if (period === "1Y") cutoff.setFullYear(baseDate.getFullYear() - 1);

    return history.filter((h) => new Date(h.date) >= cutoff);
  });

  // Period change calculations
  const periodStats = createMemo(() => {
    const list = filteredHistory();
    if (list.length < 2) return null;
    const initial = list[0].value;
    const final = list[list.length - 1].value;
    const change = final - initial;
    const percentage = initial > 0 ? (change / initial) * 100 : 0;
    return { change, percentage };
  });

  const lineCategories = createMemo(() => filteredHistory().map((h) => h.date));
  const lineSeriesData = createMemo(() =>
    filteredHistory().map((h) => h.value),
  );

  const lineSeries = createMemo(() => [
    {
      name: "Portfolio Value",
      data: lineSeriesData(),
    },
  ]);

  const lineOptions = createMemo(
    (): ApexOptions => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        sparkline: { enabled: false },
        zoom: { enabled: false },
        animations: {
          enabled: false,
        },
        dropShadow: {
          enabled: false,
        },
      },
      dataLabels: { enabled: false },
      colors: ["#1A4D2E"],
      stroke: {
        curve: "smooth",
        width: 2.5,
        colors: ["#1A4D2E"],
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0,
          stops: [0, 95, 100],
          colorStops: [
            { offset: 0, color: "#1A4D2E", opacity: 0.25 },
            { offset: 100, color: "#1A4D2E", opacity: 0 },
          ],
        },
      },
      markers: {
        size: 0,
        colors: ["#1A4D2E"],
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: { size: 5 },
      },
      xaxis: {
        type: "datetime",
        categories: lineCategories(),
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: {
          enabled: false,
        },
        labels: {
          style: {
            colors: "#5C6B5E",
            fontFamily: "Outfit",
            fontSize: "10px",
            fontWeight: 600,
          },
          datetimeFormatter: {
            year: "yyyy",
            month: "MMM 'yy",
            day: "dd MMM",
            hour: "HH:mm",
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#5C6B5E",
            fontFamily: "Outfit",
            fontSize: "10px",
            fontWeight: 600,
          },
          formatter: (val) =>
            formatPortfolioValue(
              val,
              untrack(() => currency()),
              true,
            ),
        },
      },
      grid: {
        show: true,
        borderColor: "#f1f5f9",
        strokeDashArray: 4,
        padding: { left: 10, right: 10, bottom: 0, top: 0 },
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      tooltip: {
        shared: true,
        intersect: false,
        custom: function ({ series, seriesIndex, dataPointIndex }) {
          const val = series[seriesIndex][dataPointIndex];
          const historyPoint = untrack(() => filteredHistory())[dataPointIndex];
          if (!historyPoint) return "";
          const dateStr = historyPoint.date;
          const d = new Date(dateStr);
          const fullDate = d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          return `
          <div class="px-4 py-3 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 min-w-[180px] border border-white/5">
            <span class="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold mb-1">${fullDate}</span>
            <div class="flex justify-between items-center gap-6">
              <span class="flex items-center gap-2 text-white/80">
                <span class="w-2 h-2 rounded-full bg-[#52C278] shadow-[0_0_8px_rgba(82,194,120,0.6)]"></span> 
                Net Worth
              </span>
              <span class="font-bold text-sm tracking-tight text-[#52C278]">
                ${formatPortfolioValue(
                  val,
                  untrack(() => currency()),
                )}
              </span>
            </div>
          </div>
        `;
        },
      },
    }),
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
          <For each={periods}>
            {(period) => {
              const isActive = () => selectedPeriod() === period;
              return (
                <button
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
            const isGain = () => stats().change >= 0;
            return (
              <div class="flex items-center gap-1.5 mt-4 justify-center md:justify-start text-xs font-outfit">
                <div
                  class={`px-2 py-0.5 rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 ${isGain() ? "bg-spring/10 text-spring border border-spring/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}
                >
                  <span class="material-icons !text-sm">
                    {isGain() ? "trending_up" : "trending_down"}
                  </span>
                  {isGain() ? "+" : ""}
                  {formatPortfolioValue(stats().change, currency())}
                </div>
                <span
                  class={`text-xs font-bold ${isGain() ? "text-spring" : "text-red-500"}`}
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
