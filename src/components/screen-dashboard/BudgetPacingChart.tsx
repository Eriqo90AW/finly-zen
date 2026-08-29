import { createSignal, createMemo, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { state } from "../../store";
import { getDateRange } from "../../utils/date";
import { formatRupiah, formatRupiahShort } from "../../utils/format";
import { Tooltip } from "../modules/Tooltip";
import { EditDailyBudgetModal } from "./modules/EditDailyBudgetModal";
import type { BudgetPacingChartProps } from "../../types";

export const BudgetPacingChart = (props: BudgetPacingChartProps) => {
  const [isEditBudgetOpen, setIsEditBudgetOpen] = createSignal(false);
  const chartData = createMemo(() => {
    const { start, end } = getDateRange(
      state.ui.currentMonth,
      state.ui.datePeriod,
    );
    const data = props.transactions || [];

    const days: Date[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let cumulativeActual = 0;
    const dailyBudgetVal = props.dailyBudget();

    return days.map((d, index) => {
      const isFuture = d > today;

      const y = d.getFullYear();
      const m = d.getMonth();
      const date = d.getDate();

      if (!isFuture) {
        const dayTransactions = data.filter((t) => {
          const td = new Date(t.date);
          return (
            td.getFullYear() === y &&
            td.getMonth() === m &&
            td.getDate() === date
          );
        });

        const dailyExpense = dayTransactions.reduce((acc, t) => {
          if (t.type === "expense" && t.category?.toLowerCase() !== "transfer") return acc + t.amount;
          return acc;
        }, 0);

        cumulativeActual += dailyExpense;
      }

      return {
        date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        fullDate: d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        target: (index + 1) * dailyBudgetVal,
        actual: isFuture ? null : cumulativeActual,
        isFuture,
      };
    });
  });

  const chartComputed = createMemo(() => {
    const data = chartData();
    let lastActualIndex = -1;
    let lastActual = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].actual !== null) {
        lastActual = data[i].actual as number;
        lastActualIndex = i;
        break;
      }
    }
    const todayTargetVal =
      lastActualIndex !== -1
        ? data[lastActualIndex].target
        : data.length > 0
          ? data[0].target
          : 0;
    return { lastActualIndex, lastActual, todayTargetVal };
  });

  const chartOptions = (): ApexOptions => {
    const data = chartData();
    const { lastActualIndex, lastActual, todayTargetVal } = chartComputed();

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
      colors: ["#1A4D2E", "#52C278", "#1A4D2E", "#52C278"], // Forest for Target, Spring for Actual
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
          rotate: 0,
          rotateAlways: false,
          hideOverlappingLabels: true,
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
        xaxis: {
          lines: { show: true },
        },
        yaxis: {
          lines: { show: true },
        },
        padding: {
          top: -12,
          right: 0,
          bottom: 0,
          left: 4,
        },
      },
      markers: {
        size: 0,
        hover: {
          size: 3,
        },
      },
      states: {
        hover: {
          filter: {
            type: "none",
          },
        },
        active: {
          filter: {
            type: "none",
          },
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        onDatasetHover: {
          highlightDataSeries: false,
        },
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          const actual = series[1][dataPointIndex];
          const target = series[0][dataPointIndex];
          const fullDate = data[dataPointIndex].fullDate;

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
        },
      },
      legend: {
        show: false,
      },
    };
  };

  return (
    <div class="premium-card p-3.5 sm:p-5 lg:p-6 flex flex-col relative h-full">
      <div class="flex items-start justify-between gap-2 mb-1 sm:mb-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h4 class="font-outfit font-bold text-forest text-sm sm:text-base lg:text-lg whitespace-nowrap">
              Expense Pacing
            </h4>
            <div class="flex items-center gap-2 text-[10px] sm:text-xs text-forest/80 shrink-0">
              <span class="flex items-center gap-1 font-medium whitespace-nowrap">
                <span class="w-2 h-2 rounded-full bg-[#1A4D2E]"></span> Target
              </span>
              <span class="flex items-center gap-1 font-medium whitespace-nowrap">
                <span class="w-2 h-2 rounded-full bg-[#52C278]"></span> Actual
              </span>
            </div>
          </div>
          <p class="text-[10px] sm:text-xs text-earth/60">
            Cumulative spending vs monthly target
          </p>
        </div>
        <Tooltip content="Click to edit budget">
          <div
            class="text-right cursor-pointer group/target transition-colors shrink-0 ml-auto whitespace-nowrap"
            onClick={() => setIsEditBudgetOpen(true)}
          >
            <div class="text-[9px] sm:text-[10px] font-bold text-earth group-hover/target:text-forest uppercase tracking-wider flex items-center justify-end gap-1 whitespace-nowrap">
              <span class="material-icons text-[10px] opacity-0 group-hover/target:opacity-100 transition-opacity">
                edit
              </span>
              <span class="whitespace-nowrap">Target Budget</span>
            </div>
            <div class="text-xs sm:text-sm font-bold text-forest group-hover/target:text-mid-green transition-colors whitespace-nowrap">
              {formatRupiah(chartData()[chartData().length - 1]?.target || 0)}
            </div>
          </div>
        </Tooltip>
      </div>

      <div class="flex-1 min-h-[240px] sm:min-h-[260px] w-full">
        <Show
          when={!props.loading}
          fallback={
            <div class="w-full h-full flex items-center justify-center text-earth/30">
              Calculating projections...
            </div>
          }
        >
          <SolidApexCharts
            type="line"
            options={chartOptions()}
            series={[
              {
                name: "Target",
                type: "area",
                data: chartData().map((d) => d.target),
              },
              {
                name: "Actual",
                type: "area",
                data: chartData().map((d) => d.actual),
              },
              {
                name: "Target Projection",
                type: "line",
                data: chartData().map((d, i) =>
                  i >= Math.max(0, chartComputed().lastActualIndex)
                    ? chartComputed().todayTargetVal
                    : null,
                ),
              },
              {
                name: "Actual Projection",
                type: "line",
                data: chartData().map((d, i) =>
                  i >= Math.max(0, chartComputed().lastActualIndex)
                    ? chartComputed().lastActual
                    : null,
                ),
              },
            ]}
            height="100%"
          />
        </Show>
      </div>

      <EditDailyBudgetModal
        isOpen={isEditBudgetOpen()}
        onClose={() => setIsEditBudgetOpen(false)}
        currentBudget={props.dailyBudget()}
        onSave={(newBudget) => {
          if (props.setDailyBudget) {
            props.setDailyBudget(newBudget);
          }
        }}
        title="Edit Target Budget"
        subtitle="Set your target daily budget. Cumulative monthly target pacing updates automatically."
      />
    </div>
  );
};
