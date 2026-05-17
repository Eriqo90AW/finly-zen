import { Show } from "solid-js";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  portfolioName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal = (props: ConfirmDeleteModalProps) => {
  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 transition-opacity duration-300 p-6"
        onClick={props.onClose}
      >
        <div
          class="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex flex-col items-center text-center">
            {/* Warning Icon Container */}
            <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
              <span class="material-icons text-3xl">delete_forever</span>
            </div>

            <h3 class="text-2xl font-cormorant text-forest font-bold mb-2">
              Delete Portfolio
            </h3>
            
            <p class="text-earth font-outfit text-sm mb-6 leading-relaxed">
              Are you sure you want to delete <span class="font-bold text-forest">"{props.portfolioName}"</span>? This action is permanent and cannot be undone.
            </p>

            <div class="flex gap-3 w-full">
              <button
                type="button"
                onClick={props.onClose}
                class="flex-1 px-5 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-slate-50 transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  props.onConfirm();
                  props.onClose();
                }}
                class="flex-1 bg-rose-500 text-white px-5 py-3 rounded-xl font-outfit font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 hover:shadow-rose-600/30 transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
