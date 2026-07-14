import { Show, For } from "solid-js";
import { DailySummary } from "../../data/TradingJournal/data/types";
import { formatRupiah, formatRupiahShort } from "../../utils/format";

interface DayCellProps {
  day: DailySummary;
  isActive: boolean;
  isToday?: boolean;
  onClick: () => void;
}

export default function DayCell(props: DayCellProps) {
  const { day, isActive, isToday, onClick } = props;

  // Render empty placeholder cell (for leading/trailing days of calendar grid)
  if (day.isCustomEmpty) {
    return (
      <div class="h-full w-full rounded-xl bg-forest/5 border border-forest/5 p-2 opacity-40 relative">
        <span class="text-[10px] md:text-[11px] font-bold text-earth/50 absolute top-2 left-2">
          {day.dayNumber !== -1 ? day.dayNumber : ""}
        </span>
      </div>
    );
  }

  const isWeekend = (() => {
    const d = new Date(day.date);
    return d.getDay() === 0 || d.getDay() === 6;
  })();

  const Ribbon = () => (
    <div class="absolute -top-1 -right-1 z-10 pointer-events-none">
      <div class="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-[0_2px_4px_rgba(245,158,11,0.4)] flex items-center justify-center transform rotate-12 uppercase tracking-widest">
        Today
      </div>
    </div>
  );

  const todayClassList = {
    "ring-2 ring-amber-500 ring-offset-1 shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10": isToday,
  };

  // Render weekend cell
  if (isWeekend) {
    return (
      <div 
        class="h-full w-full rounded-xl bg-forest/5 border border-forest/5 p-2 opacity-60 relative transition-all"
        classList={todayClassList}
      >
        <Show when={isToday}><Ribbon /></Show>
        <span class="text-[10px] md:text-[11px] font-bold text-earth/50 absolute top-2 left-2">{day.dayNumber}</span>
      </div>
    );
  }

  // Render holiday cell
  if (day.isHoliday) {
    return (
      <div 
        class="h-full w-full rounded-xl bg-forest/5 border border-forest/5 p-2 relative flex flex-col justify-end items-center transition-all"
        classList={todayClassList}
      >
        <Show when={isToday}><Ribbon /></Show>
        <span class="text-[10px] md:text-[11px] font-bold text-earth/50 absolute top-2 left-2">{day.dayNumber}</span>
        <span class="text-[8px] font-bold text-earth/40 uppercase tracking-wider mb-1">Holiday</span>
      </div>
    );
  }

  // Determine heatmap background and text colors based on net return in Rupiah
  let bgClass = "bg-white border-forest/10";
  let netColorClass = "text-earth";
  const hasTrades = day.tradesCount > 0;
  
  if (hasTrades) {
    if (day.netReturn >= 1000000) {
      bgClass = "bg-emerald-500/20 hover:bg-emerald-500/25 border-emerald-500/20";
      netColorClass = "text-emerald-700 font-bold";
    } else if (day.netReturn > 0) {
      bgClass = "bg-emerald-500/8 hover:bg-emerald-500/12 border-emerald-500/10";
      netColorClass = "text-emerald-600 font-semibold";
    } else if (day.netReturn === 0) {
      bgClass = "bg-sage hover:bg-sage/90 border-forest/10";
      netColorClass = "text-earth font-medium";
    } else if (day.netReturn <= -1000000) {
      bgClass = "bg-rose-500/20 hover:bg-rose-500/25 border-rose-500/20";
      netColorClass = "text-rose-700 font-bold";
    } else {
      bgClass = "bg-rose-500/8 hover:bg-rose-500/12 border-rose-500/10";
      netColorClass = "text-rose-600 font-semibold";
    }
  } else {
    // Weekday with no trades
    bgClass = "bg-white/60 hover:bg-white border-forest/5";
  }

  // Calculate total R-multiple for the day
  const totalR = day.trades.reduce((sum, t) => sum + t.returnR, 0);

  // Position tooltip top-full for first row (dayNumber <= 7) to prevent cutoff at calendar top
  const isFirstRow = () => day.dayNumber > 0 && day.dayNumber <= 7;

  return (
    <button
      onClick={onClick}
      class={`h-full w-full rounded-xl border p-1 md:p-1.5 relative flex flex-col items-end justify-between text-right transition-all duration-300 hover:-translate-y-0.5 group ${bgClass}`}
      classList={{
        "ring-2 ring-forest ring-offset-2 shadow-premium z-20": isActive,
        ...todayClassList,
        "hover:shadow-premium z-10 hover:z-20": true
      }}
    >
      <Show when={isToday}><Ribbon /></Show>
      
      <span class="text-[10px] md:text-[11px] font-bold absolute top-1.5 left-1.5 transition-colors duration-300 group-hover:text-forest"
        classList={{
          "text-forest font-black": isActive,
          "text-earth/60": !isActive,
        }}
      >
        {day.dayNumber}
      </span>

      {hasTrades ? (
        <div class="mt-4 flex flex-col gap-0.5 items-end w-full">
          <span class={`text-[10px] md:text-[11px] font-outfit ${netColorClass}`}>
            {day.netReturn >= 0 ? "+" : ""}{formatRupiahShort(day.netReturn)}
          </span>
          <span class="text-[8px] md:text-[9px] text-earth font-medium">
            {totalR >= 0 ? "+" : ""}{totalR.toFixed(1)}R
          </span>
          {day.trades[0]?.ticker && (
            <div class="flex flex-wrap justify-end gap-1 mt-0.5">
              <span class="px-1 py-0.5 rounded bg-forest/5 text-[7.5px] font-bold text-forest uppercase tracking-wider">
                {day.trades[0].ticker}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div class="mt-auto w-full text-center text-[7.5px] font-bold text-earth/25 uppercase tracking-widest pb-0.5">
          Empty
        </div>
      )}

      {/* Tooltip displaying detailed PnL of individual trades on hover */}
      <Show when={hasTrades}>
        <div 
          class="absolute left-1/2 -translate-x-1/2 w-60 p-3 bg-neutral-900/95 backdrop-blur-md text-white rounded-xl text-left shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100] text-[11px] font-outfit border border-white/10"
          classList={{
            "top-full mt-2": isFirstRow(),
            "bottom-full mb-2": !isFirstRow()
          }}
        >
          <div class="font-bold border-b border-white/10 pb-1 mb-1.5 flex justify-between">
            <span>Day {day.dayNumber} Trades</span>
            <span class="text-white/60">{day.trades.length} trades</span>
          </div>
          <div class="space-y-1 max-h-36 overflow-y-auto">
            <For each={day.trades}>
              {(trade) => (
                <div class="flex justify-between items-center gap-2">
                  <span class="text-white/80 truncate">
                    &bull; {trade.ticker}
                  </span>
                  <span class="font-semibold shrink-0" classList={{
                    "text-emerald-400": trade.pnl >= 0,
                    "text-rose-400": trade.pnl < 0
                  }}>
                    {trade.pnl >= 0 ? "+" : ""}{formatRupiah(trade.pnl)} ({trade.returnR >= 0 ? "+" : ""}{trade.returnR.toFixed(1)}R)
                  </span>
                </div>
              )}
            </For>
          </div>
          <div class="border-t border-white/10 pt-1.5 mt-1.5 flex justify-between font-bold">
            <span>Net Return</span>
            <span classList={{
              "text-emerald-400": day.netReturn > 0,
              "text-rose-400": day.netReturn < 0,
              "text-white": day.netReturn === 0
            }}>
              {day.netReturn >= 0 ? "+" : ""}{formatRupiah(day.netReturn)}
            </span>
          </div>
          {/* Tooltip Arrow */}
          <div 
            class="absolute left-1/2 -translate-x-1/2 border-4 border-transparent"
            classList={{
              "bottom-full border-b-neutral-900/95": isFirstRow(),
              "top-full border-t-neutral-900/95": !isFirstRow()
            }}
          />
        </div>
      </Show>
    </button>
  );
}
