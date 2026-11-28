import { createSignal, onMount, onCleanup, Show } from "solid-js";
import Calendar from "../components/Calendar";
import DividendListCard from "../components/DividendListCard";
import { refreshDividends, isDividendsRefreshing } from "../../../data/dividendData";

export const DividendPage = () => {
  const [selectedYear] = createSignal(2026);
  const [selectedDate, setSelectedDate] = createSignal<string | null>(null);
  const [monthView, setMonthView] = createSignal<{ year: number; month: number } | null>(null);
  const [dateViewType, setDateViewType] = createSignal<"payment_date" | "ex_date" | "cum_date">("payment_date");

  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    refreshDividends();
    refreshTimer = setInterval(() => {
      refreshDividends();
    }, 5 * 60 * 1000);
  });

  onCleanup(() => {
    if (refreshTimer) clearInterval(refreshTimer);
  });

  return (
    <div class="max-w-[1400px] mx-auto min-h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-8rem)] animate-fade-in-up relative pb-12 lg:pb-0">
      <Show when={isDividendsRefreshing()}>
        <div class="absolute top-0 right-0 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage/40 text-earth text-[10px] font-bold uppercase tracking-wider">
          <span class="material-icons !text-[12px] animate-spin">sync</span>
          Syncing
        </div>
      </Show>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:h-[calc(100%)]">
        <div class="col-span-1 lg:col-span-2 min-h-0">
          <Calendar
            year={selectedYear()}
            selectedDate={selectedDate()}
            dateViewType={dateViewType()}
            onDateViewTypeChange={setDateViewType}
            onSelectDate={(date) => {
              setSelectedDate(date);
              if (date) {
                setMonthView(null);
              }
            }}
            onViewMonth={(year, month) => {
              setMonthView({ year, month });
              setSelectedDate(null);
            }}
          />
        </div>

        <div class="col-span-1 min-h-0">
          <DividendListCard
            selectedDate={selectedDate()}
            onClearDate={() => setSelectedDate(null)}
            monthView={monthView()}
            onClearMonthView={() => setMonthView(null)}
            dateViewType={dateViewType()}
            onDateViewTypeChange={setDateViewType}
          />
        </div>
      </div>
    </div>
  );
};

export default DividendPage;
