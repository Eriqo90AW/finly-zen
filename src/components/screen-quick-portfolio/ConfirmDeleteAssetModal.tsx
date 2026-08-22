import { Show } from "solid-js";
import { Portal } from "solid-js/web";

interface ConfirmDeleteAssetModalProps {
  isOpen: boolean;
  assetName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteAssetModal = (props: ConfirmDeleteAssetModalProps) => {
  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-xs p-4 sm:p-6 animate-fade-in"
          onClick={props.onClose}
        >
          <div
            class="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex flex-col items-center text-center">
              {/* Warning Icon Container */}
              <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
                <span class="material-icons text-3xl">delete_forever</span>
              </div>

              <h3 class="text-2xl font-cormorant text-forest font-bold mb-2">
                Remove Asset
              </h3>
              
              <p class="text-earth font-outfit text-sm mb-6 leading-relaxed">
                Are you sure you want to remove <span class="font-bold text-forest">"{props.assetName}"</span> from your portfolio? This action cannot be undone.
              </p>

              <div class="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={props.onClose}
                  class="flex-1 px-5 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-slate-50 transition-all cursor-pointer text-xs uppercase tracking-wider border-0 bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    props.onConfirm();
                    props.onClose();
                  }}
                  class="flex-1 bg-rose-500 text-white px-5 py-3 rounded-xl font-outfit font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 hover:shadow-rose-600/30 transition-all cursor-pointer text-xs uppercase tracking-wider border-0"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};
