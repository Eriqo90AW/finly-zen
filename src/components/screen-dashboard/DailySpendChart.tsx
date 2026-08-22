import { createSignal, createMemo, createEffect, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { state } from "../../store";
import { Tooltip } from "../modules/Tooltip";
import { getDateRange } from "../../utils/date";
import { formatRupiah, formatRupiahShort } from "../../utils/format";
import { EditDailyBudgetModal } from "./modules/EditDailyBudgetModal";
import type { DailySpendChartProps } from "../../types";

export const DailySpendChart = (props: DailySpendChartProps) => {
  const [dayOffset, setDayOffset] = createSignal(0);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = createSignal(false);

  // Reset offset when month or datePeriod changes
  createEffect(() => {
    state.ui.currentMonth;
    state.ui.datePeriod;
    setDayOffset(0);
  });

  const chartData = createMemo(() => {
    const data = props.transactions || [];
    const { end: periodEnd } = getDateRange(
      state.ui.currentMonth,
      state.ui.datePeriod,
    );

    // Use the period end as the base reference, but don't go past today if period includes today
    const now = new Date();
    const baseReferenceDate = periodEnd > now ? now : periodEnd;

    // Apply offset in days
    const referenceDate = new Date(baseReferenceDate);
    referenceDate.setDate(referenceDate.getDate() + dayOffset());

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - (6 - i));

      const y = d.getFullYear();
      const m = d.getMonth();
      const date = d.getDate();

      const dayTransactions = data.filter((t) => {
        const td = new Date(t.date);
        return (
          td.getFullYear() === y && td.getMonth() === m && td.getDate() === date
        );
      });

      const amount = dayTransactions.reduce((acc, t) => {
        if (t.isRecurring) return acc;
        if (t.type === "expense") return acc + t.amount;
        if (t.type === "income") return acc - t.amount;
        return acc;
      }, 0);

      return {
        date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        amount,
      };
    });
    return last7Days;
  });

  const barChartOptions = (): ApexOptions => ({
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: true },
      events: {
        updated: (chartContext: any) => {
          const el = chartContext.el;
          const annotations = el?.querySelector(
            ".apexcharts-yaxis-annotations",
          );
          const parent = annotations?.parentNode;
          if (annotations && parent) {
            parent.appendChild(annotations);
          }
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        borderRadiusApplication: "end",
        columnWidth: "60%",
        distributed: true,
      },
    },
    // Color logic: red if > 1jt or > daily budget
    colors: chartData().map((d) =>
      d.amount > 1000000 || d.amount > props.dailyBudget()
        ? "#EF4444"
        : "#52C278",
    ),
    dataLabels: { enabled: false },
    tooltip: {
      shared: true,
      intersect: false,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const val = series[seriesIndex][dataPointIndex];
        const category = w.globals.labels[dataPointIndex];
        return `
          <div class="px-3 py-1.5 bg-near-black text-white text-xs font-outfit rounded-lg shadow-xl flex flex-col items-center whitespace-nowrap">
            <span class="text-white/80 text-[10px] uppercase tracking-wider mb-0.5">${category}</span>
            <span class="font-bold">${formatRupiahShort(val)}</span>
          </div>
        `;
      },
    },
    xaxis: {
      categories: chartData().map((d) => d.date),
      labels: { style: { colors: "#5C6B5E", fontFamily: "Outfit" } },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: 500000,
      tickAmount: 5, // 1,000,000 / 5 = 200,000
      labels: {
        style: { colors: "#5C6B5E", fontFamily: "Outfit" },
        formatter: (value) => (value < 0 ? "" : formatRupiahShort(value)),
      },
    },
    grid: { borderColor: "rgba(26,77,46,0.05)" },
    annotations: {
      yaxis: [
        {
          y: props.dailyBudget(),
          borderColor: "#1A4D2E",
          position: "front",
          label: {
            text: "Budget",
            style: { background: "#1A4D2E", color: "#fff" },
          },
        } as any,
      ],
    },
    legend: { show: false },
  });

  return (
    <div class="w-full flex-1 premium-card px-3 py-3.5 sm:py-4 flex flex-col relative cursor-default min-h-[280px] lg:h-[320px]">
      <style>
        {`
          .apexcharts-tooltip {
            top: 50% !important;
            transform: translate(50%, -50%) !important;
            transition: left 0.1s ease-out !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            pointer-events: none !important;
          }
          .apexcharts-tooltip.apexcharts-active {
            margin: 0 !important;
          }
        `}
      </style>
      <div class="flex items-center justify-between mb-3 sm:mb-4 mx-3">
        <div class="flex items-center gap-2">
          <h4 class="font-outfit font-bold text-forest">Daily Spend</h4>
          <div class="flex items-center gap-0.5 bg-sage/15 rounded-lg p-0.5 border border-forest/10">
            <button
              onClick={() => setDayOffset((prev) => prev - 1)}
              class="w-6 h-6 rounded-md hover:bg-forest/10 flex items-center justify-center transition-colors text-forest cursor-pointer"
              title="Previous day (shift 1 day back)"
              aria-label="Previous day"
            >
              <span class="material-icons text-sm">chevron_left</span>
            </button>
            <button
              onClick={() => setDayOffset((prev) => Math.min(0, prev + 1))}
              disabled={dayOffset() >= 0}
              class={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                dayOffset() >= 0
                  ? "text-earth/30 cursor-not-allowed"
                  : "hover:bg-forest/10 text-forest cursor-pointer"
              }`}
              title="Next day (shift 1 day forward)"
              aria-label="Next day"
            >
              <span class="material-icons text-sm">chevron_right</span>
            </button>
          </div>
          <Show when={dayOffset() !== 0}>
            <button
              onClick={() => setDayOffset(0)}
              class="text-[10px] font-medium text-forest/70 hover:text-forest bg-forest/5 hover:bg-forest/10 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
              title="Reset to today / latest"
            >
              Today
            </button>
          </Show>
        </div>
        <Tooltip content="Click to edit budget">
          <div
            class="text-[10px] font-bold text-earth hover:text-forest uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-1 group/edit"
            onClick={() => setIsEditBudgetOpen(true)}
          >
            <span class="material-icons text-[10px] opacity-0 group-hover/edit:opacity-100 transition-opacity">
              edit
            </span>
            <span>Budget: {formatRupiah(props.dailyBudget())}</span>
          </div>
        </Tooltip>
      </div>
      <div class="flex-1 min-h-[200px]">
        <Show
          when={!props.loading}
          fallback={
            <div class="w-full h-full flex items-center justify-center text-earth/30">
              Loading...
            </div>
          }
        >
          <SolidApexCharts
            options={barChartOptions()}
            series={[
              {
                name: "Spent",
                data: chartData().map((d) => d.amount),
              },
            ]}
            type="bar"
            height="100%"
          />
        </Show>
      </div>

      <EditDailyBudgetModal
        isOpen={isEditBudgetOpen()}
        onClose={() => setIsEditBudgetOpen(false)}
        currentBudget={props.dailyBudget()}
        onSave={(newBudget) => props.setDailyBudget(newBudget)}
        title="Edit Daily Budget"
        subtitle="Set your target daily spending allowance to calibrate velocity and bar chart threshold."
      />
    </div>
  );
};
