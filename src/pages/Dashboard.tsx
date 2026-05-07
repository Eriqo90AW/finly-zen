import { createSignal, onMount, For, createResource, Show, createEffect } from "solid-js";
import { SolidApexCharts } from 'solid-apexcharts';
import { ApexOptions } from "apexcharts";
import { Tooltip } from "../components/ui/Tooltip";
import { RecentTransactions } from "../components/RecentTransactions";
import { ActivityCalendar } from "../components/ActivityCalendar";
import { formatRupiah, formatRupiahShort, formatMonth } from "../utils/format";
import { CategoryCard } from "../components/CategoryCard";
import { state, nextMonth, prevMonth } from "../store";
import { getTransactions } from "../lib/db";



const Dashboard = () => {
  const [displayTotal, setDisplayTotal] = createSignal(0);
  const [dailyBudget, setDailyBudget] = createSignal(250000);

  // Supabase Resources
  const [transactions] = createResource(getTransactions);



  // Hero total spent calculation
  const totalSpent = () => (transactions() || []).reduce((acc, t) => acc + t.amount, 0);

  // Count up animation
  createEffect(() => {
    if (transactions.loading) return;
    
    const target = totalSpent();
    const duration = 1500;
    const start = performance.now();

    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayTotal(target * easeOut);

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  });

  const barChartOptions = (): ApexOptions => ({
    chart: { type: 'bar', toolbar: { show: false }, animations: { enabled: true } },
    colors: ['#52C278'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    tooltip: {
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const val = series[seriesIndex][dataPointIndex];
        const category = w.globals.labels[dataPointIndex];
        return `
          <div class="flex flex-col items-center" style="width: 0; overflow: visible;">
            <div class="px-3 py-1.5 bg-[#1C2B20] text-white text-xs font-outfit rounded-lg shadow-xl flex flex-col items-center relative mb-2 whitespace-nowrap">
              <span class="text-white/80 text-[10px] uppercase tracking-wider mb-0.5">Day ${category}</span>
              <span class="font-bold">${formatRupiahShort(val)}</span>
              <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C2B20]"></div>
            </div>
          </div>
        `;
      }
    },
    xaxis: { categories: ['1', '5', '10', '15', '20', '25', '30'], labels: { style: { colors: '#5C6B5E', fontFamily: 'Outfit' } } },
    yaxis: { 
      labels: { 
        style: { colors: '#5C6B5E', fontFamily: 'Outfit' },
        formatter: (value) => formatRupiahShort(value)
      } 
    },
    grid: { borderColor: 'rgba(26,77,46,0.05)' },
    annotations: {
      yaxis: [{ y: dailyBudget(), borderColor: '#1A4D2E', label: { text: 'Budget', style: { background: '#1A4D2E', color: '#fff' } } }]
    }
  });


  return (
    <div class="space-y-8 animate-fade-in-up">
      <div class="bento-grid">
        {/* Hero Card */}
        <div class="col-span-8 row-span-2 premium-card p-10 bg-cream relative overflow-hidden group">
          {/* Watermark */}
          <div class="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 duration-1000">
             <span class="material-icons text-[240px]">eco</span>
          </div>
          
          <div class="relative z-10 space-y-8">
            <div class="space-y-1">
              <p class="text-xs font-bold text-forest/40 uppercase tracking-widest">Total Spent this Month</p>
              <h3 class="text-7xl hero-numeral text-forest">
                {formatRupiah(displayTotal())}
              </h3>
            </div>
            
            <div class="h-px bg-forest/10 w-full" />
            
            <div class="grid grid-cols-3 gap-8">
              <div>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">Remaining</p>
                <p class="text-xl font-outfit font-semibold text-forest">
                  {formatRupiah(Math.max(0, state.settings.monthlyLimit - totalSpent()))}
                </p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">Days Left</p>
                <p class="text-xl font-outfit font-semibold text-forest">
                  {(() => {
                    const now = new Date();
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    return lastDay - now.getDate();
                  })()} Days
                </p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">Daily Average</p>
                <p class="text-xl font-outfit font-semibold text-forest">
                  {formatRupiah(totalSpent() / new Date().getDate())}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Spend Bar Chart */}
        <div class="col-span-4 row-span-2 premium-card px-3 py-6 flex flex-col">
          <div class="flex items-center justify-between mb-6 mx-3">
            <h4 class="font-outfit font-bold text-forest">Daily Spend</h4>
            <Tooltip content="Click to edit budget">
              <div 
                class="text-[10px] font-bold text-earth hover:text-forest uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-1 group/edit"
                onClick={() => {
                  const newBudget = prompt("Enter new daily budget:", dailyBudget().toString());
                  if (newBudget && !isNaN(Number(newBudget))) {
                    setDailyBudget(Number(newBudget));
                  }
                }}
              >
                <span class="material-icons text-[10px] opacity-0 group-hover/edit:opacity-100 transition-opacity">edit</span>
                <span>Budget: {formatRupiah(dailyBudget())}</span>
              </div>
            </Tooltip>
          </div>
          <div class="flex-1 min-h-[200px]">
             <Show when={!transactions.loading} fallback={<div class="w-full h-full flex items-center justify-center text-earth/30">Loading...</div>}>
                <SolidApexCharts 
                  options={barChartOptions()} 
                  series={[{ 
                    name: 'Spent', 
                    data: (() => {
                      const last7Days = Array.from({length: 7}, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        
                        const y = d.getFullYear();
                        const m = d.getMonth();
                        const date = d.getDate();
                        const data = transactions() || [];
                        return data
                          .filter(t => {
                            const td = new Date(t.date);
                            return td.getFullYear() === y && td.getMonth() === m && td.getDate() === date;
                          })
                          .reduce((acc, t) => acc + t.amount, 0);
                      });
                      return last7Days;
                    })()
                  }]} 
                  type="bar" 
                  height="100%" 
                />
             </Show>
          </div>
        </div>

        <CategoryCard transactions={transactions} />

        <ActivityCalendar 
          transactions={transactions}
          currentMonth={state.ui.currentMonth}
          dailyBudget={dailyBudget}
          onNextMonth={nextMonth}
          onPrevMonth={prevMonth}
        />


        {/* Streak & Wins */}
        <div class="col-span-3 row-span-3 premium-card p-6 flex flex-col justify-between">
          <div>
            <h4 class="font-outfit font-bold text-forest mb-4">Garden Wins</h4>
            <div class="space-y-4">
              <div class="p-3 bg-sage/20 rounded-xl space-y-2">
                <p class="text-[10px] font-bold text-forest uppercase tracking-widest">Under Budget Streak</p>
                <div class="flex gap-2">
                  <For each={Array(5).fill(0)}>
                    {() => <div class="w-3 h-3 rounded-full bg-forest" />}
                  </For>
                  <div class="w-3 h-3 rounded-full bg-forest/10" />
                </div>
                <p class="text-xs font-outfit text-forest font-semibold">12 Days and growing!</p>
              </div>
              <div class="flex flex-wrap gap-2">
                 <span class="px-3 py-1.5 bg-sage text-forest text-[10px] font-bold rounded-full border border-forest/10">Lowest Food Spend</span>
                 <span class="px-3 py-1.5 bg-sage text-forest text-[10px] font-bold rounded-full border border-forest/10">No Impulse Buys</span>
              </div>
            </div>
          </div>
          
          <div class="p-4 bg-forest rounded-2xl text-white space-y-1">
             <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">Insight</p>
             <p class="text-xs font-outfit">Your savings are 12% higher than last month.</p>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <RecentTransactions 
          transactions={transactions} 
          currentMonth={state.ui.currentMonth} 
        />
      </div>
    </div>
  );
};

export default Dashboard;
