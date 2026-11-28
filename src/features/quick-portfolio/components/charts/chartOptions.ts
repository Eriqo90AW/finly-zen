import { untrack } from "solid-js";
import type { ApexOptions } from "apexcharts";
import type {
  AllocationBasis,
  CategoryAllocationDisplayItem,
  PerfPeriod,
  PerfPoint,
  PortfolioAllocations,
} from "../../types";

export const CATEGORY_CHART_COLORS = {
  stocks: "#1a4d2e",
  idx: "#52c278",
  crypto: "#2d7d46",
  cash: "#cbd5e1",
} as const;

export const createDonutOptions = (labels: string[], colors: string[]): ApexOptions => ({
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

export const buildCategoryAllocationItems = (
  allocations: PortfolioAllocations,
  basis: AllocationBasis,
): CategoryAllocationDisplayItem[] => {
  const market = allocations.market;
  const cost = allocations.cost;
  const marketValues = allocations.marketValues;
  const costValues = allocations.costValues;
  const drift = allocations.drift;

  return [
    {
      ticker: "Stocks",
      percentage: market.stocks,
      costPercentage: cost.stocks,
      marketValue: marketValues.stocks,
      costValue: costValues.stocks,
      drift: drift.stocks,
      color: CATEGORY_CHART_COLORS.stocks,
    },
    {
      ticker: "IDX",
      percentage: market.idx,
      costPercentage: cost.idx,
      marketValue: marketValues.idx,
      costValue: costValues.idx,
      drift: drift.idx,
      color: CATEGORY_CHART_COLORS.idx,
    },
    {
      ticker: "Crypto",
      percentage: market.crypto,
      costPercentage: cost.crypto,
      marketValue: marketValues.crypto,
      costValue: costValues.crypto,
      drift: drift.crypto,
      color: CATEGORY_CHART_COLORS.crypto,
    },
    {
      ticker: "Cash",
      percentage: market.cash,
      costPercentage: cost.cash,
      marketValue: marketValues.cash,
      costValue: costValues.cash,
      drift: drift.cash,
      color: CATEGORY_CHART_COLORS.cash,
    },
  ].sort((a, b) => {
    const aValue = basis === "cost" ? a.costPercentage : a.percentage;
    const bValue = basis === "cost" ? b.costPercentage : b.percentage;
    return bValue - aValue;
  });
};

export const buildPerfChartOptions = (
  series: PerfPoint[],
  period: PerfPeriod,
  getSeries: () => PerfPoint[],
  formatVal: (amount: number, isShort?: boolean) => string,
): ApexOptions => {
  const categories = series.map((p) => new Date(p.date).toISOString());
  const dateFormatter =
    period === "1D"
      ? { hour: "HH:mm" }
      : period === "1W"
        ? { day: "dd MMM", hour: "HH:mm" }
        : { day: "dd MMM" };

  return {
    chart: {
      type: "area",
      toolbar: { show: false },
      sparkline: { enabled: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 400 },
      fontFamily: "Outfit, system-ui, sans-serif",
      background: "transparent",
      dropShadow: { enabled: false },
    },
    dataLabels: { enabled: false },
    colors: ["#1A4D2E"],
    stroke: { curve: "smooth", width: 2.5, colors: ["#1A4D2E"] },
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
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
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
          ...dateFormatter,
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
        formatter: (val) => formatVal(Number(val), true),
      },
    },
    grid: {
      show: true,
      borderColor: "#EEF2EE",
      strokeDashArray: 4,
      padding: { left: 10, right: 10, top: 0, bottom: 0 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ series: tooltipSeries, seriesIndex, dataPointIndex }) => {
        const val = tooltipSeries[seriesIndex][dataPointIndex];
        const point = untrack(getSeries)[dataPointIndex];
        if (!point) return "";
        const d = new Date(point.date);
        const fullDate = d.toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
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
                ${formatVal(Number(val))}
              </span>
            </div>
          </div>
        `;
      },
    },
  };
};
