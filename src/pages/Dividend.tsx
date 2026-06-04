import { createSignal } from "solid-js";
import Calendar from "../components/screen-dividend/Calendar";
import DividendListCard from "../components/screen-dividend/DividendListCard";
import { getAllDividends, getDividendsByStatus } from "../data/dividendData";

const Dividend = () => {
  const [selectedYear, setSelectedYear] = createSignal(2026);
  const [selectedDate, setSelectedDate] = createSignal<string | null>(null);
  const [monthView, setMonthView] = createSignal<{ year: number; month: number } | null>(null);

  const allDividends = getAllDividends();
  const paidCount = getDividendsByStatus("paid").length;
  const announcedCount = getDividendsByStatus("upcoming").length;
  const projectedCount = getDividendsByStatus("projected").length;

  return (
    <div class="max-w-[1400px] mx-auto h-[calc(100vh-8rem)] animate-fade-in-up">
      <div class="grid grid-cols-3 gap-6 h-[calc(100%)]">
        <div class="col-span-2 h-full min-h-0">
          <Calendar
            year={selectedYear()}
            selectedDate={selectedDate()}
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

        <div class="col-span-1 h-full min-h-0">
          <DividendListCard
            selectedDate={selectedDate()}
            onClearDate={() => setSelectedDate(null)}
            monthView={monthView()}
            onClearMonthView={() => setMonthView(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default Dividend;
