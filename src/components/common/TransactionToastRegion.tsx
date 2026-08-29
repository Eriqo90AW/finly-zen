import { For, Show } from "solid-js";
import { mutationToasts, removeToast } from "../../store/transactionStore";
import RefreshIcon from "@suid/icons-material/Refresh";
import CloseIcon from "@suid/icons-material/Close";
import WarningAmberIcon from "@suid/icons-material/WarningAmber";

export const TransactionToastRegion = () => {
  const toasts = mutationToasts;

  return (
    <Show when={toasts().length > 0}>
      <div
        role="region"
        aria-label="Transaction notifications"
        aria-live="polite"
        class="fixed bottom-6 left-4 sm:left-6 z-50 flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-md pointer-events-none"
      >
        <For each={toasts()}>
          {(toast) => (
            <div
              role="alert"
              class="pointer-events-auto p-4 rounded-2xl bg-white border border-rose-200 shadow-2xl shadow-rose-900/10 flex items-start gap-3 animate-fade-in-up transition-all"
            >
              <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <WarningAmberIcon sx={{ fontSize: 18 }} />
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-outfit text-xs font-semibold text-forest leading-snug break-words">
                  {toast.message}
                </p>
                <div class="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => toast.retry()}
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-outfit text-xs font-bold shadow-sm transition-colors cursor-pointer min-h-[32px]"
                  >
                    <RefreshIcon sx={{ fontSize: 14 }} />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.dismiss()}
                    class="px-2.5 py-1.5 rounded-lg text-earth hover:text-forest hover:bg-sage/20 font-outfit text-xs font-medium transition-colors cursor-pointer min-h-[32px]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toast.dismiss()}
                aria-label="Dismiss notification"
                class="w-6 h-6 rounded-lg text-earth/50 hover:text-forest flex items-center justify-center shrink-0 cursor-pointer"
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};

export default TransactionToastRegion;
