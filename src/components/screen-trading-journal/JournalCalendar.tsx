import { For, createMemo } from "solid-js";
import { DailySummary } from "../../data/TradingJournal/data/types";
import DayCell from "./DayCell";

interface JournalCalendarProps {
  days: DailySummary[];
  activeDate: string | null;
  onDayClick: (date: string) => void;
  monthName: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function JournalCalendar(props: JournalCalendarProps) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // Filter out weekend days from summaries list for 5-day calendar
  const activeDays = createMemo(() => props.days.filter((d) => {
    const dateObj = new Date(d.date);
    const day = dateObj.getDay();
    return day !== 0 && day !== 6;
  }));

  // Dynamically calculate empty prefix days before Day 1
  const emptyPrefixSlots = createMemo(() => {
    const daysList = activeDays();
    if (daysList.length === 0) return [];
    
    const firstDay = daysList[0];
    const dateObj = new Date(firstDay.date);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    
    // Mon -> 1, Tue -> 2, Wed -> 3, Thu -> 4, Fri -> 5
    let emptyCount = 0;
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      emptyCount = dayOfWeek - 1;
    }
    
    return Array.from({ length: emptyCount }, (_, i) => {
      const prevDate = new Date(dateObj);
      prevDate.setDate(dateObj.getDate() - (emptyCount - i));
      
      return {
        date: `empty-prefix-${i}`,
        dayNumber: prevDate.getDate(),
      grossReturn: 0,
      netReturn: 0,
      fees: 0,
      tradesCount: 0,
      trades: [],
        isCustomEmpty: true,
      } as DailySummary;
    });
  });

  const rowCount = createMemo(() => Math.ceil((emptyPrefixSlots().length + activeDays().length) / 5));
  
  // Format today's date in YYYY-MM-DD
  const todayObj = new Date();
  const todayString = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  return (
    <div class="premium-card bg-white p-5 flex flex-col gap-4 flex-1 min-h-0">
      {/* Calendar Header */}
      <div class="flex justify-between items-center shrink-0">
        <h3 class="text-2xl font-cormorant font-bold text-forest">{props.monthName}</h3>
        <div class="flex items-center gap-2">
          <button 
            onClick={props.onPrevMonth}
            class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest border border-forest/5 cursor-pointer transition-colors"
          >
            <span class="material-icons text-lg">chevron_left</span>
          </button>
          <button 
            onClick={props.onNextMonth}
            class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest border border-forest/5 cursor-pointer transition-colors"
          >
            <span class="material-icons text-lg">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div class="flex-1 min-h-0 flex flex-col">
        {/* Days of Week Headers */}
        <div class="grid grid-cols-5 gap-2 mb-1.5 text-center shrink-0">
          <For each={weekdays}>
            {(day) => {
              return (
                <div class="text-[10px] font-bold uppercase tracking-widest text-earth/60 py-1">
                  {day}
                </div>
              );
            }}
          </For>
        </div>

        {/* Days Grid */}
        <div 
          class="grid grid-cols-5 gap-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1"
          style={{ "grid-template-rows": `repeat(${rowCount()}, minmax(120px, 1fr))` }}
        >
          <For each={emptyPrefixSlots()}>
            {(emptyDay) => <DayCell day={emptyDay} isActive={false} onClick={() => {}} />}
          </For>

          <For each={activeDays()}>
            {(day) => (
              <DayCell 
                day={day} 
                isActive={props.activeDate === day.date}
                isToday={day.date === todayString}
                onClick={() => props.onDayClick(day.date)}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
