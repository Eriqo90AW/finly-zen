import { Show, For, createMemo } from "solid-js";
import { SolidApexCharts } from 'solid-apexcharts';
import { ApexOptions } from "apexcharts";
import { formatRupiah } from "../utils/format";
import { CategoryCardProps } from "../types";


export const CategoryCard = (props: CategoryCardProps) => {
  const categoryData = createMemo(() => {
    const data = props.transactions || [];
    const expenseData = data.filter(t => t.type === 'expense');
    
    const cats: Record<string, { amount: number; color?: string }> = {};
    let total = 0;

    expenseData.forEach(t => {
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
        color: info.color || '#C8E6C9', // Fallback color
        pct: total > 0 ? Math.round((info.amount / total) * 100) : 0
      }));

    // Non-recurring income: income transactions that are NOT recurring
    const nonRecurringIncome = data
      .filter(t => t.type === 'income' && !t.isRecurring)
      .reduce((sum, t) => sum + t.amount, 0);

    const cleanTotal = total - nonRecurringIncome;

    return { sorted, total, nonRecurringIncome, cleanTotal };
  });

  const chartOptions = (): ApexOptions => {
    const { sorted, total } = categoryData();
    
    return {
      chart: { 
        type: 'donut',
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        dropShadow: {
          enabled: true,
          blur: 10,
          left: 0,
          top: 4,
          opacity: 0.05,
          color: '#1A4D2E'
        }
      },
      colors: sorted.map(c => c.color),
      labels: sorted.map(c => c.name),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { show: false },
      tooltip: { enabled: false },
      states: {
        hover: {
          filter: {
            type: 'none'
          }
        }
      },
      plotOptions: {
        pie: {
          expandOnClick: true,
          donut: {
            size: '78%',
            labels: {
              show: false
            }
          }
        }
      }
    };
  };

  return (
    <div class="premium-card p-6 flex flex-col h-full overflow-hidden">
      <h4 class="font-outfit font-bold text-forest mb-6">Categories</h4>
      
      <div class="relative h-[250px] mb-4">
        <Show when={!props.loading} fallback={<div class="w-full h-full flex items-center justify-center text-earth/30">Loading...</div>}>
          <SolidApexCharts 
            options={chartOptions()} 
            series={categoryData().sorted.map(c => c.amount)} 
            type="donut" 
            height="100%" 
          />
          {/* Custom donut center overlay */}
          <div
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ "padding-bottom": "20px" }}
          >
            <div class="flex flex-col items-center gap-0.5 font-outfit">
              {/* Total Expense */}
              <span class="text-[9px] uppercase tracking-widest text-earth/50 font-semibold">Expense</span>
              <span class="text-[13px] font-bold text-red-500 leading-tight">{formatRupiah(categoryData().total)}</span>

              {/* Non-recurring income line */}
              <Show when={categoryData().nonRecurringIncome > 0}>
                <span class="text-[11px] text-green-500/70 leading-tight flex items-center gap-0.5 mt-0.5">
                  <span class="material-icons !text-[9px]">remove</span>
                  {formatRupiah(categoryData().nonRecurringIncome)}
                </span>
              </Show>

              {/* Divider */}
              <div class="w-20 h-px bg-forest/15 my-1" />

              {/* Clean Total */}
              <span class="text-[9px] uppercase tracking-widest text-earth/40 font-semibold">Net Expense</span>
              <span
                class="text-[18px] font-bold leading-tight"
                classList={{
                  "text-forest": categoryData().cleanTotal > 0,
                  "text-green-600": categoryData().cleanTotal <= 0,
                }}
              >
                {formatRupiah(Math.abs(categoryData().cleanTotal))}
              </span>
            </div>
          </div>
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
                    style={{ 'background-color': cat.color }} 
                  />
                  <span class="text-sm font-outfit text-earth group-hover:text-forest transition-colors">{cat.name}</span>
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-sm font-outfit font-bold text-forest">{formatRupiah(cat.amount)}</span>
                  <span class="text-[10px] font-bold text-earth/40 uppercase tracking-wider">{cat.pct}%</span>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>



      {/* Adding custom scrollbar style inline for simplicity, or we could add to global CSS */}
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

