import type { ApexOptions } from "apexcharts";
import { formatPortfolioValue } from "../../../../utils/format";
import {
  type CumulativePnLPoint,
  formatAreaChartValue,
} from "./tradeHistoryHelpers";

export const buildAreaChartOptions = (
  data: CumulativePnLPoint[],
  nativeCurrency: "IDR" | "USD",
  getCurrency: () => "IDR" | "USD",
): ApexOptions => {
  const isPositive = data.length > 0 ? data[data.length - 1].value >= 0 : true;
  const mainColor = isPositive ? "#52C278" : "#f43f5e";

  return {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "Outfit",
      animations: { enabled: true, speed: 500 },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) =>
        formatAreaChartValue(Number(val), nativeCurrency, getCurrency()),
      style: {
        fontFamily: "Outfit",
        fontWeight: 700,
        fontSize: "10px",
      },
    },
    colors: [mainColor],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 95],
      },
    },
    stroke: { curve: "smooth", width: 2.5 },
    xaxis: {
      categories: data.map((d) => d.date),
      labels: {
        style: { colors: "#5C6B5E", fontFamily: "Outfit", fontSize: "10px" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#5C6B5E", fontFamily: "Outfit", fontSize: "10px" },
        formatter: (val) =>
          formatAreaChartValue(val, nativeCurrency, getCurrency()),
      },
    },
    grid: { borderColor: "rgba(26, 77, 46, 0.06)", strokeDashArray: 4 },
    tooltip: {
      theme: "dark",
      x: { show: true },
      y: {
        formatter: (val) =>
          formatAreaChartValue(val, nativeCurrency, getCurrency()),
      },
    },
  };
};

export const buildStackedBarOptions = (categories: string[]): ApexOptions => ({
  chart: {
    type: "bar",
    stacked: true,
    toolbar: { show: false },
    fontFamily: "Outfit",
    animations: { enabled: true },
  },
  colors: ["#52C278", "#f43f5e", "#6366f1"],
  plotOptions: {
    bar: { borderRadius: 4, columnWidth: "45%" },
  },
  xaxis: {
    categories,
    labels: {
      style: { colors: "#5C6B5E", fontFamily: "Outfit", fontSize: "10px" },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: "#5C6B5E", fontFamily: "Outfit", fontSize: "10px" },
    },
  },
  grid: { borderColor: "rgba(26, 77, 46, 0.06)", strokeDashArray: 4 },
  legend: {
    position: "top",
    horizontalAlign: "right",
    fontFamily: "Outfit",
    fontSize: "11px",
  },
  tooltip: { theme: "dark" },
});

export const buildVolumeDonutOptions = (
  nativeCurrency: "IDR" | "USD",
  getCurrency: () => "IDR" | "USD",
): ApexOptions => ({
  chart: { type: "donut", fontFamily: "Outfit" },
  colors: ["#52C278", "#f43f5e", "#6366f1"],
  labels: ["Buy Volume", "Sell Volume", "Dividend Income"],
  stroke: { show: false },
  legend: {
    position: "bottom",
    fontFamily: "Outfit",
    fontSize: "10px",
  },
  plotOptions: {
    pie: {
      donut: {
        size: "70%",
        labels: {
          show: true,
          name: {
            show: true,
            fontSize: "11px",
            fontFamily: "Outfit",
            color: "#5C6B5E",
          },
          value: {
            show: true,
            fontSize: "15px",
            fontFamily: "Outfit",
            fontWeight: "bold",
            color: "#1a4d2e",
            formatter: (val) =>
              formatPortfolioValue(
                Number(val),
                getCurrency(),
                true,
                nativeCurrency,
              ),
          },
          total: {
            show: true,
            label: "Flow Vol",
            fontFamily: "Outfit",
            color: "#5C6B5E",
            formatter: (w: { globals: { seriesTotals: number[] } }) => {
              const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              return formatPortfolioValue(
                sum,
                getCurrency(),
                true,
                nativeCurrency,
              );
            },
          },
        },
      },
    },
  },
  tooltip: {
    theme: "dark",
    y: {
      formatter: (val) =>
        formatPortfolioValue(val, getCurrency(), false, nativeCurrency),
    },
  },
});

export const buildTickerPnLBarOptions = (
  categories: string[],
  barColors: string[],
  nativeCurrency: "IDR" | "USD",
  getCurrency: () => "IDR" | "USD",
): ApexOptions => ({
  chart: {
    type: "bar",
    toolbar: { show: false },
    fontFamily: "Outfit",
    animations: { enabled: true, speed: 500 },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: "60%",
      distributed: true,
      borderRadius: 4,
      dataLabels: { position: "top" },
    },
  },
  dataLabels: {
    enabled: true,
    textAnchor: "start",
    offsetX: 8,
    style: {
      colors: ["#5C6B5E"],
      fontFamily: "Outfit",
      fontWeight: 700,
      fontSize: "11px",
    },
    formatter: (val: string | number | number[]) =>
      formatPortfolioValue(Number(val), getCurrency(), true, nativeCurrency),
  },
  colors: barColors,
  xaxis: {
    categories,
    labels: {
      style: {
        colors: "#5C6B5E",
        fontFamily: "Outfit",
        fontSize: "10px",
        fontWeight: 600,
      },
      formatter: (val) =>
        formatPortfolioValue(Number(val), getCurrency(), true, nativeCurrency),
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: {
        colors: "#1A4D2E",
        fontFamily: "Outfit",
        fontSize: "11px",
        fontWeight: 700,
      },
    },
  },
  grid: {
    show: true,
    borderColor: "rgba(26, 77, 46, 0.06)",
    strokeDashArray: 4,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } },
  },
  tooltip: {
    theme: "dark",
    custom: ({ series, seriesIndex, dataPointIndex }) => {
      const val = series[seriesIndex][dataPointIndex];
      const ticker = categories[dataPointIndex];
      const isPositive = val >= 0;
      return `
        <div class="px-4 py-3 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-1 min-w-[160px] border border-white/5">
          <span class="font-bold text-sm text-white">${ticker}</span>
          <div class="flex justify-between items-center gap-4 mt-1">
            <span class="text-white/60">Realized PnL</span>
            <span class="font-bold ${isPositive ? "text-[#52C278]" : "text-[#f43f5e]"}">
              ${formatPortfolioValue(val, getCurrency(), false, nativeCurrency)}
            </span>
          </div>
        </div>
      `;
    },
  },
  legend: { show: false },
});
