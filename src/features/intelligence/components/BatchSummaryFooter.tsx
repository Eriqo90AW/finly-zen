import { Show } from "solid-js";
import { formatRupiah } from "../../../utils/format";
import type { BatchReconciliation } from "./batchReviewHelpers";

interface BatchSummaryFooterProps {
  reconciliation: BatchReconciliation | null;
  validSelectedCount: number;
  selectedNetTotal: number;
  savedCount: number;
  isSaving: boolean;
  onCancel: () => void;
  onFinish: () => void;
  onSave: () => void;
}

export default function BatchSummaryFooter(props: BatchSummaryFooterProps) {
  return (
    <div class="p-3.5 bg-white border-t border-forest/10 shrink-0 space-y-2.5 shadow-premium">
      {/* Reconciliation Warning or Info */}
      <Show when={props.reconciliation}>
        {(rec) => (
          <div
            class={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              rec().isReconciled
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="material-icons text-[16px] shrink-0">
                {rec().isReconciled ? "check_circle" : "warning_amber"}
              </span>
              <span class="truncate">
                {rec().isReconciled
                  ? `Reconciled: Receipt matches selected total (${formatRupiah(rec().actual)})`
                  : `Diff: ${formatRupiah(rec().diff)} (Receipt: ${formatRupiah(rec().expected)}, Selected: ${formatRupiah(rec().actual)})`}
              </span>
            </div>
          </div>
        )}
      </Show>

      <div class="flex items-center justify-between text-xs">
        <div class="flex flex-col">
          <span class="text-[10px] font-bold uppercase tracking-wider text-earth/60">
            Selected: {props.validSelectedCount} valid
          </span>
          <span class="text-sm font-extrabold font-outfit text-forest">
            {formatRupiah(props.selectedNetTotal)}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <Show
            when={props.savedCount > 0}
            fallback={
              <button
                type="button"
                onClick={() => props.onCancel()}
                disabled={props.isSaving}
                class="px-3 py-2 rounded-xl border border-forest/20 text-forest text-xs font-semibold hover:bg-forest/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            }
          >
            <button
              type="button"
              onClick={() => props.onFinish()}
              disabled={props.isSaving}
              class="px-3 py-2 rounded-xl border border-forest/20 text-forest text-xs font-bold hover:bg-forest/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              Finish ({props.savedCount} saved)
            </button>
          </Show>

          <button
            type="button"
            onClick={() => props.onSave()}
            disabled={props.isSaving || props.validSelectedCount === 0}
            class="px-4 py-2 rounded-xl bg-forest text-white text-xs font-bold hover:bg-forest/90 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Show when={props.isSaving} fallback={`Save ${props.validSelectedCount} valid`}>
              <span class="material-icons text-[14px] animate-spin">refresh</span>
              <span>Saving…</span>
            </Show>
          </button>
        </div>
      </div>
    </div>
  );
}
