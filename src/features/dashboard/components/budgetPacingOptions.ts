import type { ApexOptions } from "apexcharts";
import { formatRupiahShort } from "../../../utils/format";
import type {
  BudgetPacingPoint,
  BudgetPacingSummary,
} from "./budgetPacingHelpers";

const buildPacingTooltipHtml = (
  actual: number | null | undefined,
  target: number | null | undefined,
  fullDate: string,
): string => {
  let differenceHtml = "";
  if (
    actual !== null &&
    actual !== undefined &&
    target !== null &&
    target !== undefined
  ) {
    const diff = target - actual;
    const isOver = diff < 0;
    const diffText = isOver
      ? `Over by ${formatRupiahShort(Math.abs(diff))}`
      : `Under by ${formatRupiahShort(diff)}`;
    const diffColor = isOver ? "text-red-400" : "text-[#52C278]";
    differenceHtml = `
      <div class="mt-1 pt-2 border-t border-white/10 flex justify-between items-center gap-4">
        <span class="text-white/60">Pacing</span>
        <span class="font-bold ${diffColor}">${diffText}</span>
      </div>
    `;
  }

  return `
    <div class="px-3 py-2 bg-[#1C2B20] text-white text-xs font-outfit rounded-lg shadow-xl flex flex-col gap-1 min-w-[160px]">
      <span class="text-white/60 text-[10px] uppercase tracking-wider mb-1">${fullDate}</span>
      <div class="flex justify-between items-center gap-4">
        <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#52C278]"></span> Actual</span>
        <span class="font-bold">${actual !== null && actual !== undefined ? formatRupiahShort(actual) : "-"}</span>
      </div>
      <div class="flex justify-between items-center gap-4">
        <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#1A4D2E]"></span> Target</span>
        <span class="font-bold">${target !== null && target !== undefined ? formatRupiahShort(target) : "-"}</span>
      </div>
      ${differenceHtml}
    </div>
  `;
};

export const buildBudgetPacingOptions = (
  data: BudgetPacingPoint[],
  summary: BudgetPacingSummary,
): ApexOptions => {
  const { lastActualIndex, lastActual, todayTargetVal } = summary;
  const maxVal = Math.max(
    lastActual,
    data.length > 0 ? data[data.length - 1].target : 0,
  );
  const chartMax = maxVal > 0 ? Math.ceil(maxVal * 1.03) : 1000000;

  return {
    chart: {
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      selection: { enabled: false },
      animations: { enabled: true },
      fontFamily: "Outfit",
      sparkline: { enabled: false },
      parentHeightOffset: 0,
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: [3, 3, 2, 2],
      dashArray: [0, 0, 4, 4],
    },
    fill: {
      type: ["gradient", "gradient", "solid", "solid"],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.2,
        stops: [0, 100],
      },
    },
    colors: ["#1A4D2E", "#52C278", "#1A4D2E", "#52C278"],
    annotations: {
      yaxis: [
        {
          y: todayTargetVal,
          borderColor: "transparent",
          strokeDashArray: 0,
          borderWidth: 0,
          label: {
            text: `Target: ${formatRupiahShort(todayTargetVal)}`,
            position: "right",
            offsetX: -6,
            style: {
              color: "#fff",
              background: "#1A4D2E",
              fontSize: "9px",
              fontFamily: "Outfit",
              padding: { left: 5, right: 5, top: 2, bottom: 2 },
            },
          },
        },
        {
          y: lastActual,
          borderColor: "transparent",
          strokeDashArray: 0,
          borderWidth: 0,
          label: {
            text: `Actual: ${formatRupiahShort(lastActual)}`,
            position: "right",
            offsetX: -6,
            style: {
              color: "#fff",
              background: "#52C278",
              fontSize: "9px",
              fontFamily: "Outfit",
              padding: { left: 5, right: 5, top: 2, bottom: 2 },
            },
          },
        },
      ],
      xaxis:
        lastActualIndex !== -1
          ? [
              {
                x: data[lastActualIndex].date,
                strokeDashArray: 4,
                borderColor: "rgba(26,77,46,0.3)",
                label: {
                  text: "Today",
                  orientation: "horizontal",
                  offsetY: 0,
                  style: {
                    color: "#fff",
                    background: "#1A4D2E",
                    fontSize: "9px",
                    fontFamily: "Outfit",
                    padding: { left: 5, right: 5, top: 2, bottom: 2 },
                  },
                },
              },
            ]
          : [],
    },
    xaxis: {
      categories: data.map((d) => d.date),
      labels: {
        style: { colors: "#5C6B5E", fontSize: "10px", fontFamily: "Outfit" },
        rotate: -45,
        rotateAlways: true,
        hideOverlappingLabels: false,
        trim: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      opposite: true,
      min: 0,
      max: chartMax,
      labels: {
        style: { colors: "#5C6B5E", fontSize: "10px", fontFamily: "Outfit" },
        formatter: (val) => formatRupiahShort(val),
        offsetX: -4,
      },
      tickAmount: 4,
    },
    grid: {
      show: true,
      borderColor: "rgba(26,77,46,0.12)",
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { top: -12, right: 0, bottom: 0, left: 24 },
    },
    markers: { size: 0, hover: { size: 3 } },
    states: {
      hover: { filter: { type: "none" } },
      active: { filter: { type: "none" } },
    },
    tooltip: {
      shared: true,
      intersect: false,
      onDatasetHover: { highlightDataSeries: false },
      custom: ({ series, dataPointIndex }) =>
        buildPacingTooltipHtml(
          series[1][dataPointIndex],
          series[0][dataPointIndex],
          data[dataPointIndex].fullDate,
        ),
    },
    legend: { show: false },
  };
};
