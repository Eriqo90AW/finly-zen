import { Show } from "solid-js";
import { Portal } from "solid-js/web";

interface EditCategoryTargetModalProps {
  category: string | null;
  inputValue: string;
  onInputChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e?: Event) => void;
}

export const EditCategoryTargetModal = (props: EditCategoryTargetModalProps) => {
  return (
    <Show when={props.category}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-xs p-4 sm:p-6 animate-fade-in"
          onClick={props.onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="period-target-title"
            class="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden border border-forest/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-forest to-spring" />
            <h5
              id="period-target-title"
              class="text-sm font-bold text-forest font-outfit mb-1"
            >
              Set Period Target: {props.category}
            </h5>
            <p class="text-[11px] text-earth/70 mb-3">
              Enter the target spending limit for this category.
            </p>

            <form onSubmit={props.onSubmit} class="space-y-3">
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-earth/60">
                  Rp
                </span>
                <input
                  type="text"
                  value={props.inputValue}
                  onInput={(e) => props.onInputChange(e.currentTarget.value)}
                  placeholder="e.g. 2500000"
                  autofocus
                  class="w-full pl-9 pr-3 py-1.5 text-sm font-outfit font-bold border border-forest/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 bg-white text-forest"
                />
              </div>

              <div class="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={props.onClose}
                  class="px-3 py-1 text-xs font-semibold text-earth hover:text-forest bg-forest/5 hover:bg-forest/10 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-3 py-1 text-xs font-semibold text-white bg-forest hover:bg-forest/90 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
    </Show>
  );
};
