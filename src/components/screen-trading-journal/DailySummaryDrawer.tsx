import { Show, For, createSignal, createEffect } from "solid-js";
import { DailySummary, Trade } from "../../data/TradingJournal/data/types";
import { formatRupiah } from "../../utils/format";
import CloseIcon from "@suid/icons-material/Close";

interface DailySummaryDrawerProps {
  day: DailySummary | null;
  onClose: () => void;
}

export default function DailySummaryDrawer(props: DailySummaryDrawerProps) {
  const [cachedDay, setCachedDay] = createSignal<DailySummary | null>(null);

  // Keep a cached copy of the day data so it doesn't disappear during exit transitions
  createEffect(() => {
    if (props.day) {
      setCachedDay(props.day);
    }
  });

  const isOpen = () => !!props.day;
  const activeDay = () => props.day || cachedDay();

  return (
    <div
      class="shrink-0 bg-white border border-forest/10 rounded-2xl shadow-premium flex flex-col sticky top-24 self-start max-h-[calc(100vh-120px)] overflow-hidden transition-all duration-450 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        width: isOpen() ? "380px" : "0px",
        opacity: isOpen() ? "1" : "0",
        transform: isOpen() ? "translate3d(0, 0, 0)" : "translate3d(30px, 0, 0)",
        "border-width": isOpen() ? "1px" : "0px",
        "margin-left": isOpen() ? "1.5rem" : "0rem", // spacing gap-6
        visibility: isOpen() || cachedDay() ? "visible" : "hidden",
      }}
    >
      <Show when={activeDay()}>
        {(day) => (
          <>
            {/* Header */}
            <div class="px-6 py-5 flex items-center justify-between border-b border-forest/5 bg-white shrink-0">
              <div class="space-y-0.5">
                <h3 class="text-xl font-cormorant font-bold text-forest">
                  Daily Summary
                </h3>
                <p class="text-[9px] font-bold text-earth uppercase tracking-widest">
                  {formatDateHeader(day().date)}
                </p>
              </div>
              <button
                onClick={props.onClose}
                class="w-8 h-8 rounded-full flex items-center justify-center text-earth hover:bg-sage/20 transition-all cursor-pointer"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              {/* Daily Stats Grid */}
              <div class="grid grid-cols-2 gap-3 bg-sage/30 rounded-2xl p-3 border border-forest/5">
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold uppercase tracking-wider block text-earth/60">Gross Return</span>
                  <span class="font-cormorant text-md font-bold text-emerald-600">
                    {day().grossReturn >= 0 ? "+" : ""}{formatRupiah(day().grossReturn)}
                  </span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold uppercase tracking-wider block text-earth/60">Net Return</span>
                  <span 
                    class="font-cormorant text-md font-bold"
                    classList={{
                      "text-emerald-600": day().netReturn > 0,
                      "text-rose-500": day().netReturn < 0,
                      "text-earth": day().netReturn === 0,
                    }}
                  >
                    {day().netReturn >= 0 ? "+" : ""}{formatRupiah(day().netReturn)}
                  </span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold uppercase tracking-wider block text-earth/60">Total Trades</span>
                  <span class="font-outfit text-sm font-bold text-forest">{day().tradesCount}</span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold uppercase tracking-wider block text-earth/60">Fees & Comm</span>
                  <span class="font-cormorant text-md font-bold text-rose-500">
                    -{formatRupiah(Math.abs(day().fees))}
                  </span>
                </div>
              </div>

              {/* Trades Logs */}
              <div class="space-y-3">
                <h4 class="text-[10px] font-bold text-earth uppercase tracking-widest px-1">Trades Log</h4>
                
                <Show 
                  when={day().trades.length > 0}
                  fallback={
                    <div class="text-center py-6 text-xs text-earth/50 italic bg-page-bg/30 rounded-2xl border border-dashed border-forest/10">
                      No trades logged for this day.
                    </div>
                  }
                >
                  <div class="space-y-3">
                    <For each={day().trades}>
                      {(trade, index) => (
                        <TradeAccordionItem trade={trade} index={index()} />
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}

// Subcomponent: Accordion for each trade
function TradeAccordionItem(props: { trade: Trade; index: number }) {
  const [isExpanded, setIsExpanded] = createSignal(props.index === 0);

  const isWin = () => props.trade.pnl >= 0;

  return (
    <div class="premium-card bg-white overflow-hidden border border-forest/10 transition-shadow duration-200">
      {/* Header Row */}
      <button
        onClick={() => setIsExpanded(!isExpanded())}
        class="w-full p-3 flex justify-between items-center text-left hover:bg-sage/10 transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-2.5">
          <span 
            class="w-2 h-2 rounded-full animate-pulse-soft"
            classList={{
              "bg-emerald-500": isWin(),
              "bg-rose-500": !isWin(),
            }}
          />
          <div>
            <div class="font-outfit font-bold text-forest text-xs">{props.trade.ticker}</div>
            <div class="text-[9px] font-bold text-earth uppercase tracking-wider">{props.trade.setup}</div>
          </div>
        </div>
        
        <div class="flex items-center gap-1.5">
          <span 
            class="font-cormorant font-bold text-sm"
            classList={{
              "text-emerald-600": isWin(),
              "text-rose-500": !isWin(),
            }}
          >
            {props.trade.returnR >= 0 ? "+" : ""}{props.trade.returnR.toFixed(1)}R
          </span>
          <span class="material-icons text-earth transition-transform duration-300 text-md"
            classList={{ "rotate-180": isExpanded() }}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Accordion Body */}
      <Show when={isExpanded()}>
        <div class="p-3 pt-0 border-t border-forest/5 bg-sage/5 space-y-3 animate-fade-in-up">
          {/* Targets / Metrics Grid */}
          <div class="grid grid-cols-3 gap-1.5 mt-3">
            <div class="bg-white p-1.5 rounded-xl border border-forest/5 text-center">
              <span class="text-[7px] font-bold uppercase tracking-wider block text-earth/60">Entry</span>
              <span class="font-outfit text-[11px] font-semibold text-forest">{formatRupiah(props.trade.entry)}</span>
            </div>
            <div class="bg-white p-1.5 rounded-xl border border-forest/5 text-center">
              <span class="text-[7px] font-bold uppercase tracking-wider block text-earth/60">Stop</span>
              <span class="font-outfit text-[11px] font-semibold text-rose-500">{formatRupiah(props.trade.stopLoss)}</span>
            </div>
            <div class="bg-white p-1.5 rounded-xl border border-forest/5 text-center">
              <span class="text-[7px] font-bold uppercase tracking-wider block text-earth/60">Target</span>
              <span class="font-outfit text-[11px] font-semibold text-emerald-600">{formatRupiah(props.trade.takeProfit)}</span>
            </div>
          </div>

          {/* Confluence Checklist */}
          <Show when={props.trade.checklist.length > 0}>
            <div class="space-y-1">
              <span class="text-[8px] font-bold text-earth uppercase tracking-widest block">Confluence</span>
              <div class="flex flex-col gap-0.5">
                <For each={props.trade.checklist}>
                  {(item) => (
                    <div class="flex items-center gap-1.5 text-[10px] text-forest font-medium">
                      <span class="material-icons text-emerald-600 text-xs">check_circle</span>
                      {item}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Psychology Tags */}
          <Show when={props.trade.psychologyTags.length > 0}>
            <div class="space-y-1">
              <span class="text-[8px] font-bold text-earth uppercase tracking-widest block">Psychology</span>
              <div class="flex flex-wrap gap-1">
                <For each={props.trade.psychologyTags}>
                  {(tag) => (
                    <span class="px-2 py-0.5 bg-sage/40 border border-forest/10 rounded-full text-[8px] font-bold uppercase tracking-wider text-forest">
                      {tag}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Notes */}
          <Show when={props.trade.notes}>
            <div class="space-y-1">
              <span class="text-[8px] font-bold text-earth uppercase tracking-widest block">Notes</span>
              <div class="bg-white border border-forest/5 rounded-xl p-2 text-[10px] text-earth leading-relaxed font-outfit">
                {props.trade.notes}
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// Utility to format date headers nicely: e.g. July 15, 2024
function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}
