import { For, Show } from "solid-js";
import type {
  EntryLeg,
  ExitLeg,
  PosStatusType,
} from "../../../data/TradingJournal/data/database.types";

interface TradeLegsSectionProps {
  posStatus: PosStatusType;
  entryLegs: EntryLeg[];
  exitLegs: ExitLeg[];
  onAddEntryLeg: () => void;
  onRemoveEntryLeg: (index: number) => void;
  onUpdateEntryLeg: <K extends keyof EntryLeg>(
    index: number,
    field: K,
    value: EntryLeg[K],
  ) => void;
  onAddExitLeg: () => void;
  onRemoveExitLeg: (index: number) => void;
  onUpdateExitLeg: <K extends keyof ExitLeg>(
    index: number,
    field: K,
    value: ExitLeg[K],
  ) => void;
}

export default function TradeLegsSection(props: TradeLegsSectionProps) {
  return (
    <>
      {/* Entry Legs Section */}
      <div class="space-y-2 border border-dashed border-forest/10 p-3 rounded-xl bg-sage/5">
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-bold text-forest uppercase tracking-wider">Entry Legs</span>
          <button
            type="button"
            onClick={() => props.onAddEntryLeg()}
            class="px-2 py-0.5 text-[8px] bg-forest text-white rounded font-bold hover:bg-mid-green transition-all cursor-pointer"
          >
            + Add Entry Leg
          </button>
        </div>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          <For each={props.entryLegs}>
            {(leg, index) => (
              <div class="grid grid-cols-3 gap-1.5 items-end">
                <div class="space-y-0.5">
                  <label class="text-[7.5px] font-bold text-earth block">Lot</label>
                  <input
                    type="number"
                    placeholder="Lots"
                    value={leg.lot || ""}
                    onInput={(e) =>
                      props.onUpdateEntryLeg(
                        index(),
                        "lot",
                        Number.parseInt(e.currentTarget.value, 10) || 0,
                      )
                    }
                    class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-xs text-center"
                    required
                  />
                </div>
                <div class="space-y-0.5">
                  <label class="text-[7.5px] font-bold text-earth block">Price</label>
                  <input
                    type="number"
                    placeholder="Price"
                    value={leg.price || ""}
                    onInput={(e) =>
                      props.onUpdateEntryLeg(
                        index(),
                        "price",
                        Number.parseFloat(e.currentTarget.value) || 0,
                      )
                    }
                    class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-xs text-center"
                    required
                  />
                </div>
                <div class="flex gap-1 items-center">
                  <input
                    type="text"
                    placeholder="Reason (e.g. E1)"
                    value={leg.reason || ""}
                    onInput={(e) =>
                      props.onUpdateEntryLeg(index(), "reason", e.currentTarget.value)
                    }
                    class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-[9px]"
                  />
                  <button
                    type="button"
                    onClick={() => props.onRemoveEntryLeg(index())}
                    class="text-rose-500 hover:text-rose-700 text-xs font-bold px-1"
                    disabled={props.entryLegs.length <= 1}
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Exit Legs Section (Only relevant if CLOSED or PARTIAL) */}
      <Show when={props.posStatus !== "OPEN"}>
        <div class="space-y-2 border border-dashed border-forest/10 p-3 rounded-xl bg-sage/5 animate-fade-in-up">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-bold text-forest uppercase tracking-wider">
              Exit Legs
            </span>
            <button
              type="button"
              onClick={() => props.onAddExitLeg()}
              class="px-2 py-0.5 text-[8px] bg-forest text-white rounded font-bold hover:bg-mid-green transition-all cursor-pointer"
            >
              + Add Exit Leg
            </button>
          </div>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <For each={props.exitLegs}>
              {(leg, index) => (
                <div class="grid grid-cols-3 gap-1.5 items-end">
                  <div class="space-y-0.5">
                    <label class="text-[7.5px] font-bold text-earth block">Lot</label>
                    <input
                      type="number"
                      placeholder="Lots"
                      value={leg.lot || ""}
                      onInput={(e) =>
                        props.onUpdateExitLeg(
                          index(),
                          "lot",
                          Number.parseInt(e.currentTarget.value, 10) || 0,
                        )
                      }
                      class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-xs text-center"
                      required
                    />
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[7.5px] font-bold text-earth block">Price</label>
                    <input
                      type="number"
                      placeholder="Price"
                      value={leg.price || ""}
                      onInput={(e) =>
                        props.onUpdateExitLeg(
                          index(),
                          "price",
                          Number.parseFloat(e.currentTarget.value) || 0,
                        )
                      }
                      class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-xs text-center"
                      required
                    />
                  </div>
                  <div class="flex gap-1 items-center">
                    <select
                      value={leg.type}
                      onInput={(e) =>
                        props.onUpdateExitLeg(index(), "type", e.currentTarget.value)
                      }
                      class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-[9px] cursor-pointer"
                    >
                      <option value="TP1">TP1</option>
                      <option value="TP2">TP2</option>
                      <option value="TP full">TP full</option>
                      <option value="SL">SL</option>
                      <option value="Trailing SL">Trail SL</option>
                      <option value="Breakeven">Breakeven</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => props.onRemoveExitLeg(index())}
                      class="text-rose-500 hover:text-rose-700 text-xs font-bold px-1"
                      disabled={props.exitLegs.length <= 1}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </>
  );
}
