import { createSignal, Show, createEffect } from "solid-js";
import { setAssetTargetAllocation } from "../../../store/portfolioStore";

interface SetTargetAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  assetId: string;
  assetTicker: string;
  currentTargetAllocation: number;
}

export const SetTargetAllocationModal = (
  props: SetTargetAllocationModalProps,
) => {
  const [targetAllocation, setTargetAllocation] = createSignal(0);

  // Sync current value when modal opens or properties change
  createEffect(() => {
    if (props.isOpen) {
      setTargetAllocation(props.currentTargetAllocation);
    }
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (targetAllocation() >= 0 && targetAllocation() <= 100) {
      setAssetTargetAllocation(
        props.portfolioId,
        props.assetId,
        targetAllocation(),
      );
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
        onClick={props.onClose}
      >
        <div
          class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="absolute top-0 left-0 w-full h-1 bg-spring"></div>
          <h3 class="text-2xl font-cormorant text-forest font-bold mb-2">
            Set Target Allocation
          </h3>
          <p class="text-earth text-sm mb-6">
            Adjust the target percentage for{" "}
            <strong class="text-forest">{props.assetTicker}</strong>. This
            target will be used to help you rebalance your portfolio.
          </p>
          <form onSubmit={handleSubmit} class="space-y-6">
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Target Allocation (%)
              </label>
              <div class="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={targetAllocation()}
                  onInput={(e) =>
                    setTargetAllocation(Number(e.currentTarget.value))
                  }
                  placeholder="0"
                  class="w-full px-4 py-3 pr-10 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 font-outfit text-earth/60 font-bold">
                  %
                </span>
              </div>
            </div>
            <div class="flex gap-4 pt-4">
              <button
                type="button"
                onClick={props.onClose}
                class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-spring/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 bg-forest text-white px-6 py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-all cursor-pointer"
              >
                Save Target
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
