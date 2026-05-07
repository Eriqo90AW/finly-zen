import { For, createSignal, createMemo } from "solid-js";
import { state } from "../store";
import { SolidApexCharts } from 'solid-apexcharts';
import { ApexOptions } from "apexcharts";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";

const CategoryCard = (props: { category: string, budget: number, spent: number }) => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const percent = () => Math.min((props.spent / props.budget) * 100, 100);
  const status = () => {
    const p = percent();
    if (p >= 100) return { label: "Exceeded", color: "text-rose-500", bg: "bg-rose-500/10" };
    if (p > 80) return { label: "Caution", color: "text-amber-500", bg: "bg-amber-500/10" };
    return { label: "Healthy", color: "text-forest", bg: "bg-forest/10" };
  };

  const miniChartOptions: ApexOptions = {
    chart: { type: 'bar', sparkline: { enabled: true } },
    colors: [status().color.includes('forest') ? '#1A4D2E' : status().color.includes('amber') ? '#E8A020' : '#D94F4F'],
    plotOptions: { bar: { borderRadius: 2, columnWidth: '60%' } },
    tooltip: { enabled: false }
  };

  // SVG ring logic
  const strokeDasharray = () => `${(percent() / 100) * 126} 126`;

  return (
    <div 
      class={`premium-card p-6 flex flex-col transition-all duration-500 cursor-pointer ${isExpanded() ? 'col-span-1 shadow-2xl ring-1 ring-forest/20' : ''}`}
      onClick={() => setIsExpanded(!isExpanded())}
    >
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{props.category}</p>
          <h4 class="text-xl font-outfit font-bold text-forest">${props.spent.toFixed(0)} <span class="text-sm font-normal text-earth">/ ${props.budget}</span></h4>
        </div>
        <div class="relative w-12 h-12 flex items-center justify-center">
           <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 50 50">
             <circle cx="25" cy="25" r="20" stroke="currentColor" stroke-width="4" fill="transparent" class="text-forest/5" />
             <circle 
              cx="25" cy="25" r="20" stroke="currentColor" stroke-width="4" fill="transparent" 
              stroke-dasharray={strokeDasharray()} stroke-linecap="round" class={status().color} 
             />
           </svg>
           <ChevronRightIcon 
            class={`absolute text-xs text-forest transition-transform duration-300 ${isExpanded() ? 'rotate-90' : ''}`} 
            sx={{ fontSize: 16 }} 
           />
        </div>
      </div>

      <div class="mt-6 flex items-center justify-between">
         <span class={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${status().bg} ${status().color}`}>
            {status().label}
         </span>
         <p class="text-xs font-outfit text-earth">
            ${(props.budget - props.spent).toFixed(0)} left
         </p>
      </div>

      <div class={`transition-all duration-500 overflow-hidden ${isExpanded() ? 'h-24 mt-6 pt-6 border-t border-forest/5 opacity-100' : 'h-0 opacity-0'}`}>
         <div class="h-full">
            <SolidApexCharts options={miniChartOptions} series={[{ data: [12, 18, 14, 22, 19, 25, 20] }]} type="bar" height="100%" />
         </div>
      </div>
    </div>
  );
};

const Budgets = () => {
  const overallOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false } },
    colors: ['#E8F5EC', '#1A4D2E'],
    stroke: { width: [0, 4], curve: 'smooth' },
    plotOptions: { bar: { columnWidth: '50%' } },
    labels: ['Food', 'Transport', 'Ent.', 'Shop.', 'Health', 'Utils'],
    legend: { show: false },
    grid: { borderColor: 'rgba(26,77,46,0.05)' },
    yaxis: { labels: { style: { fontFamily: 'Outfit' } } },
    xaxis: { labels: { style: { fontFamily: 'Outfit' } } },
  };

  const budgetActualSeries = [
    { name: 'Budgeted', type: 'column', data: [500, 300, 200, 400, 150, 250] },
    { name: 'Actual', type: 'line', data: [420, 340, 150, 410, 100, 220] }
  ];

  return (
    <div class="space-y-8 animate-fade-in-up">
      <h2 class="text-3xl font-cormorant text-forest">Monthly Growth & Budgets</h2>
      
      {/* Overview Chart */}
      <div class="premium-card p-8 bg-white h-[350px]">
        <div class="flex items-center justify-between mb-8">
           <div>
              <h3 class="text-lg font-outfit font-bold text-forest">Performance vs Target</h3>
              <p class="text-xs text-earth">Tracking all categories for April 2026</p>
           </div>
           <div class="flex gap-4">
              <div class="flex items-center gap-2">
                 <div class="w-3 h-3 rounded-full bg-sage" />
                 <span class="text-[10px] font-bold text-earth uppercase tracking-widest">Budgeted</span>
              </div>
              <div class="flex items-center gap-2">
                 <div class="w-3 h-3 rounded-full bg-forest" />
                 <span class="text-[10px] font-bold text-earth uppercase tracking-widest">Actual</span>
              </div>
           </div>
        </div>
        <div class="h-[220px]">
           <SolidApexCharts options={overallOptions} series={budgetActualSeries} type="line" height="100%" />
        </div>
      </div>

      {/* Category Grid */}
      <div class="grid grid-cols-3 gap-6 pb-20">
        <For each={state.budgets}>
          {(b) => (
            <CategoryCard 
              category={b.category} 
              budget={b.limit} 
              spent={state.transactions.filter(t => t.category === b.category).reduce((sum, t) => sum + t.amount, 0)} 
            />
          )}
        </For>
      </div>
    </div>
  );
};

export default Budgets;
