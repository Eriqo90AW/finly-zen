import { For, Show, createSignal } from "solid-js";
import type { Trade } from "../../../data/TradingJournal/data/types";

interface SetupAccordionItemProps {
  trade: Trade;
  index: number;
}

export default function SetupAccordionItem(props: SetupAccordionItemProps) {
  const [isExpanded, setIsExpanded] = createSignal(false);

  return (
    <div class="premium-card bg-white overflow-hidden border border-blue-100 hover:border-blue-200 hover:shadow-md transition-all">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded())}
        class="w-full p-4 flex justify-between items-center text-left hover:bg-blue-50/10 transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-3">
          <span class="px-2 py-1 rounded bg-blue-50 text-[10px] font-black text-blue-600 border border-blue-100">
            {props.trade.setup_quality || "A"}
          </span>
          <div>
            <div class="font-outfit font-bold text-forest text-sm leading-tight">
              {props.trade.ticker}
            </div>
            <div class="text-[10px] font-bold text-earth uppercase tracking-wider mt-0.5">
              {props.trade.setup_type || "Setup Plan"}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md">
            {props.trade.setup_status}
          </span>
          <span
            class="material-icons text-earth transition-transform duration-300 text-lg"
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
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                Ideal Entry
              </span>
              <span class="font-outfit text-xs font-semibold text-forest">
                {props.trade.entry_zone_ideal ? `Rp${props.trade.entry_zone_ideal}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                Max Entry
              </span>
              <span class="font-outfit text-xs font-semibold text-earth">
                {props.trade.entry_zone_max ? `Rp${props.trade.entry_zone_max}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                Planned RR
              </span>
              <span class="font-outfit text-xs font-semibold text-blue-600">
                {props.trade.planned_rr ? `${props.trade.planned_rr}R` : "-"}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                Stop Loss
              </span>
              <span class="font-outfit text-xs font-semibold text-rose-500">
                {props.trade.stop_loss ? `Rp${props.trade.stop_loss}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                TP 1
              </span>
              <span class="font-outfit text-xs font-semibold text-emerald-600">
                {props.trade.tp1_price ? `Rp${props.trade.tp1_price}` : "-"}
              </span>
            </div>
            <div class="bg-white p-2 rounded-xl border border-forest/5 text-center">
              <span class="text-[9px] font-bold uppercase tracking-widest block text-earth/60 mb-0.5">
                TP 2
              </span>
              <span class="font-outfit text-xs font-semibold text-emerald-600">
                {props.trade.tp2_price ? `Rp${props.trade.tp2_price}` : "-"}
              </span>
            </div>
          </div>

          {/* Raw Analysis */}
          <Show when={props.trade.analysis_raw}>
            <div class="space-y-1">
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">
                Analysis RAW
              </span>
              <div class="bg-white border border-forest/5 rounded-xl p-2.5 text-xs text-earth leading-relaxed font-outfit whitespace-pre-line">
                {props.trade.analysis_raw}
              </div>
            </div>
          </Show>

          {/* Checklist */}
          <Show when={props.trade.checklist && props.trade.checklist.length > 0}>
            <div class="space-y-1.5">
              <span class="text-[9px] font-bold text-earth uppercase tracking-widest block">
                Confluences
              </span>
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
