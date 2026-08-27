import { createSignal, createResource, Show } from "solid-js";
import { getMonthlyPerformance, getAllTimePerformance, getDailySummaries, getDailySummary, saveTrade } from "../data/TradingJournal/api/journalApi";
import { DailySummary, Trade } from "../data/TradingJournal/data/types";
import PerformanceBanner from "../components/screen-trading-journal/PerformanceBanner";
import JournalCalendar from "../components/screen-trading-journal/JournalCalendar";
import DailySummaryDrawer from "../components/screen-trading-journal/DailySummaryDrawer";
import NewTradeForm from "../components/screen-trading-journal/NewTradeForm";

export default function TradingJournal() {
  const [activeDate, setActiveDate] = createSignal<string | null>(null);
  const [selectedDaySummary, setSelectedDaySummary] = createSignal<DailySummary | null>(null);
  
  const now = new Date();
  const [currentMonth, setCurrentMonth] = createSignal(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  // Resources for async mock/supabase data loading
  const [performance, { refetch: refetchPerf }] = createResource(currentMonth, getMonthlyPerformance);
  const [allTimePerformance, { refetch: refetchAllTimePerf }] = createResource(getAllTimePerformance);
  const [days, { refetch: refetchDays }] = createResource(currentMonth, getDailySummaries);

  // Fetch selected day summary and open drawer on the right
  const handleDayClick = async (date: string) => {
    setActiveDate(date);
    const summary = await getDailySummary(date);
    if (summary) {
      setSelectedDaySummary(summary);
    }
  };

  const handleSaveTrade = async (date: string, trade: Partial<Trade>) => {
    await saveTrade(date, trade);
    // Refetch resources to dynamically update calendar heatmap, banner stats, and tooltips
    refetchDays();
    refetchPerf();
    refetchAllTimePerf();
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const [year, month] = prev.split("-").map(Number);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const [year, month] = prev.split("-").map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    });
  };

  return (
    <div class="flex flex-col gap-4 sm:gap-6 items-stretch relative min-h-[calc(100dvh-128px)] lg:h-[calc(100dvh-128px)] overflow-hidden animate-fade-in-up pb-12 lg:pb-0">
        {/* Page Title Header */}
        <div class="flex items-center justify-between shrink-0">
          <div>
            <h1 class="text-2xl sm:text-3xl font-cormorant font-bold text-forest">Trading Journal</h1>
            <p class="text-xs text-earth">Monitor execution quality, psychology, and performance stats.</p>
          </div>
        </div>

      <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 min-h-0 lg:overflow-hidden">
        {/* Main Journal Content (Left Column) */}
        <div class="flex-1 min-w-0 flex flex-col gap-4 lg:overflow-hidden">

          {/* Performance Summary Banner */}
          <Show 
            when={performance() && allTimePerformance()} 
            fallback={<div class="h-32 bg-white rounded-premium border border-forest/10 animate-pulse shrink-0" />}
          >
            <PerformanceBanner 
              performance={performance()!} 
              allTimePerformance={allTimePerformance()!} 
            />
          </Show>

          {/* Calendar Heatmap Grid */}
          <Show 
            when={!days.loading && days()} 
            fallback={
              <div class="premium-card bg-white p-4 sm:p-6 space-y-6 border border-forest/10 animate-pulse flex-1 min-h-[300px]">
                <div class="h-8 bg-sage/20 rounded-xl w-48 shrink-0" />
                <div class="grid grid-cols-5 grid-rows-5 gap-2 sm:gap-3 flex-1 min-h-0">
                  {Array.from({ length: 25 }).map(() => (
                    <div class="bg-sage/10 rounded-xl h-12 sm:h-full w-full" />
                  ))}
                </div>
              </div>
            }
          >
            {(daysList) => (
              <JournalCalendar 
                days={daysList()} 
                activeDate={activeDate()}
                onDayClick={handleDayClick}
                monthName={performance()?.monthName || (() => {
                  const [y, m] = currentMonth().split("-");
                  const d = new Date(parseInt(y), parseInt(m) - 1);
                  return `${d.toLocaleString("default", { month: "long" })} ${y}`;
                })()}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
              />
            )}
          </Show>
        </div>

        {/* Right Column: Dynamic Form / Drawer Panel */}
        <div class="w-full lg:w-[380px] shrink-0 min-h-[480px] lg:h-full flex flex-col relative overflow-hidden">
          <NewTradeForm onSave={handleSaveTrade} />
          <DailySummaryDrawer 
            day={selectedDaySummary()} 
            onClose={() => {
              setSelectedDaySummary(null);
              setActiveDate(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
