import { For, Show, createSignal } from "solid-js";
import type { Account } from "../../../types";
import type { PendingBatchTransactionAction } from "../../../types/intelligence";
import {
  applyAccountToSelectedDrafts,
  applyDateToSelectedDrafts,
  selectAllValidDrafts,
} from "../../../store/intelligenceStore";

interface BatchSummaryHeaderProps {
  action: PendingBatchTransactionAction;
  totalCount: number;
  savedCount: number;
  accounts: Account[];
}

export default function BatchSummaryHeader(props: BatchSummaryHeaderProps) {
  const [bulkAccountOpen, setBulkAccountOpen] = createSignal(false);
  const [bulkDateOpen, setBulkDateOpen] = createSignal(false);
  const [bulkDateValue, setBulkDateValue] = createSignal(new Date().toISOString().split("T")[0]);

  return (
    <div class="p-3.5 bg-white border-b border-forest/10 shrink-0 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span
            class={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              props.action.source === "ocr"
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-forest/10 text-forest border border-forest/20"
            }`}
          >
            {props.action.source === "ocr" ? "Receipt OCR" : "AI Batch"}
          </span>

          <Show
            when={
              props.action.ocrConfidence !== undefined && props.action.ocrConfidence !== null
            }
          >
            <span class="text-[10px] text-earth/60 font-semibold">
              {Math.round(props.action.ocrConfidence!)}% confidence
            </span>
          </Show>
        </div>

        <span class="text-xs font-bold text-forest font-outfit">
          {props.totalCount} {props.totalCount === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div class="flex items-center justify-between text-xs">
        <div class="min-w-0">
          <h4 class="font-outfit font-bold text-forest truncate text-sm">
            {props.action.merchant || "Batch Transaction Review"}
          </h4>
          <Show when={props.savedCount > 0}>
            <p class="text-[11px] text-emerald-700 font-medium">
              {props.savedCount} of {props.totalCount} entries saved
            </p>
          </Show>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => selectAllValidDrafts(true)}
            class="px-2 py-1 rounded-lg text-[10px] font-bold text-forest bg-forest/5 hover:bg-forest/10 transition-colors cursor-pointer"
          >
            Select Valid
          </button>
          <button
            type="button"
            onClick={() => selectAllValidDrafts(false)}
            class="px-2 py-1 rounded-lg text-[10px] font-bold text-earth/60 hover:text-earth bg-forest/5 hover:bg-forest/10 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Bulk Action Controls */}
      <div class="flex items-center gap-2 pt-1 border-t border-forest/5 text-xs">
        <div class="relative flex-1">
          <button
            type="button"
            onClick={() => {
              setBulkAccountOpen((v) => !v);
              setBulkDateOpen(false);
            }}
            class="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-forest/15 bg-white text-forest hover:border-forest/40 transition-colors cursor-pointer"
          >
            <span class="truncate">Apply Account</span>
            <span class="material-icons text-[14px]">expand_more</span>
          </button>

          <Show when={bulkAccountOpen()}>
            <div class="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-forest/10 p-1 z-30 flex flex-col gap-0.5 animate-slide-down">
              <For each={props.accounts}>
                {(acc) => (
                  <button
                    type="button"
                    onClick={() => {
                      applyAccountToSelectedDrafts(acc.id, acc.name);
                      setBulkAccountOpen(false);
                    }}
                    class="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-left rounded-lg text-forest hover:bg-forest/5 transition-colors cursor-pointer"
                  >
                    <span
                      class="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ "background-color": acc.color || "var(--color-mid-green)" }}
                    />
                    <span class="truncate">{acc.name}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        <div class="relative flex-1">
          <button
            type="button"
            onClick={() => {
              setBulkDateOpen((v) => !v);
              setBulkAccountOpen(false);
            }}
            class="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-forest/15 bg-white text-forest hover:border-forest/40 transition-colors cursor-pointer"
          >
            <span class="truncate">Apply Date</span>
            <span class="material-icons text-[14px]">calendar_today</span>
          </button>

          <Show when={bulkDateOpen()}>
            <div class="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-forest/10 p-2.5 z-30 flex flex-col gap-2 animate-slide-down">
              <p class="text-[10px] font-bold uppercase tracking-wider text-earth/70">
                Apply Date to Selected
              </p>
              <input
                type="date"
                value={bulkDateValue()}
                onInput={(e) => setBulkDateValue(e.currentTarget.value)}
                class="w-full px-2 py-1 text-xs border border-forest/20 rounded-lg text-forest bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  applyDateToSelectedDrafts(bulkDateValue());
                  setBulkDateOpen(false);
                }}
                class="w-full py-1 text-xs font-bold bg-forest text-white rounded-lg hover:bg-forest/90 transition-colors cursor-pointer"
              >
                Apply to Selected
              </button>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
