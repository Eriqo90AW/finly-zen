import { createSignal, Show } from "solid-js";
import type { PendingTransferAction } from "../../../types/intelligence";

interface Props {
  action: PendingTransferAction;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
}


const PendingActionCard = (props: Props) => {
  const [isConfirming, setIsConfirming] = createSignal(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await props.onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div class="mx-3 mb-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 shadow-premium">
      <div>
        <p class="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
          Confirm action
        </p>
        <h4 class="font-outfit font-semibold text-forest text-sm mt-1">
          {props.action.title}
        </h4>
        <p class="text-xs text-earth mt-1">{props.action.description}</p>
      </div>
      <div class="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={isConfirming()}
          class="flex-1 py-2 px-3 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest/90 disabled:opacity-50 cursor-pointer"
        >
          <Show when={isConfirming()} fallback="Confirm">
            Saving…
          </Show>
        </button>
        <button
          onClick={() => props.onCancel()}
          disabled={isConfirming()}
          class="flex-1 py-2 px-3 rounded-xl border border-forest/20 text-forest text-xs font-semibold hover:bg-white disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PendingActionCard;
