import { createSignal, createMemo, For, Show } from "solid-js";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";
import CalendarDayCell from "./CalendarDayCell";
import { getDividendsForMonth, getDividendsForDate, getDividendsByStatus } from "../../data/dividendData";
import type { DividendEntry } from "../../types/dividend";

interface CalendarProps {
  year: number;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
  onViewMonth?: (year: number, month: number) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Calendar = (props: CalendarProps) => {
  const [currentYear, setCurrentYear] = createSignal(props.year);
  const [currentMonth, setCurrentMonth] = createSignal(new Date().getMonth());

  const prevMonth = () => {
    if (currentMonth() === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth() === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const monthDividends = createMemo(() => {
    return getDividendsForMonth(currentYear(), currentMonth());
  });

  const getLocalISODate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Load ignored entries from localStorage (same format as DividendListCard)
  const ignoredKeys: Set<string> = (() => {
    const saved = localStorage.getItem("ignored_dividends");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  })();

  const getEntryKey = (d: DividendEntry) => `${d.ticker}|${d.cum_date}|${d.amount}|${d.payment_date}`;

  const projectedDividendsFiltered = createMemo(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayMD = `${mm}-${dd}`;
    return getDividendsByStatus("projected").filter((d) => {
      const cumMD = d.cum_date.slice(5);
      if (cumMD <= todayMD) return false;
      const key = getEntryKey(d);
      if (ignoredKeys.has(key)) return false;
      return true;
    });
  });


  const calendarDays = createMemo(() => {
    const year = currentYear();
    const month = currentMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      day: number;
      dateStr: string;
      dividends: DividendEntry[];
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    const todayStr = getLocalISODate(today);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      const dateStr = getLocalISODate(date);
      days.push({
        day,
        dateStr,
        dividends: [],
        isCurrentMonth: false,
        isToday: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = getLocalISODate(date);
      const baseDividends = getDividendsForDate(dateStr);
      const md = dateStr.slice(5);
      const projectedForDay = projectedDividendsFiltered().filter((d) => d.cum_date.slice(5) === md);
      const dividends = [...baseDividends, ...projectedForDay];
      days.push({
        day,
        dateStr,
        dividends,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      const dateStr = getLocalISODate(date);
      days.push({
        day,
        dateStr,
        dividends: [],
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  });

  return (
    <div class="premium-card p-4 bg-white h-full flex flex-col justify-between">
      <div class="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 cursor-pointer"
        >
          <ChevronLeftIcon />
        </button>
        <div class="flex flex-col items-center gap-1">
          <h3 class="text-lg font-cormorant font-bold text-forest">
            {MONTHS[currentMonth()]} {currentYear()}
          </h3>
          <Show when={props.onViewMonth}>
            <button
              onClick={() => props.onViewMonth!(currentYear(), currentMonth())}
              class="px-3 py-1 rounded-lg bg-sage/40 hover:bg-sage/75 text-[9px] font-bold text-forest tracking-wider uppercase transition-all cursor-pointer"
            >
              View Month
            </button>
          </Show>
        </div>
        <button
          onClick={nextMonth}
          class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 cursor-pointer"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div class="grid grid-cols-7 gap-1 mb-2">
        <For each={WEEKDAYS}>
          {(day) => (
            <div class="text-center text-[10px] font-bold text-earth uppercase tracking-wider py-2">
              {day}
            </div>
          )}
        </For>
      </div>

      <div class="grid grid-cols-7 grid-rows-6 gap-1 flex-1 min-h-0">
        <For each={calendarDays()}>
          {(dayData) => (
            <CalendarDayCell
              day={dayData.day}
              dateStr={dayData.dateStr}
              dividends={dayData.dividends}
              isCurrentMonth={dayData.isCurrentMonth}
              isToday={dayData.isToday}
              isSelected={props.selectedDate === dayData.dateStr}
              onSelect={props.onSelectDate}
            />
          )}
        </For>
      </div>

      <div class="flex items-center gap-4 mt-4 pt-4 border-t border-forest/5">
        <div class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full bg-fin-green" />
          <span class="text-[10px] text-earth font-medium">Paid</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full bg-gray-400" />
          <span class="text-[10px] text-earth font-medium">Projected</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
