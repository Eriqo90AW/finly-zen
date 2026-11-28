import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";
import type { Accessor } from "solid-js";
import { nextMonth, prevMonth, setState, state } from "../../store";
import type { DatePeriod } from "../../types";

interface TopBarDateControlsProps {
  formattedDate: Accessor<string>;
}

export const TopBarDateControlsDesktop = (props: TopBarDateControlsProps) => {
  return (
    <>
      {/* Month Navigator (Expense Routes) */}
      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={prevMonth}
          class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 hover:cursor-pointer"
        >
          <ChevronLeftIcon />
        </button>
        <h2 class="text-lg font-outfit font-bold text-forest min-w-[140px] text-center">
          {props.formattedDate()}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 hover:cursor-pointer"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Date Period Selector */}
      <div class="relative group">
        <select
          value={state.ui.datePeriod}
          onInput={(e) => setState("ui", "datePeriod", e.currentTarget.value as DatePeriod)}
          class="appearance-none bg-sage/20 border border-forest/10 rounded-xl px-4 py-2 pr-10 font-outfit text-xs font-bold text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all cursor-pointer hover:bg-sage/30"
        >
          <option value="1-30">1 - 30</option>
          <option value="21-20">21 - 20</option>
          <option value="25-25">25 - 25</option>
        </select>
        <span class="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 pointer-events-none text-lg">
          expand_more
        </span>
      </div>
    </>
  );
};

export const TopBarDateControlsMobile = (props: TopBarDateControlsProps) => {
  return (
    <div class="flex items-center gap-2 shrink-0 py-1 w-full justify-between">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          onClick={prevMonth}
          class="w-7 h-7 rounded-lg bg-sage/40 flex items-center justify-center text-forest"
        >
          <ChevronLeftIcon class="w-4 h-4" />
        </button>
        <span class="text-xs font-outfit font-bold text-forest px-1">
          {props.formattedDate()}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          class="w-7 h-7 rounded-lg bg-sage/40 flex items-center justify-center text-forest"
        >
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>

      <select
        value={state.ui.datePeriod}
        onInput={(e) => setState("ui", "datePeriod", e.currentTarget.value as DatePeriod)}
        class="bg-sage/30 border border-forest/10 rounded-lg px-2.5 py-1 text-[10px] font-bold text-forest"
      >
        <option value="1-30">1 - 30</option>
        <option value="21-20">21 - 20</option>
        <option value="25-25">25 - 25</option>
      </select>
    </div>
  );
};
