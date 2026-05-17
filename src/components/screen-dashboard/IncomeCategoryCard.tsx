import { Show, For, createMemo } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { formatRupiah } from "../../utils/format";
import type { CategoryCardProps } from "../../types";

export const IncomeCategoryCard = (props: CategoryCardProps) => {
  const categoryData = createMemo(() => {
    const data = props.transactions || [];
    const incomeData = data.filter((t) => t.type === "income");

    const cats: Record<string, { amount: number; color?: string }> = {};
    let total = 0;

    incomeData.forEach((t) => {
      if (!cats[t.category]) {
        cats[t.category] = { amount: 0, color: t.categoryColor };
      }
      cats[t.category].amount += t.amount;
      total += t.amount;
    });

    const sorted = Object.entries(cats)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([name, info]) => ({
        name,
        amount: info.amount,
        color: info.color || "#A5D6A7", // Harmonious fallback green for income
        pct: total > 0 ? Math.round((info.amount / total) * 100) : 0,
      }));

    const recurringIncome = incomeData
      .filter((t) => t.isRecurring)
      .reduce((sum, t) => sum + t.amount, 0);

    const nonRecurringIncome = incomeData
      .filter((t) => !t.isRecurring)
      .reduce((sum, t) => sum + t.amount, 0);

    return { sorted, total, recurringIncome, nonRecurringIncome };
  });

  const chartOptions = (): ApexOptions => {
    const { sorted } = categoryData();

    return {
      chart: {
        type: "donut",
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
        dropShadow: {
          enabled: true,
          blur: 10,
          left: 0,
          top: 4,
          opacity: 0.05,
          color: "#1A4D2E",
        },
      },
      colors: sorted.map((c) => c.color),
      labels: sorted.map((c) => c.name),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { show: false },
      tooltip: { enabled: false },
      states: {
        hover: {
          filter: {
            type: "none",
          },
        },
      },
      plotOptions: {
        pie: {
          expandOnClick: true,
          donut: {
            size: "78%",
            labels: {
              show: false,
            },
          },
        },
      },
    };
  };

  return (
    <div class="premium-card p-6 flex flex-col h-full overflow-hidden">
      <h4 class="font-outfit font-bold text-forest mb-6">Income Categories</h4>

      <div class="relative h-[250px] mb-4">
        <Show
          when={!props.loading}
          fallback={
            <div class="w-full h-full flex items-center justify-center text-earth/30">
              Loading...
            </div>
          }
        >
          <Show
            when={categoryData().sorted.length > 0}
            fallback={
              <div class="w-full h-full flex items-center justify-center text-earth/50 font-outfit text-sm">
                No income transactions this period
              </div>
            }
          >
            <SolidApexCharts
              options={chartOptions()}
              series={categoryData().sorted.map((c) => c.amount)}
              type="donut"
              height="100%"
            />
            {/* Custom donut center overlay */}
            <div
              class="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ "padding-bottom": "20px" }}
            >
              <div class="flex flex-col items-center gap-0.5 font-outfit">
                {/* Recurring Income */}
                <span class="text-[8px] uppercase tracking-widest text-earth/50 font-semibold">
                  Recurring
                </span>
                <span class="text-[13px] font-bold text-forest leading-tight">
                  {formatRupiah(categoryData().recurringIncome)}
                </span>

                {/* Non-recurring Income */}
                <Show when={categoryData().nonRecurringIncome > 0}>
                  <span class="text-[11px] text-green-600/70 leading-tight flex items-center gap-0.5 mt-0.5">
                    <span class="material-icons !text-[9px]">add</span>
                    {formatRupiah(categoryData().nonRecurringIncome)}
                  </span>
                </Show>

                {/* Divider */}
                <div class="w-20 h-px bg-forest/25 my-1" />

                {/* Total Income */}
                <span class="text-[9px] uppercase tracking-widest text-earth/80 font-semibold">
                  Total Income
                </span>
                <span class="text-[18px] font-bold text-green-600 leading-tight">
                  {formatRupiah(categoryData().total)}
                </span>
              </div>
            </div>
          </Show>
        </Show>
      </div>

      <div class="flex-1 overflow-hidden flex flex-col">
        <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar-thin space-y-4 max-h-[180px]">
          <For each={categoryData().sorted}>
            {(cat) => (
              <div class="flex items-center justify-between group">
                <div class="flex items-center gap-3">
                  <div
                    class="w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-transparent transition-all duration-300"
                    style={{ "background-color": cat.color }}
                  />
                  <span class="text-sm font-outfit text-earth group-hover:text-forest transition-colors">
                    {cat.name}
                  </span>
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-sm font-outfit font-bold text-forest">
                    {formatRupiah(cat.amount)}
                  </span>
                  <span class="text-[10px] font-bold text-earth/40 uppercase tracking-wider">
                    {cat.pct}%
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Inline scrollbar styles */}
      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(26, 77, 46, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(26, 77, 46, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 77, 46, 0.4);
        }
      `}</style>
    </div>
  );
};
