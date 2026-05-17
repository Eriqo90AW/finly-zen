import { createSignal, createMemo, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { state } from "../../store";
import { Tooltip } from "../modules/Tooltip";
import { getDateRange } from "../../utils/date";
import { formatRupiah, formatRupiahShort } from "../../utils/format";
import type { DailySpendChartProps } from "../../types";

export const DailySpendChart = (props: DailySpendChartProps) => {
  const chartData = createMemo(() => {
    const data = props.transactions || [];
    const { end: periodEnd } = getDateRange(
      state.ui.currentMonth,
      state.ui.datePeriod,
    );

    // Use the period end as the reference, but don't go past today if period includes today
    const now = new Date();
    const referenceDate = periodEnd > now ? now : periodEnd;

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
      max: 1000000,
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
    <div class="col-span-4 row-span-2 premium-card px-3 py-6 flex flex-col relative cursor-default">
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
      <div class="flex items-center justify-between mb-6 mx-3">
        <h4 class="font-outfit font-bold text-forest">Daily Spend</h4>
        <Tooltip content="Click to edit budget">
          <div
            class="text-[10px] font-bold text-earth hover:text-forest uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-1 group/edit"
            onClick={() => {
              const newBudget = prompt(
                "Enter new daily budget:",
                props.dailyBudget().toString(),
              );
              if (newBudget && !isNaN(Number(newBudget))) {
                props.setDailyBudget(Number(newBudget));
              }
            }}
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
    </div>
  );
};
