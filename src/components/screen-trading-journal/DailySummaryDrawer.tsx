import { Show, For, createSignal, createEffect } from "solid-js";
import { DailySummary, Trade } from "../../data/TradingJournal/data/types";
import { formatRupiah } from "../../utils/format";
import { calculateTradeR } from "../../utils/tradingJournalR";
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

  // Separate setups and executions
  const setups = () => activeDay()?.trades.filter(t => t.record_type === 'SETUP') || [];
  const executions = () => activeDay()?.trades.filter(t => t.record_type === 'EXECUTED') || [];

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
                <h3 class="text-xl font-cormorant font-bold text-forest">
                  Daily Summary
                </h3>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
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
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* Daily Stats Grid (Only for executed stats) */}
              <div class="grid grid-cols-2 gap-4 bg-sage/30 rounded-2xl p-4 border border-forest/5">
                <div class="space-y-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider block text-earth/60">Gross Return</span>
                  <span class="font-cormorant text-lg font-bold text-emerald-600">
                    {day().grossReturn >= 0 ? "+" : ""}{formatRupiah(day().grossReturn)}
                  </span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider block text-earth/60">Net Return</span>
                  <span 
                    class="font-cormorant text-lg font-bold"
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
                  <span class="text-[10px] font-bold uppercase tracking-wider block text-earth/60">Total Executed</span>
                  <span class="font-outfit text-sm font-bold text-forest">{day().tradesCount}</span>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider block text-earth/60">Fees & Comm</span>
                  <span class="font-cormorant text-lg font-bold text-rose-500">
                    -{formatRupiah(Math.abs(day().fees))}
                  </span>
                </div>
              </div>

              {/* 🟦 SECTION 1: SETUPS (PLANS) */}
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
                      {(trade, index) => (
                        <SetupAccordionItem trade={trade} index={index()} />
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              {/* 🟩 SECTION 2: EXECUTIONS (REAL TRADES) */}
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

// Subcomponent: Accordion for SETUP trades
function SetupAccordionItem(props: { trade: Trade; index: number }) {
  const [isExpanded, setIsExpanded] = createSignal(false);

  return (
    <div class="premium-card bg-white overflow-hidden border border-blue-100 hover:border-blue-200 hover:shadow-md transition-all">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded())}
        class="w-full p-4 flex justify-between items-center text-left hover:bg-blue-50/10 transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-3">
          <span class="px-2 py-1 rounded bg-blue-50 text-[10px] font-black text-blue-600 border border-blue-100">
            {props.trade.setup_quality || "A"}
          </span>
          <div>
            <div class="font-outfit font-bold text-forest text-sm leading-tight">{props.trade.ticker}</div>
            <div class="text-[10px] font-bold text-earth uppercase tracking-wider mt-0.5">{props.trade.setup_type || "Setup Plan"}</div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md">
            {props.trade.setup_status}
          </span>
          <span class="material-icons text-earth transition-transform duration-300 text-lg"
            classList={{ "rotate-180": isExpanded() }}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Body */}
      <Show when={isExpanded()}>
        <div class="p-4 pt-0 border-t border-forest/5 bg-blue-50/5 space-y-4 animate-fade-in-up">
          {/* Targets Grid */}
          <div class="grid grid-cols-3 gap-2 mt-4">
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">Ideal Entry</span>
              <span class="font-outfit text-xs font-semibold text-forest">
                {props.trade.entry_zone_ideal ? `Rp${props.trade.entry_zone_ideal}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">Max Entry</span>
              <span class="font-outfit text-xs font-semibold text-earth">
                {props.trade.entry_zone_max ? `Rp${props.trade.entry_zone_max}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">Planned RR</span>
              <span class="font-outfit text-xs font-semibold text-blue-600">
                {props.trade.planned_rr ? `${props.trade.planned_rr}R` : "-"}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">Stop Loss</span>
              <span class="font-outfit text-xs font-semibold text-rose-500">
                {props.trade.stop_loss ? `Rp${props.trade.stop_loss}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">TP 1</span>
              <span class="font-outfit text-xs font-semibold text-emerald-600">
                {props.trade.tp1_price ? `Rp${props.trade.tp1_price}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">TP 2</span>
              <span class="font-outfit text-xs font-semibold text-emerald-600">
                {props.trade.tp2_price ? `Rp${props.trade.tp2_price}` : "-"}
              </span>
            </div>
          </div>

          {/* Raw Analysis */}
          <Show when={props.trade.analysis_raw}>
            <div class="space-y-1">
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">Analysis RAW</span>
              <div class="bg-white border border-forest/5 rounded-xl p-2.5 text-xs text-earth leading-relaxed font-outfit whitespace-pre-line">
                {props.trade.analysis_raw}
              </div>
            </div>
          </Show>

          {/* Checklist */}
          <Show when={props.trade.checklist && props.trade.checklist.length > 0}>
            <div class="space-y-1.5">
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">Confluences</span>
              <div class="flex flex-wrap gap-1.5">
                <For each={props.trade.checklist}>
                  {(item) => (
                    <span class="px-2.5 py-1 bg-blue-50 border border-blue-100 rounded text-[9px] font-bold uppercase tracking-wider text-blue-700">
                      {item}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Notes */}
          <Show when={props.trade.notes}>
            <div class="space-y-1">
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">Notes</span>
              <div class="bg-white border border-forest/5 rounded-xl p-2.5 text-xs text-earth leading-relaxed font-outfit">
                {props.trade.notes}
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// Subcomponent: Accordion for EXECUTED trades
function ExecutionAccordionItem(props: { trade: Trade; index: number }) {
  const [isExpanded, setIsExpanded] = createSignal(props.index === 0);

  const isWin = () => (props.trade.net_pnl || 0) >= 0;

  return (
    <div class="premium-card bg-white overflow-hidden border border-forest/10 hover:shadow-md hover:border-forest/20 transition-all duration-200">
      {/* Header Row */}
      <button
        onClick={() => setIsExpanded(!isExpanded())}
        class="w-full p-4 flex justify-between items-center text-left hover:bg-sage/10 transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-3">
          <span 
            class="w-2.5 h-2.5 rounded-full animate-pulse-soft shrink-0"
            classList={{
              "bg-emerald-500": isWin() && props.trade.pos_status === 'CLOSED',
              "bg-rose-500": !isWin() && props.trade.pos_status === 'CLOSED',
              "bg-amber-400": props.trade.pos_status !== 'CLOSED', // open / partial position
            }}
          />
          <div>
            <div class="flex items-center gap-2">
              <span class="font-outfit font-bold text-forest text-sm leading-tight">{props.trade.ticker}</span>
              <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-forest/5 text-forest tracking-wide border border-forest/10 uppercase leading-none">
                {props.trade.direction}
              </span>
            </div>
            <div class="text-[10px] font-bold text-earth uppercase tracking-wider mt-0.5">
              {props.trade.pos_status} &bull; {props.trade.lots} lot
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <div class="text-right">
            <div 
              class="font-cormorant font-bold text-[15px] leading-tight"
              classList={{
                "text-emerald-600": isWin(),
                "text-rose-500": !isWin(),
              }}
            >
              {props.trade.net_pnl !== null ? `${props.trade.net_pnl >= 0 ? "+" : ""}${formatRupiah(props.trade.net_pnl)}` : "OPEN"}
            </div>
            <div class="text-[9px] font-medium text-earth/60 mt-0.5">
              {(() => {
                const rValue = calculateTradeR(props.trade);
                return rValue !== null ? `${rValue >= 0 ? "+" : ""}${rValue.toFixed(2)}R` : "R unavailable";
              })()}
            </div>
          </div>
          <span class="material-icons text-earth transition-transform duration-300 text-lg"
            classList={{ "rotate-180": isExpanded() }}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Accordion Body */}
      <Show when={isExpanded()}>
        <div class="p-4 pt-0 border-t border-forest/5 bg-sage/5 space-y-4 animate-fade-in-up">
          {/* Prices Grid */}
          <div class="grid grid-cols-3 gap-2 mt-4">
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">Avg Entry</span>
              <span class="font-outfit text-xs font-semibold text-forest">
                {props.trade.avg_entry_price ? `Rp${Math.round(props.trade.avg_entry_price)}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">Avg Exit</span>
              <span class="font-outfit text-xs font-semibold text-forest">
                {props.trade.avg_exit_price ? `Rp${Math.round(props.trade.avg_exit_price)}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">Stop Loss</span>
              <span class="font-outfit text-xs font-semibold text-rose-500">
                {props.trade.stop_loss ? `Rp${props.trade.stop_loss}` : "-"}
              </span>
            </div>
          </div>

          {/* Details (Lots distributions & Meta) */}
          <div class="grid grid-cols-2 gap-2.5 text-xs font-outfit bg-white p-3 rounded-xl border border-forest/5">
            <div class="flex justify-between">
              <span class="text-earth/70 font-medium">Lots remaining:</span>
              <span class="font-bold text-forest">{props.trade.lots_remaining ?? 0}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-earth/70 font-medium">Lots closed:</span>
              <span class="font-bold text-forest">{props.trade.lots_closed ?? 0}</span>
            </div>
            <div class="flex justify-between col-span-2 border-t border-forest/5 pt-1.5 mt-1">
              <span class="text-earth/70 font-medium">Transaction Fees:</span>
              <span class="font-bold text-rose-500">Rp{Math.round(props.trade.total_fee || 0).toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between col-span-2">
              <span class="text-earth/70 font-medium">Risk Amount:</span>
              <span class="font-bold text-earth">Rp{Math.round(props.trade.risk_amount || 0).toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between border-t border-forest/5 pt-1.5 mt-1">
              <span class="text-earth/70 font-medium">Hold Days:</span>
              <span class="font-bold text-forest">{props.trade.hold_days ?? "-"} days</span>
            </div>
            <div class="flex justify-between border-t border-forest/5 pt-1.5 mt-1">
              <span class="text-earth/70 font-medium">Session:</span>
              <span class="font-bold text-forest">{props.trade.entry_session ?? "-"}</span>
            </div>
          </div>

          {/* Entry Details Legs JSON renderer */}
          <Show when={props.trade.entry_details && props.trade.entry_details.length > 0}>
            <div class="space-y-1.5">
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">Entry Legs ({props.trade.entry_details?.length})</span>
              <div class="bg-white border border-forest/5 rounded-xl p-2.5 space-y-1.5 text-xs">
                <For each={props.trade.entry_details}>
                  {(leg) => (
                    <div class="flex justify-between text-earth">
                      <span class="font-semibold">{leg.lot} lot @ Rp{leg.price}</span>
                      <span class="italic text-earth/60">{leg.reason || ""}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Exit Details Legs JSON renderer */}
          <Show when={props.trade.exit_details && props.trade.exit_details.length > 0}>
            <div class="space-y-1.5 animate-fade-in-up">
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">Exit Legs ({props.trade.exit_details?.length})</span>
              <div class="bg-white border border-forest/5 rounded-xl p-2.5 space-y-1.5 text-xs">
                <For each={props.trade.exit_details}>
                  {(leg) => (
                    <div class="flex justify-between text-earth">
                      <span class="font-semibold">{leg.lot} lot @ Rp{leg.price}</span>
                      <span class="text-forest font-bold">{leg.type}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Psychology Tags */}
          <Show when={props.trade.psychology_tags && props.trade.psychology_tags.length > 0}>
            <div class="space-y-1.5">
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">Mindset Psychology</span>
              <div class="flex flex-wrap gap-1.5">
                <For each={props.trade.psychology_tags}>
                  {(tag) => (
                    <span class="px-2.5 py-1 bg-sage/40 border border-forest/10 rounded-full text-[9px] font-bold uppercase tracking-wider text-forest">
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
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">Notes</span>
              <div class="bg-white border border-forest/5 rounded-xl p-2.5 text-xs text-earth leading-relaxed font-outfit">
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
