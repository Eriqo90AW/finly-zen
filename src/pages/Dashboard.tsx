import { createSignal, onMount, For } from "solid-js";
import { SolidApexCharts } from 'solid-apexcharts';
import { ApexOptions } from "apexcharts";
import { Tooltip } from "../components/ui/Tooltip";
import { formatRupiah, formatRupiahShort, formatMonth } from "../utils/format";
import { state, nextMonth, prevMonth } from "../store";



const Dashboard = () => {
  const [displayTotal, setDisplayTotal] = createSignal(0);
  const [dailyBudget, setDailyBudget] = createSignal(250000);

  const calendarDays = () => {
    const current = new Date(state.ui.currentMonth);
    const startOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
    const endOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    const days = [];
    
    // Padding start (Monday start)
    const startDay = (startOfMonth.getDay() + 6) % 7;
    for (let i = startDay; i > 0; i--) {
      const d = new Date(startOfMonth);
      d.setDate(d.getDate() - i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      const d = new Date(current.getFullYear(), current.getMonth(), i);
      days.push({ date: d, isCurrentMonth: true });
    }
    
    // Padding end to 42 cells (6 weeks) for consistent layout
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(endOfMonth);
      d.setDate(d.getDate() + i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    return days;
  };

  const getDayAmount = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    return state.transactions
      .filter(t => {
        const td = new Date(t.date);
        return td.getFullYear() === y && td.getMonth() === m && td.getDate() === d;
      })
      .reduce((acc, t) => acc + t.amount, 0);
  };


  const getIntensityColor = (amount: number) => {
    if (amount === 0) return 'rgba(26, 77, 46, 0.05)';
    if (amount < dailyBudget() * 0.5) return '#E8F5EC';
    if (amount < dailyBudget()) return '#C8E6C9';
    if (amount < dailyBudget() * 1.5) return '#52C278';
    if (amount < dailyBudget() * 2.5) return '#2D7D46';
    return '#1A4D2E';
  };


  // Hero total spent calculation
  const totalSpent = () => state.transactions.reduce((acc, t) => acc + t.amount, 0);

  // Count up animation
  onMount(() => {
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

  const donutOptions: ApexOptions = {
    chart: { type: 'donut' },
    colors: ['#1A4D2E', '#2D7D46', '#52C278', '#C8E6C9', '#E8F5EC'],
    labels: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Others'],
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { show: false },
    tooltip: {
      custom: function({ series, seriesIndex, w }) {
        const val = series[seriesIndex];
        const category = w.globals.labels[seriesIndex];
        return `
          <div class="flex flex-col items-center" style="width: 0; overflow: visible;">
            <div class="px-3 py-1.5 bg-[#1C2B20] text-white text-xs font-outfit rounded-lg shadow-xl flex flex-col items-center relative mb-2 whitespace-nowrap">
              <span class="text-white/80 text-[10px] uppercase tracking-wider mb-0.5">${category}</span>
              <span class="font-bold">${formatRupiah(val)}</span>
              <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C2B20]"></div>
            </div>
          </div>
        `;
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              color: '#5C6B5E',
              fontFamily: 'Outfit'
            },
            value: {
              color: '#1A4D2E',
              fontFamily: 'Outfit',
              fontWeight: 700,
              formatter: (val) => formatRupiah(Number(val))
            },
            total: {
              show: true,
              label: 'Top Category',
              formatter: () => formatRupiah(1500000),
              color: '#5C6B5E',
              fontFamily: 'Outfit'
            }
          }
        }
      }
    }
  };

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
                <p class="text-xl font-outfit font-semibold text-forest">{formatRupiah(7650000)}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">Days Left</p>
                <p class="text-xl font-outfit font-semibold text-forest">14 Days</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">Daily Average</p>
                <p class="text-xl font-outfit font-semibold text-forest">{formatRupiah(150000)}</p>
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
             <SolidApexCharts options={barChartOptions()} series={[{ name: 'Spent', data: [120000, 240000, 180000, 310000, 95000, 150000, 210000] }]} type="bar" height="100%" />
          </div>
        </div>

        {/* Category Ring */}
        <div class="col-span-4 row-span-3 premium-card p-6 flex flex-col">
          <h4 class="font-outfit font-bold text-forest mb-6">Categories</h4>
          <div class="flex-1 min-h-[250px]">
             <SolidApexCharts options={donutOptions} series={[1250000, 850000, 450000, 300000, 150000]} type="donut" height="100%" />
          </div>
          <div class="mt-6 space-y-3">
             <For each={[
               {name: 'Food', amount: 1250000, pct: 41},
               {name: 'Transport', amount: 850000, pct: 28},
               {name: 'Shopping', amount: 450000, pct: 15},
               {name: 'Entertainment', amount: 300000, pct: 10}
             ]}>
               {(cat) => (
                 <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                       <div class="w-2 h-2 rounded-full" style={{ 'background-color': cat.name === 'Food' ? '#1A4D2E' : cat.name === 'Transport' ? '#2D7D46' : cat.name === 'Shopping' ? '#52C278' : '#C8E6C9' }} />
                       <span class="text-xs font-outfit text-earth">{cat.name}</span>
                    </div>
                    <span class="text-xs font-outfit font-bold text-forest">{formatRupiah(cat.amount)} ({cat.pct}%)</span>
                 </div>
               )}
             </For>
          </div>
        </div>

        {/* Activity Calendar */}
        <div class="col-span-5 row-span-3 premium-card p-6 flex flex-col">
          <div class="flex items-center justify-between mb-6">
            <div class="flex flex-col">
              <h4 class="font-outfit font-bold text-forest leading-tight">Activity Calendar</h4>
              <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{formatMonth(new Date(state.ui.currentMonth))}</p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                onClick={prevMonth}
                class="w-8 h-8 rounded-full hover:bg-sage/20 flex items-center justify-center transition-colors text-forest"
              >
                <span class="material-icons text-sm">chevron_left</span>
              </button>
              <button 
                onClick={nextMonth}
                class="w-8 h-8 rounded-full hover:bg-sage/20 flex items-center justify-center transition-colors text-forest"
              >
                <span class="material-icons text-sm">chevron_right</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-7 gap-1 mb-2">
            <For each={['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']}>
              {(day) => (
                <div class="text-[7px] font-bold text-earth uppercase tracking-widest text-center py-1 truncate">
                  {day}
                </div>
              )}
            </For>
          </div>


          <div class="flex-1 grid grid-cols-7 grid-rows-6 gap-1.5">
            <For each={calendarDays()}>
              {(day) => {
                const amount = getDayAmount(day.date);
                return (
                  <Tooltip 
                    class="relative group w-full h-full"
                    content={
                      <div class="flex flex-col items-center">
                        <span class="text-white/80 text-[10px] uppercase tracking-wider mb-0.5">
                          {day.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span class="font-bold">{formatRupiah(amount)}</span>
                      </div>
                    }
                  >
                    <div 
                      class="w-full h-full rounded-md transition-all group-hover:ring-2 group-hover:ring-spring cursor-pointer flex items-center justify-center relative overflow-hidden"
                      style={{ 
                        'background-color': getIntensityColor(amount),
                        'opacity': day.isCurrentMonth ? 1 : 0.25
                      }}
                    >
                      <span class={`text-[9px] font-outfit font-bold ${amount > dailyBudget() ? 'text-white' : 'text-forest/40'} relative z-10`}>
                        {day.date.getDate()}
                      </span>
                    </div>
                  </Tooltip>
                );
              }}
            </For>
          </div>
          
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center gap-1">
              <span class="text-[8px] text-earth uppercase">Less</span>
              <div class="flex gap-1">
                <div class="w-2 h-2 rounded-sm bg-sage/10" />
                <div class="w-2 h-2 rounded-sm bg-[#E8F5EC]" />
                <div class="w-2 h-2 rounded-sm bg-[#C8E6C9]" />
                <div class="w-2 h-2 rounded-sm bg-[#52C278]" />
                <div class="w-2 h-2 rounded-sm bg-[#2D7D46]" />
                <div class="w-2 h-2 rounded-sm bg-[#1A4D2E]" />
              </div>
              <span class="text-[8px] text-earth uppercase ml-1">More</span>
            </div>
            <p class="text-[8px] font-bold text-earth uppercase tracking-widest">Heatmap intensity</p>
          </div>
        </div>


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
        <div class="col-span-12 premium-card overflow-hidden">
          <div class="p-6 border-b border-forest/10 flex items-center justify-between">
             <h4 class="font-outfit font-bold text-forest">Recent Transactions</h4>
             <button class="text-[10px] font-bold text-mid-green uppercase tracking-widest hover:underline">View All</button>
          </div>
          <table class="w-full text-left font-outfit">
            <thead class="bg-sage/10 text-earth text-[10px] uppercase tracking-widest">
              <tr>
                <th class="px-6 py-4 font-semibold">Merchant</th>
                <th class="px-6 py-4 font-semibold">Category</th>
                <th class="px-6 py-4 font-semibold">Date</th>
                <th class="px-6 py-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody class="text-sm divide-y divide-forest/5">
              <For each={state.transactions.slice(-5).reverse()}>
                {(t) => (
                  <tr class="group hover:bg-page-bg transition-all">
                    <td class="px-6 py-4 border-l-3 border-transparent group-hover:border-spring">
                       <p class="font-semibold text-forest">{t.merchant}</p>
                       <p class="text-[10px] text-earth">{t.note}</p>
                    </td>
                    <td class="px-6 py-4">
                       <span class="px-2 py-1 bg-sage/30 text-forest text-[10px] rounded-md font-medium">{t.category}</span>
                    </td>
                    <td class="px-6 py-4 text-earth">{new Date(t.date).toLocaleDateString()}</td>
                    <td class="px-6 py-4 text-right font-bold text-forest">{formatRupiah(t.amount)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
          {state.transactions.length === 0 && (
             <div class="p-12 text-center text-earth/50">
                <span class="material-icons text-4xl mb-2">eco</span>
                <p class="text-sm">No transactions yet. Start tending your garden!</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
