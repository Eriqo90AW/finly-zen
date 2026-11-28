import { For, Show, createMemo } from "solid-js";
import type { DailySummary } from "../../../data/TradingJournal/data/types";
import { formatRupiah, formatRupiahShort } from "../../../utils/format";
import { calculateTradeR } from "../../../utils/tradingJournalR";

interface DayCellProps {
  day: DailySummary;
  isActive: boolean;
  isToday?: boolean;
  onClick: () => void;
}

const TodayRibbon = () => (
  <div class="absolute -top-1 -right-1 z-10 pointer-events-none">
    <div class="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-[0_2px_4px_rgba(245,158,11,0.4)] flex items-center justify-center transform rotate-12 uppercase tracking-widest">
      Today
    </div>
  </div>
);

export default function DayCell(props: DayCellProps) {
  const isWeekend = createMemo(() => {
    const d = new Date(props.day.date);
    return d.getDay() === 0 || d.getDay() === 6;
  });

  const hasTrades = createMemo(() => props.day.tradesCount > 0);

  const heatmapStyles = createMemo(() => {
    if (!hasTrades()) {
      return {
        bgClass: "bg-white/60 hover:bg-white border-forest/5",
        netColorClass: "text-earth",
      };
    }

    const net = props.day.netReturn;
    if (net >= 1000000) {
      return {
        bgClass: "bg-emerald-500/20 hover:bg-emerald-500/25 border-emerald-500/20",
        netColorClass: "text-emerald-700 font-bold",
      };
    }
    if (net > 0) {
      return {
        bgClass: "bg-emerald-500/8 hover:bg-emerald-500/12 border-emerald-500/10",
        netColorClass: "text-emerald-600 font-semibold",
      };
    }
    if (net === 0) {
      return {
        bgClass: "bg-sage hover:bg-sage/90 border-forest/10",
        netColorClass: "text-earth font-medium",
      };
    }
    if (net <= -1000000) {
      return {
        bgClass: "bg-rose-500/20 hover:bg-rose-500/25 border-rose-500/20",
        netColorClass: "text-rose-700 font-bold",
      };
    }
    return {
      bgClass: "bg-rose-500/8 hover:bg-rose-500/12 border-rose-500/10",
      netColorClass: "text-rose-600 font-semibold",
    };
  });

  const dayRStats = createMemo(() => {
    const tradeRValues = props.day.trades
      .filter((trade) => trade.record_type === "EXECUTED")
      .map(calculateTradeR);
    const totalR = tradeRValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const hasCalculatedR = tradeRValues.some((value) => value !== null);
    return { totalR, hasCalculatedR };
  });

  // Position tooltip top-full for first row (dayNumber <= 7) to prevent cutoff at calendar top
  const isFirstRow = () => props.day.dayNumber > 0 && props.day.dayNumber <= 7;

  return (
    <Show
      when={!props.day.isCustomEmpty}
      fallback={
        <div class="h-full w-full rounded-xl bg-forest/5 border border-forest/5 p-2 opacity-40 relative">
          <span class="text-[10px] md:text-[11px] font-bold text-earth/50 absolute top-2 left-2">
            {props.day.dayNumber !== -1 ? props.day.dayNumber : ""}
          </span>
        </div>
      }
    >
      <Show
        when={!isWeekend()}
        fallback={
          <div
            class="h-full w-full rounded-xl bg-forest/5 border border-forest/5 p-2 opacity-60 relative transition-all"
            classList={{
              "ring-2 ring-amber-500 ring-offset-1 shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10":
                props.isToday,
            }}
          >
            <Show when={props.isToday}>
              <TodayRibbon />
            </Show>
            <span class="text-[10px] md:text-[11px] font-bold text-earth/50 absolute top-2 left-2">
              {props.day.dayNumber}
            </span>
          </div>
        }
      >
        <Show
          when={!props.day.isHoliday}
          fallback={
            <div
              class="h-full w-full rounded-xl bg-forest/5 border border-forest/5 p-2 relative flex flex-col justify-end items-center transition-all"
              classList={{
                "ring-2 ring-amber-500 ring-offset-1 shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10":
                  props.isToday,
              }}
            >
              <Show when={props.isToday}>
                <TodayRibbon />
              </Show>
              <span class="text-[10px] md:text-[11px] font-bold text-earth/50 absolute top-2 left-2">
                {props.day.dayNumber}
              </span>
              <span class="text-[8px] font-bold text-earth/40 uppercase tracking-wider mb-1">
                Holiday
              </span>
            </div>
          }
        >
          <button
            type="button"
            onClick={() => props.onClick()}
            class={`h-full w-full rounded-xl border p-1 md:p-1.5 relative flex flex-col items-stretch justify-end text-center transition-all duration-300 hover:-translate-y-0.5 group ${heatmapStyles().bgClass}`}
            classList={{
              "ring-2 ring-forest ring-offset-2 shadow-premium z-20": props.isActive,
              "ring-2 ring-amber-500 ring-offset-1 shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10":
                props.isToday,
              "hover:shadow-premium z-10 hover:z-20": true,
            }}
          >
            <Show when={props.isToday}>
              <TodayRibbon />
            </Show>

            <span
              class="text-[10px] md:text-[11px] font-bold absolute top-1.5 left-1.5 transition-colors duration-300 group-hover:text-forest"
              classList={{
                "text-forest font-black": props.isActive,
                "text-earth/60": !props.isActive,
              }}
            >
              {props.day.dayNumber}
            </span>

            <Show
              when={hasTrades()}
              fallback={
                <div class="mt-auto w-full text-center text-[7.5px] font-bold text-earth/25 uppercase tracking-widest pb-0.5">
                  Empty
                </div>
              }
            >
              <div class="flex min-w-0 w-full flex-col items-center gap-0 leading-tight pb-0.5">
                <span
                  class={`max-w-full truncate text-[10px] md:text-[11px] font-outfit ${heatmapStyles().netColorClass}`}
                >
                  {props.day.netReturn >= 0 ? "+" : ""}
                  {formatRupiahShort(props.day.netReturn)}
                </span>
                <Show
                  when={dayRStats().hasCalculatedR}
                  fallback={
                    <span class="text-[8px] md:text-[9px] text-earth/50 font-medium leading-tight">
                      R unavailable
                    </span>
                  }
                >
                  <span class="text-[8px] md:text-[9px] text-earth font-medium leading-tight">
                    {dayRStats().totalR >= 0 ? "+" : ""}
                    {dayRStats().totalR.toFixed(1)}R
                  </span>
                </Show>
                <Show when={props.day.trades[0]?.ticker}>
                  <div class="mt-0.5 flex max-w-full justify-center gap-1">
                    <span class="max-w-full truncate rounded bg-forest/5 px-1 py-0.5 text-[7.5px] font-bold text-forest uppercase tracking-wider leading-none">
                      {props.day.trades[0].ticker}
                    </span>
                  </div>
                </Show>
              </div>
            </Show>

            {/* Tooltip displaying detailed PnL of individual trades on hover */}
            <Show when={hasTrades()}>
              <div
                class="absolute left-1/2 -translate-x-1/2 w-60 p-3 bg-neutral-900/95 backdrop-blur-md text-white rounded-xl text-left shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100] text-[11px] font-outfit border border-white/10"
                classList={{
                  "top-full mt-2": isFirstRow(),
                  "bottom-full mb-2": !isFirstRow(),
                }}
              >
                <div class="font-bold border-b border-white/10 pb-1 mb-1.5 flex justify-between">
                  <span>Day {props.day.dayNumber} Trades</span>
                  <span class="text-white/60">{props.day.trades.length} trades</span>
                </div>
                <div class="space-y-1 max-h-36 overflow-y-auto">
                  <For each={props.day.trades}>
                    {(trade) => {
                      const isSetup = trade.record_type === "SETUP";
                      const pnlValue = isSetup ? 0 : trade.net_pnl || 0;
                      const rValue = isSetup ? trade.planned_rr : calculateTradeR(trade);
                      return (
                        <div class="flex justify-between items-center gap-2">
                          <span class="text-white/80 truncate text-[10px]">
                            &bull; {trade.ticker}{" "}
                            <span class="text-[8px] text-white/40">({trade.record_type})</span>
                          </span>
                          <span
                            class="font-semibold shrink-0 text-[10px]"
                            classList={{
                              "text-emerald-400": !isSetup && pnlValue >= 0,
                              "text-rose-400": !isSetup && pnlValue < 0,
                              "text-blue-400": isSetup,
                            }}
                          >
                            {isSetup
                              ? rValue !== null && rValue !== undefined
                                ? `${rValue.toFixed(1)}R Plan`
                                : "R Plan unavailable"
                              : `${pnlValue >= 0 ? "+" : ""}${formatRupiah(pnlValue)} (${rValue !== null ? `${rValue >= 0 ? "+" : ""}${rValue.toFixed(1)}R` : "R unavailable"})`}
                          </span>
                        </div>
                      );
                    }}
                  </For>
                </div>
                <div class="border-t border-white/10 pt-1.5 mt-1.5 flex justify-between font-bold">
                  <span>Net Return</span>
                  <span
                    classList={{
                      "text-emerald-400": props.day.netReturn > 0,
                      "text-rose-400": props.day.netReturn < 0,
                      "text-white": props.day.netReturn === 0,
                    }}
                  >
                    {props.day.netReturn >= 0 ? "+" : ""}
                    {formatRupiah(props.day.netReturn)}
                  </span>
                </div>
                <div
                  class="absolute left-1/2 -translate-x-1/2 border-4 border-transparent"
                  classList={{
                    "bottom-full border-b-neutral-900/95": isFirstRow(),
                    "top-full border-t-neutral-900/95": !isFirstRow(),
                  }}
                />
              </div>
            </Show>
          </button>
        </Show>
      </Show>
    </Show>
  );
}
