import { For, Show, createEffect, createSignal } from "solid-js";
import type { DailySummary } from "../../../data/TradingJournal/data/types";
import { formatRupiah } from "../../../utils/format";
import CloseIcon from "@suid/icons-material/Close";
import SetupAccordionItem from "./SetupAccordionItem";
import ExecutionAccordionItem from "./ExecutionAccordionItem";

interface DailySummaryDrawerProps {
  day: DailySummary | null;
  onClose: () => void;
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

  // Separate setups and executions
  const setups = () => activeDay()?.trades.filter((t) => t.record_type === "SETUP") || [];
  const executions = () => activeDay()?.trades.filter((t) => t.record_type === "EXECUTED") || [];

  return (
    <div
      class="absolute inset-0 bg-white border border-forest/10 rounded-2xl shadow-premium flex flex-col overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] z-10"
      style={{
        transform: isOpen() ? "translate3d(0, 0, 0)" : "translate3d(100%, 0, 0)",
        opacity: isOpen() ? "1" : "0",
        "pointer-events": isOpen() ? "auto" : "none",
        visibility: isOpen() || cachedDay() ? "visible" : "hidden",
      }}
    >
      <Show when={activeDay()}>
        {(day) => (
          <>
            {/* Header */}
            <div class="px-6 py-5 flex items-center justify-between border-b border-forest/5 bg-white shrink-0">
              <div class="space-y-0.5">
                <h3 class="text-xl font-cormorant font-bold text-forest">Daily Summary</h3>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
                  {formatDateHeader(day().date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => props.onClose()}
                class="w-8 h-8 rounded-full flex items-center justify-center text-earth hover:bg-sage/20 transition-all cursor-pointer"
                aria-label="Close daily summary"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* Daily Stats Grid (Only for executed stats) */}
              <div class="grid grid-cols-2 gap-4 bg-sage/30 rounded-2xl p-4 border border-forest/5">
                <div class="space-y-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider block text-earth/60">
                    Gross Return
                  </span>
                  <span class="font-cormorant text-lg font-bold text-emerald-600">
                    {day().grossReturn >= 0 ? "+" : ""}
                    {formatRupiah(day().grossReturn)}
                  </span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider block text-earth/60">
                    Net Return
                  </span>
                  <span
                    class="font-cormorant text-lg font-bold"
                    classList={{
                      "text-emerald-600": day().netReturn > 0,
                      "text-rose-500": day().netReturn < 0,
                      "text-earth": day().netReturn === 0,
                    }}
                  >
                    {day().netReturn >= 0 ? "+" : ""}
                    {formatRupiah(day().netReturn)}
                  </span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider block text-earth/60">
                    Total Executed
                  </span>
                  <span class="font-outfit text-sm font-bold text-forest">
                    {day().tradesCount}
                  </span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider block text-earth/60">
                    Fees & Comm
                  </span>
                  <span class="font-cormorant text-lg font-bold text-rose-500">
                    -{formatRupiah(Math.abs(day().fees))}
                  </span>
                </div>
              </div>

              {/* Section 1: Setups (Plans) */}
              <div class="space-y-3">
                <div class="flex items-center justify-between px-1">
                  <h4 class="text-[11px] font-bold text-earth uppercase tracking-widest">
                    Setups & Plans ({setups().length})
                  </h4>
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-soft" />
                </div>
                <Show
                  when={setups().length > 0}
                  fallback={
                    <div class="text-center py-4 text-[11px] text-earth/50 italic bg-page-bg/30 rounded-xl border border-dashed border-forest/10">
                      No plans logged for this day.
                    </div>
                  }
                >
                  <div class="space-y-3">
                    <For each={setups()}>
                      {(trade, index) => <SetupAccordionItem trade={trade} index={index()} />}
                    </For>
                  </div>
                </Show>
              </div>

              {/* Section 2: Executions (Real Trades) */}
              <div class="space-y-3">
                <div class="flex items-center justify-between px-1">
                  <h4 class="text-[11px] font-bold text-earth uppercase tracking-widest">
                    Executions ({executions().length})
                  </h4>
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                </div>
                <Show
                  when={executions().length > 0}
                  fallback={
                    <div class="text-center py-4 text-[11px] text-earth/50 italic bg-page-bg/30 rounded-xl border border-dashed border-forest/10">
                      No executions logged for this day.
                    </div>
                  }
                >
                  <div class="space-y-3">
                    <For each={executions()}>
                      {(trade, index) => (
                        <ExecutionAccordionItem trade={trade} index={index()} />
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
