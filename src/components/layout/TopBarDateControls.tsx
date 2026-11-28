import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";
import { CalendarRange } from "lucide-solid";
import { type Accessor, createMemo } from "solid-js";
import { nextMonth, prevMonth, setState, state } from "../../store";
import type { DatePeriod } from "../../types";
import { getDateRange } from "../../utils/date";
import { type SelectOption, SimpleSelect } from "../ui";

interface TopBarDateControlsProps {
  formattedDate: Accessor<string>;
}

const DATE_PERIODS: Array<{ value: DatePeriod; label: string }> = [
  { value: "1-30", label: "1 - 30" },
  { value: "21-20", label: "21 - 20" },
  { value: "25-25", label: "25 - 25" },
];

const formatShortDate = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const usePeriodOptions = () =>
  createMemo<SelectOption[]>(() =>
    DATE_PERIODS.map((period) => {
      const { start, end } = getDateRange(state.ui.currentMonth, period.value);
      return {
        value: period.value,
        label: period.label,
        subtitle: `${formatShortDate(start)} – ${formatShortDate(end)}`,
      };
    }),
  );

interface PeriodSelectProps {
  compact?: boolean;
}

const PeriodSelect = (props: PeriodSelectProps) => {
  const options = usePeriodOptions();

  return (
    <SimpleSelect
      options={options()}
      value={state.ui.datePeriod}
      onChange={(value) => setState("ui", "datePeriod", value as DatePeriod)}
      ariaLabel="Select date period"
      sameWidth={false}
      placement={props.compact ? "bottom-end" : "bottom-start"}
      contentClass="w-48"
      triggerClass={
        props.compact
          ? "w-auto h-7 rounded-lg bg-sage/35 border-forest/10 px-2 py-0 gap-1.5 text-[11px] font-bold text-forest hover:bg-sage/50"
          : "w-auto h-9 rounded-xl bg-sage/25 border-forest/10 px-3 py-0 gap-2 text-xs font-bold text-forest hover:bg-sage/40"
      }
      renderTriggerValue={(opt) => (
        <span class="flex items-center gap-1.5 whitespace-nowrap">
          <CalendarRange
            class={
              props.compact
                ? "h-3.5 w-3.5 shrink-0 text-white [&_rect]:fill-forest [&_rect]:stroke-forest [&_path:nth-of-type(1)]:stroke-forest [&_path:nth-of-type(3)]:stroke-forest"
                : "h-4 w-4 shrink-0 text-white [&_rect]:fill-forest [&_rect]:stroke-forest [&_path:nth-of-type(1)]:stroke-forest [&_path:nth-of-type(3)]:stroke-forest"
            }
          />
          <span class="tabular-nums">{opt.label}</span>
        </span>
      )}
    />
  );
};

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
      <PeriodSelect />
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

      <PeriodSelect compact />
    </div>
  );
};
