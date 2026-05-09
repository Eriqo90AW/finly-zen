import { For, createMemo, Accessor, createSignal, createEffect, Show } from "solid-js";
import { Tooltip } from "./ui/Tooltip";
import { formatRupiah, formatMonth } from "../utils/format";
import { Transaction, state } from "../store";
import { getDateRange, isDateInRange } from "../utils/date";

interface ActivityCalendarProps {
  transactions: Transaction[];
  loading: boolean;
  dailyBudget: Accessor<number>;
}

export const ActivityCalendar = (props: ActivityCalendarProps) => {
  const [viewMonth, setViewMonth] = createSignal(state.ui.currentMonth);

  // Sync with global month if it changes
  createEffect(() => {
    setViewMonth(state.ui.currentMonth);
  });

  const handleNextMonth = () => {
    const d = new Date(viewMonth());
    d.setMonth(d.getMonth() + 1);
    setViewMonth(d.toISOString());
  };

  const handlePrevMonth = () => {
    const d = new Date(viewMonth());
    d.setMonth(d.getMonth() - 1);
    setViewMonth(d.toISOString());
  };

  const dateRange = createMemo(() => getDateRange(state.ui.currentMonth, state.ui.datePeriod));

  const calendarDays = createMemo(() => {
    const current = new Date(viewMonth());
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
  });

  const getDayAmount = (date: Date) => {
    const { start, end } = dateRange();
    
    // If date is outside the selected period, return 0
    if (!isDateInRange(date, start, end)) return 0;

    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    const data = props.transactions || [];
    return data
      .filter(t => {
        const td = new Date(t.date);
        const isDateMatch = td.getFullYear() === y && td.getMonth() === m && td.getDate() === d;
        if (!isDateMatch) return false;
        if (t.type !== 'expense') return false;
        return true;
      })
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const getIntensityColor = (amount: number) => {
    if (amount === 0) return 'rgba(26, 77, 46, 0.05)';
    const budget = props.dailyBudget();
    if (amount < budget * 0.5) return '#E8F5EC';
    if (amount < budget) return '#C8E6C9';
    if (amount < budget * 1.5) return '#52C278';
    if (amount < budget * 2.5) return '#2D7D46';
    return '#1A4D2E';
  };

  return (
    <div class="premium-card p-6 flex flex-col h-full">
      <div class="flex items-center justify-between mb-6">
        <div class="flex flex-col">
          <h4 class="font-outfit font-bold text-forest leading-tight">Activity Calendar</h4>
          <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{formatMonth(new Date(viewMonth()))}</p>
        </div>
        <div class="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            class="w-8 h-8 rounded-full hover:bg-sage/20 flex items-center justify-center transition-colors text-forest"
          >
            <span class="material-icons text-sm">chevron_left</span>
          </button>
          <button 
            onClick={handleNextMonth}
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
        <Show when={!props.loading} fallback={<div class="w-full h-full flex items-center justify-center text-earth/30">Loading...</div>}>
          <For each={calendarDays()}>
            {(day) => {
            const amount = createMemo(() => getDayAmount(day.date));
            const isToday = createMemo(() => {
              const today = new Date();
              return day.date.getDate() === today.getDate() && 
                     day.date.getMonth() === today.getMonth() && 
                     day.date.getFullYear() === today.getFullYear();
            });
            
            return (
              <Tooltip 
                class="relative group w-full h-full"
                content={
                  <div class="flex flex-col items-center">
                    <span class="text-white/80 text-[10px] uppercase tracking-wider mb-0.5">
                      {day.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span class="font-bold">{formatRupiah(amount())}</span>
                  </div>
                }
              >
                <div 
                  class={`w-full h-full rounded-md transition-all cursor-pointer flex items-center justify-center relative overflow-hidden
                    ${isToday() ? 'ring-2 ring-spring shadow-[0_0_12px_rgba(82,194,120,0.3)] z-20' : 'hover:ring-2 hover:ring-spring'}
                    group-hover:ring-2 group-hover:ring-spring`}
                  style={{ 
                    'background-color': getIntensityColor(amount()),
                    'opacity': day.isCurrentMonth ? 1 : 0.25
                  }}
                >
                  <span class={`text-[9px] font-outfit font-bold ${amount() > props.dailyBudget() ? 'text-white' : 'text-forest/40'} relative z-10`}>
                    {day.date.getDate()}
                  </span>
                  
                </div>
              </Tooltip>
            );
          }}
        </For>
      </Show>
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
  );
};
