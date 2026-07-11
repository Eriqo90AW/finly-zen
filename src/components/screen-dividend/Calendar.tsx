import { createSignal, createMemo, For, Show, onCleanup } from "solid-js";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";
import CalendarDayCell from "./CalendarDayCell";
import { getDividendsMapByDate, getProjectedDividendsMapByMD } from "../../data/dividendData";
import type { DividendEntry } from "../../types/dividend";

interface CalendarProps {
  year: number;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
  onViewMonth?: (year: number, month: number) => void;
  dateViewType: "payment_date" | "ex_date" | "cum_date";
  onDateViewTypeChange: (type: "payment_date" | "ex_date" | "cum_date") => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Calendar = (props: CalendarProps) => {
  const [currentYear, setCurrentYear] = createSignal(props.year);
  const [currentMonth, setCurrentMonth] = createSignal(new Date().getMonth());
  const [showDateDropdown, setShowDateDropdown] = createSignal(false);

  const handleCalendarClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".date-dropdown-container")) {
      setShowDateDropdown(false);
    }
  };

  window.addEventListener("click", handleCalendarClickOutside);
  onCleanup(() => window.removeEventListener("click", handleCalendarClickOutside));

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

  const dividendsMap = createMemo(() => getDividendsMapByDate(props.dateViewType));
  const projectedMap = createMemo(() => getProjectedDividendsMapByMD(props.dateViewType));

  const getLocalISODate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

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
    const divMap = dividendsMap();
    const projMap = projectedMap();

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
      const baseDividends = divMap.get(dateStr) || [];
      const md = dateStr.slice(5);
      const projectedForDay = projMap.get(md) || [];
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
        <div class="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 cursor-pointer"
          >
            <ChevronLeftIcon />
          </button>
          <button
            onClick={nextMonth}
            class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 cursor-pointer"
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div class="flex flex-col items-center gap-1">
          <h3 class="text-lg font-cormorant font-bold text-forest leading-none">
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

        <div class="relative date-dropdown-container">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDateDropdown(!showDateDropdown());
            }}
            class={`text-earth hover:text-forest transition-colors rounded hover:bg-sage/40 cursor-pointer flex items-center gap-1 px-2.5 py-1.5 border border-forest/5 ${props.dateViewType !== "payment_date" ? "bg-sage/40 text-forest" : ""}`}
            title="Choose date view type"
          >
            <span class="material-icons !text-[16px]">
              {props.dateViewType === "cum_date" ? "login" : props.dateViewType === "ex_date" ? "logout" : "payments"}
            </span>
            <span class="text-[9px] font-bold uppercase tracking-wider">
              {props.dateViewType === "cum_date" ? "Income Day" : props.dateViewType === "ex_date" ? "Exit Day" : "Payment Day"}
            </span>
            <span class="material-icons !text-[10px] transition-transform duration-200" classList={{ 'rotate-180': showDateDropdown() }}>
              keyboard_arrow_down
            </span>
          </button>
          
          <Show when={showDateDropdown()}>
            <div class="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-premium border border-forest/10 p-1 z-50 animate-slide-down">
              <button
                onClick={() => {
                  props.onDateViewTypeChange("payment_date");
                  setShowDateDropdown(false);
                }}
                class={`w-full text-left px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                  ${props.dateViewType === "payment_date" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                `}
              >
                <div class="flex items-center gap-1.5">
                  <span class="material-icons !text-[14px]">payments</span>
                  <span>Payment Day</span>
                </div>
                <Show when={props.dateViewType === "payment_date"}>
                  <span class="material-icons !text-[12px]">check</span>
                </Show>
              </button>
              <button
                onClick={() => {
                  props.onDateViewTypeChange("ex_date");
                  setShowDateDropdown(false);
                }}
                class={`w-full text-left px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                  ${props.dateViewType === "ex_date" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                `}
              >
                <div class="flex items-center gap-1.5">
                  <span class="material-icons !text-[14px]">logout</span>
                  <span>Exit Day</span>
                </div>
                <Show when={props.dateViewType === "ex_date"}>
                  <span class="material-icons !text-[12px]">check</span>
                </Show>
              </button>
              <button
                onClick={() => {
                  props.onDateViewTypeChange("cum_date");
                  setShowDateDropdown(false);
                }}
                class={`w-full text-left px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                  ${props.dateViewType === "cum_date" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                `}
              >
                <div class="flex items-center gap-1.5">
                  <span class="material-icons !text-[14px]">login</span>
                  <span>Income Day</span>
                </div>
                <Show when={props.dateViewType === "cum_date"}>
                  <span class="material-icons !text-[12px]">check</span>
                </Show>
              </button>
            </div>
          </Show>
        </div>
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
          <div class="w-2 h-2 rounded-full bg-fin-purple" />
          <span class="text-[10px] text-earth font-medium">Upcoming</span>
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
