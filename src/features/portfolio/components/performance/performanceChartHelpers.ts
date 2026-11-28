import type { ApexOptions } from "apexcharts";
import type { PortfolioHistoryPoint } from "../../../../types";
import {
  calculateDisplayGainAndPercentage,
  formatPortfolioValue,
  getUsdRate,
} from "../../../../utils/format";

export const PERFORMANCE_PERIODS = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];

export interface PeriodStats {
  gain: number;
  percentage: number;
  isPositive: boolean;
}

export const filterPerformanceHistory = (
  history: PortfolioHistoryPoint[],
  period: PerformancePeriod,
): PortfolioHistoryPoint[] => {
  if (period === "ALL" || history.length === 0) return history;

  const baseDate = new Date(history[history.length - 1].date);
  const cutoff = new Date(baseDate);

  if (period === "1W") cutoff.setDate(baseDate.getDate() - 7);
  else if (period === "1M") cutoff.setMonth(baseDate.getMonth() - 1);
  else if (period === "3M") cutoff.setMonth(baseDate.getMonth() - 3);
  else if (period === "6M") cutoff.setMonth(baseDate.getMonth() - 6);
  else if (period === "1Y") cutoff.setFullYear(baseDate.getFullYear() - 1);

  return history.filter((h) => new Date(h.date) >= cutoff);
};

export const calculatePeriodStats = (
  list: PortfolioHistoryPoint[],
  period: PerformancePeriod,
  nativeCurr: "IDR" | "USD",
  dispCurr: "IDR" | "USD",
  totalValue: number,
  initialCapital: number,
  priceCurrency: number,
): PeriodStats | null => {
  if (list.length < 2) return null;

  if (period === "ALL") {
    return calculateDisplayGainAndPercentage(
      totalValue,
      initialCapital,
      priceCurrency,
      nativeCurr,
      dispCurr,
    );
  }

  const initial = list[0].value;
  const finalVal = list[list.length - 1].value;

  const convert = (val: number) => {
    if (nativeCurr === "USD" && dispCurr === "IDR") return val * getUsdRate();
    if (nativeCurr === "IDR" && dispCurr === "USD") return val / getUsdRate();
    return val;
  };

  const displayInitial = convert(initial);
  const displayFinal = convert(finalVal);
  const change = displayFinal - displayInitial;
  const percentage = displayInitial > 0 ? (change / displayInitial) * 100 : 0;

  return {
    gain: change,
    percentage,
    isPositive: change >= 0,
  };
};

export const buildPerformanceLineOptions = (
  categories: string[],
  getFilteredHistory: () => PortfolioHistoryPoint[],
  getCurrency: () => "IDR" | "USD",
  nativeCurrency: "IDR" | "USD" | undefined,
): ApexOptions => ({
  chart: {
    type: "area",
    toolbar: { show: false },
    sparkline: { enabled: false },
    zoom: { enabled: false },
    animations: { enabled: false },
    dropShadow: { enabled: false },
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
        formatPortfolioValue(val, getCurrency(), true, nativeCurrency),
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
    custom: ({ series, seriesIndex, dataPointIndex }) => {
      const val = series[seriesIndex][dataPointIndex];
      const historyPoint = getFilteredHistory()[dataPointIndex];
      if (!historyPoint) return "";
      const d = new Date(historyPoint.date);
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
              ${formatPortfolioValue(val, getCurrency(), false, nativeCurrency)}
            </span>
          </div>
        </div>
      `;
    },
  },
});
