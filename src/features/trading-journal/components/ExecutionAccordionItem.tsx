import { For, Show, createSignal } from "solid-js";
import type { Trade } from "../../../data/TradingJournal/data/types";
import { formatRupiah } from "../../../utils/format";
import { calculateTradeR } from "../../../utils/tradingJournalR";

interface ExecutionAccordionItemProps {
  trade: Trade;
  index: number;
}

export default function ExecutionAccordionItem(props: ExecutionAccordionItemProps) {
  const [isExpanded, setIsExpanded] = createSignal(props.index === 0);

  const isWin = () => (props.trade.net_pnl || 0) >= 0;

  return (
    <div class="premium-card bg-white overflow-hidden border border-forest/10 hover:shadow-md hover:border-forest/20 transition-all duration-200">
      {/* Header Row */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded())}
        class="w-full p-4 flex justify-between items-center text-left hover:bg-sage/10 transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-3">
          <span
            class="w-2.5 h-2.5 rounded-full animate-pulse-soft shrink-0"
            classList={{
              "bg-emerald-500": isWin() && props.trade.pos_status === "CLOSED",
              "bg-rose-500": !isWin() && props.trade.pos_status === "CLOSED",
              "bg-amber-400": props.trade.pos_status !== "CLOSED",
            }}
          />
          <div>
            <div class="flex items-center gap-2">
              <span class="font-outfit font-bold text-forest text-sm leading-tight">
                {props.trade.ticker}
              </span>
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
              {props.trade.net_pnl !== null
                ? `${props.trade.net_pnl >= 0 ? "+" : ""}${formatRupiah(props.trade.net_pnl)}`
                : "OPEN"}
            </div>
            <div class="text-[9px] font-medium text-earth/60 mt-0.5">
              {(() => {
                const rValue = calculateTradeR(props.trade);
                return rValue !== null
                  ? `${rValue >= 0 ? "+" : ""}${rValue.toFixed(2)}R`
                  : "R unavailable";
              })()}
            </div>
          </div>
          <span
            class="material-icons text-earth transition-transform duration-300 text-lg"
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
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                Avg Entry
              </span>
              <span class="font-outfit text-xs font-semibold text-forest">
                {props.trade.avg_entry_price
                  ? `Rp${Math.round(props.trade.avg_entry_price)}`
                  : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                Avg Exit
              </span>
              <span class="font-outfit text-xs font-semibold text-forest">
                {props.trade.avg_exit_price
                  ? `Rp${Math.round(props.trade.avg_exit_price)}`
                  : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                Stop Loss
              </span>
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
              <span class="font-bold text-rose-500">
                Rp{Math.round(props.trade.total_fee || 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div class="flex justify-between col-span-2">
              <span class="text-earth/70 font-medium">Risk Amount:</span>
              <span class="font-bold text-earth">
                Rp{Math.round(props.trade.risk_amount || 0).toLocaleString("id-ID")}
              </span>
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
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">
                Entry Legs ({props.trade.entry_details?.length})
              </span>
              <div class="bg-white border border-forest/5 rounded-xl p-2.5 space-y-1.5 text-xs">
                <For each={props.trade.entry_details}>
                  {(leg) => (
                    <div class="flex justify-between text-earth">
                      <span class="font-semibold">
                        {leg.lot} lot @ Rp{leg.price}
                      </span>
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
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">
                Exit Legs ({props.trade.exit_details?.length})
              </span>
              <div class="bg-white border border-forest/5 rounded-xl p-2.5 space-y-1.5 text-xs">
                <For each={props.trade.exit_details}>
                  {(leg) => (
                    <div class="flex justify-between text-earth">
                      <span class="font-semibold">
                        {leg.lot} lot @ Rp{leg.price}
                      </span>
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
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">
                Mindset Psychology
              </span>
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
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">
                Notes
              </span>
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
