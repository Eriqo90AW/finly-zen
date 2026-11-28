import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { Transaction } from "../../../types";
import { formatDateDetail, formatRupiah } from "../../../utils/format";

interface DeleteTransactionModalProps {
  transaction: Transaction | null;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteTransactionModal = (props: DeleteTransactionModalProps) => {
  return (
    <Show when={props.transaction}>
      {(t) => (
        <Portal>
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-xs transition-opacity duration-300 p-4 sm:p-6 animate-fade-in"
            onClick={() => !props.isDeleting && props.onCancel()}
          >
            <div
              class="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="flex flex-col items-center text-center">
                <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-5">
                  <span class="material-icons text-3xl">delete_outline</span>
                </div>

                <h3 class="text-2xl font-cormorant text-forest font-bold mb-2">
                  Delete Transaction
                </h3>

                <div class="w-full p-3.5 bg-page-bg/80 border border-forest/5 rounded-2xl mb-4 text-left space-y-1">
                  <div class="flex items-center justify-between">
                    <p class="font-semibold text-xs text-forest truncate max-w-[180px]">
                      {t().name}
                    </p>
                    <span
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        "background-color": t().categoryColor
                          ? `${t().categoryColor}20`
                          : "rgba(26, 77, 46, 0.1)",
                        color: t().categoryColor || "var(--color-forest)",
                      }}
                    >
                      {t().category}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-earth/60 text-[10px]">
                      {formatDateDetail(t().date)}
                    </span>
                    <span
                      class={`font-bold font-outfit ${t().type === "income" ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {t().type === "income" ? "+" : "-"}
                      {formatRupiah(t().amount)}
                    </span>
                  </div>
                </div>

                <Show when={props.error}>
                  <p class="text-xs text-rose-600 font-medium mb-3">
                    {props.error}
                  </p>
                </Show>

                <p class="text-xs text-earth/80 mb-6 leading-relaxed">
                  Are you sure you want to permanently delete this transaction?
                  This action cannot be undone.
                </p>

                <div class="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    disabled={props.isDeleting}
                    onClick={props.onCancel}
                    class="flex-1 py-3 px-4 rounded-xl border border-forest/10 text-xs font-bold font-outfit text-earth hover:bg-forest/5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={props.isDeleting}
                    onClick={props.onConfirm}
                    class="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-outfit shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Show when={props.isDeleting} fallback="Delete">
                      <span class="material-icons text-sm animate-spin">
                        refresh
                      </span>
                      <span>Deleting...</span>
                    </Show>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
};
