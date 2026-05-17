import { createSignal, Show } from "solid-js";
import { addCapitalToPortfolio } from "../../../store/portfolioStore";

interface ManageCapitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
}

export const ManageCapitalModal = (props: ManageCapitalModalProps) => {
  const [capitalAmount, setCapitalAmount] = createSignal(0);
  const [isAdjustment, setIsAdjustment] = createSignal(false);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (capitalAmount() >= 0) {
      addCapitalToPortfolio(props.portfolioId, capitalAmount(), isAdjustment());
      setCapitalAmount(0);
      setIsAdjustment(false);
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
          <h3 class="text-2xl font-cormorant text-forest font-bold mb-6">
            Manage Capital
          </h3>
          <p class="text-earth text-sm mb-6">
            {isAdjustment()
              ? "Set the total initial capital for this portfolio. This will not change your cash balance but will update your gain percentage."
              : "Add new funds to this portfolio. This increases both your cash balance and your capital basis."}
          </p>
          <form onSubmit={handleSubmit} class="space-y-6">
            <div class="flex bg-forest/5 p-1 rounded-xl mb-4">
              <button
                type="button"
                class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${!isAdjustment() ? "bg-white text-forest shadow-sm" : "text-earth hover:text-forest"}`}
                onClick={() => setIsAdjustment(false)}
              >
                ADD FUNDS
              </button>
              <button
                type="button"
                class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${isAdjustment() ? "bg-white text-forest shadow-sm" : "text-earth hover:text-forest"}`}
                onClick={() => setIsAdjustment(true)}
              >
                ADJUST BASIS
              </button>
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                {isAdjustment()
                  ? "Initial Capital Basis (IDR)"
                  : "Amount to Add (IDR)"}
              </label>
              <input
                type="number"
                value={capitalAmount()}
                onInput={(e) => setCapitalAmount(Number(e.currentTarget.value))}
                placeholder="0"
                class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                required
              />
            </div>
            <div class="flex gap-4 pt-4">
              <button
                type="button"
                onClick={props.onClose}
                class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-forest/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 bg-forest text-white px-6 py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-all cursor-pointer"
              >
                Add Funds
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
