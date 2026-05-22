import { createSignal, Show, For } from "solid-js";
import { addCapitalToPortfolio, portfolioState } from "../../../store/portfolioStore";
import {
  formatNumericInput,
  formatRupiah,
  formatUSD,
  formatUSDInput,
  getCurrencyPills,
  getUsdRate,
} from "../../../utils/format";

interface ManageCapitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
}

export const ManageCapitalModal = (props: ManageCapitalModalProps) => {
  const [capitalAmount, setCapitalAmount] = createSignal("");
  const [isAdjustment, setIsAdjustment] = createSignal(false);

  const portfolio = () => portfolioState.portfolios.find((p) => p.id === props.portfolioId);
  const isUSDPortfolio = () => (portfolio()?.price_currency ?? 1) > 1;

  const formatInput = (val: string) => {
    return isUSDPortfolio() ? formatUSDInput(val) : formatNumericInput(val);
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const enteredValue = parseFloat(capitalAmount()) || 0;
    if (enteredValue >= 0) {
      addCapitalToPortfolio(props.portfolioId, enteredValue, isAdjustment());
      setCapitalAmount("");
      setIsAdjustment(false);
      props.onClose();
    }
  };

  const reverseConversion = () => {
    const rawVal = parseFloat(capitalAmount()) || 0;
    if (rawVal === 0) return "";
    if (!isUSDPortfolio()) {
      const usdValue = rawVal / getUsdRate();
      return `≈ ${formatUSD(usdValue, 2)}`;
    } else {
      const idrValue = rawVal * getUsdRate();
      return `≈ ${formatRupiah(idrValue)}`;
    }
  };

  const pills = () => getCurrencyPills(!isUSDPortfolio());

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 transition-opacity duration-300 p-6"
        onClick={props.onClose}
      >
        <div
          class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="absolute top-0 left-0 w-full h-1 bg-spring"></div>
          <h3 class="text-2xl font-cormorant text-forest font-bold mb-2">
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
                  ? `Initial Capital Basis (${isUSDPortfolio() ? "USD" : "IDR"})`
                  : `Amount to Add (${isUSDPortfolio() ? "USD" : "IDR"})`}
              </label>
              <div class="relative">
                <span class="absolute left-[1px] top-[1px] bottom-[1px] min-w-[44px] rounded-l-xl bg-spring/5 border-r border-forest/10 flex items-center justify-center text-sm font-outfit font-bold text-forest/40">
                  {isUSDPortfolio() ? "$" : "Rp"}
                </span>
                <input
                  type="text"
                  inputmode="decimal"
                  value={formatInput(capitalAmount())}
                  onInput={(e) => {
                    let val = e.currentTarget.value;
                    if (isUSDPortfolio()) {
                      val = val.replace(/,/g, ".");
                      const parts = val.split(".");
                      if (parts.length > 1) {
                        val =
                          parts[0].replace(/\D/g, "") +
                          "." +
                          parts[1].slice(0, 2).replace(/\D/g, "");
                      } else {
                        val = val.replace(/\D/g, "");
                      }
                      setCapitalAmount(val);
                    } else {
                      const rawValue = val.replace(/\D/g, "");
                      setCapitalAmount(rawValue);
                    }
                  }}
                  placeholder="0"
                  class="w-full pl-14 pr-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>

              {/* Quick choosing pills */}
              <div class="flex flex-wrap gap-2 mt-3">
                <For each={pills()}>
                  {(pill) => (
                    <button
                      type="button"
                      onClick={() => setCapitalAmount(pill.value)}
                      class="px-3 py-1.5 bg-spring/5 border border-forest/5 hover:border-forest/20 rounded-full text-xs font-outfit font-bold text-forest hover:bg-forest hover:text-white transition-all cursor-pointer"
                    >
                      {pill.label}
                    </button>
                  )}
                </For>
              </div>

              {/* Reverse conversion display */}
              <div class="mt-2 text-xs font-outfit text-earth pl-1 min-h-[16px]">
                {reverseConversion()}
              </div>
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
