import type { ApexOptions } from "apexcharts";
import type { FinancialQuarter, FinancialYear } from "../../../types";
import { formatUSD, formatUSDCompact } from "../../../utils/format";

export type PerformanceMetric = "revenue" | "earnings" | "eps";
export type PerformancePeriod = "annual" | "quarterly";
export type PerformanceItem = FinancialYear | FinancialQuarter;

export interface PerformanceSeriesItem {
  name: string;
  type: string;
  data: number[];
}

export const buildPerformanceSeries = (
  items: PerformanceItem[],
  active: Set<PerformanceMetric>,
  sharesOutstanding: number,
): PerformanceSeriesItem[] => {
  const list: PerformanceSeriesItem[] = [];
  const shares = sharesOutstanding || 1;

  if (active.has("revenue")) {
    list.push({
      name: "Revenue",
      type: "bar",
      data: items.map((f) => f.revenue || 0),
    });
  }
  if (active.has("earnings")) {
    list.push({
      name: "Earnings",
      type: "bar",
      data: items.map((f) => f.earnings || 0),
    });
  }
  if (active.has("eps")) {
    list.push({
      name: "EPS",
      type: active.has("revenue") || active.has("earnings") ? "line" : "bar",
      data: items.map((f) => (f.earnings || 0) / shares),
    });
  }
  return list;
};

export const buildPerformanceChartOptions = (
  items: PerformanceItem[],
  seriesList: PerformanceSeriesItem[],
  active: Set<PerformanceMetric>,
  periodType: PerformancePeriod,
): ApexOptions => ({
  chart: {
    type: "bar",
    toolbar: { show: false },
    fontFamily: "Outfit",
    background: "transparent",
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "45%",
      borderRadius: 6,
      borderRadiusApplication: "end",
    },
  },
  dataLabels: { enabled: false },
  stroke: {
    width: seriesList.map((s) => (s.type === "line" ? 3 : 0)),
    curve: "smooth",
  },
  colors: seriesList.map((s) => {
    if (s.name === "Revenue") return "#6366F1";
    if (s.name === "Earnings") return "#10B981";
    return "#A855F7";
  }),
  xaxis: {
    categories: items.map((f) => ("year" in f ? f.year.toString() : f.period)),
    labels: { style: { colors: "#5C6B5E", fontSize: "12px" } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: !active.has("eps")
    ? {
        labels: {
          style: { colors: "#5C6B5E", fontSize: "10px" },
          formatter: (val) => formatUSDCompact(val),
        },
      }
    : seriesList.map((s, idx) => {
        const isEPS = s.name === "EPS";
        return {
          seriesName: s.name,
          opposite: isEPS,
          show: idx === 0 || isEPS,
          title: {
            text: s.name,
            style: {
              color: isEPS ? "#A855F7" : "#5C6B5E",
              fontFamily: "Outfit",
              fontWeight: "bold",
            },
          },
          labels: {
            style: { colors: isEPS ? "#A855F7" : "#5C6B5E", fontSize: "10px" },
            formatter: (val) => (isEPS ? formatUSD(val, 2) : formatUSDCompact(val)),
          },
        };
      }),
  grid: {
    borderColor: "rgba(26,77,46,0.15)",
    strokeDashArray: 4,
  },
  legend: { show: false },
  tooltip: {
    theme: "dark",
    shared: true,
    intersect: false,
    x: { show: false },
    custom: ({
      series: seriesValues,
      dataPointIndex,
    }: {
      series: number[][];
      dataPointIndex: number;
    }) => {
      const item = items[dataPointIndex];
      const label = "year" in item ? item.year : item.period;
      let rowsHtml = "";

      seriesList.forEach((s, idx) => {
        const val = seriesValues[idx]?.[dataPointIndex] || 0;
        const isEPS = s.name === "EPS";
        const displayValue = isEPS ? formatUSD(val, 2) : formatUSDCompact(val);
        const dotColor =
          s.name === "Revenue" ? "#6366F1" : s.name === "Earnings" ? "#10B981" : "#A855F7";

        let growthInfo = "";
        if (dataPointIndex > 0) {
          const prevValue = seriesValues[idx]?.[dataPointIndex - 1];
          if (prevValue && prevValue !== 0) {
            const growthNum = ((val - prevValue) / Math.abs(prevValue)) * 100;
            const growth = growthNum.toFixed(1);
            growthInfo = `<span style="color: ${growthNum >= 0 ? "#10B981" : "#F43F5E"};">(${growthNum >= 0 ? "+" : ""}${growth}%)</span>`;
          }
        }

        let extraInfo = "";
        if (s.name === "Earnings") {
          const rev = item.revenue;
          const margin = rev !== 0 ? ((item.earnings / rev) * 100).toFixed(1) : "0";
          extraInfo = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; padding-left: 16px; color: rgba(255,255,255,0.4);">
              <span>Net Margin</span>
              <span style="font-weight: 700; color: #10B981;">${margin}%</span>
            </div>
          `;
        }

        rowsHtml += `
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${dotColor}; display: inline-block; flex-shrink: 0;"></span>
                ${s.name}
              </span>
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <span style="font-weight: 700; color: white;">${displayValue}</span>
                ${growthInfo ? `<span style="font-size: 9px; font-weight: 500;">${growthInfo}</span>` : ""}
              </div>
            </div>
            ${extraInfo}
          </div>
          ${idx < seriesList.length - 1 ? '<div style="height: 1px; background: rgba(255,255,255,0.1); margin: 6px 0;"></div>' : ""}
        `;
      });

      return `
        <div style="padding: 16px; background: rgba(28, 43, 32, 0.2); color: white; font-size: 12px; font-family: Outfit, sans-serif; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 8px; width: 240px; border: 1px solid rgba(255,255,255,0.1); box-sizing: border-box;">
          <div style="color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">${label} ${periodType === "annual" ? "Fiscal Year" : "Period"}</div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
            ${rowsHtml}
          </div>
        </div>
      `;
    },
  },
});
