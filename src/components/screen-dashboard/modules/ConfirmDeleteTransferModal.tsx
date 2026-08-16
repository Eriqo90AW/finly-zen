import { Show } from "solid-js";
import type { TransferRecord } from "../../../types";
import { formatRupiah } from "../../../utils/format";
import ArrowForwardIcon from "@suid/icons-material/ArrowForwardOutlined";

interface ConfirmDeleteTransferModalProps {
  isOpen: boolean;
  transfer: TransferRecord | null;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteTransferModal = (
  props: ConfirmDeleteTransferModalProps,
) => {
  return (
    <Show when={props.isOpen && props.transfer}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-xs transition-opacity duration-300 p-6"
        onClick={props.onClose}
      >
        <div
          class="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex flex-col items-center text-center">
            {/* Warning Icon */}
            <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-5">
              <span class="material-icons text-3xl">delete_outline</span>
            </div>

            <h3 class="text-2xl font-cormorant text-forest font-bold mb-2">
              Delete Transfer
            </h3>

            {/* Transfer Preview Card */}
            <div class="w-full p-3 bg-page-bg/80 border border-forest/5 rounded-2xl mb-4 text-left">
              <div class="flex items-center gap-1.5 font-semibold text-xs text-forest truncate mb-1">
                <span
                  class="truncate max-w-[90px]"
                  style={{ color: props.transfer!.fromAccountColor || "#1A4D2E" }}
                >
                  {props.transfer!.fromAccountName}
                </span>
                <ArrowForwardIcon sx={{ fontSize: 13 }} class="text-earth/40 shrink-0" />
                <span
                  class="truncate max-w-[90px]"
                  style={{ color: props.transfer!.toAccountColor || "#1A4D2E" }}
                >
                  {props.transfer!.toAccountName}
                </span>
              </div>
              <p class="text-base font-bold font-outfit text-forest">
                {formatRupiah(props.transfer!.amount)}
              </p>
            </div>

            <p class="text-earth font-outfit text-xs mb-6 leading-relaxed">
              This action will delete both paired transfer records and revert the balances on both accounts.
            </p>

            <div class="flex gap-3 w-full">
              <button
                type="button"
                disabled={props.isDeleting}
                onClick={props.onClose}
                class="flex-1 px-4 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-slate-50 transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={props.isDeleting}
                onClick={props.onConfirm}
                class="flex-1 bg-rose-500 text-white px-4 py-3 rounded-xl font-outfit font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Show
                  when={props.isDeleting}
                  fallback="Delete"
                >
                  <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </Show>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
