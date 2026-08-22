import { createSignal, createEffect, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { formatNumericInput, formatRupiah } from "../../../utils/format";

interface EditDailyBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  onSave: (newBudget: number) => void;
  title?: string;
  subtitle?: string;
}

const BUDGET_PRESETS = [
  { label: "150k", value: 150000 },
  { label: "250k", value: 250000 },
  { label: "300k", value: 300000 },
  { label: "500k", value: 500000 },
  { label: "750k", value: 750000 },
  { label: "1M", value: 1000000 },
];

export const EditDailyBudgetModal = (props: EditDailyBudgetModalProps) => {
  const [budgetInput, setBudgetInput] = createSignal("");

  createEffect(() => {
    if (props.isOpen) {
      setBudgetInput(props.currentBudget.toString());
    }
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const val = parseInt(budgetInput().replace(/\D/g, ""), 10);
    if (!isNaN(val) && val >= 0) {
      props.onSave(val);
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-xs transition-opacity duration-300 p-4 sm:p-6 animate-fade-in"
          onClick={props.onClose}
        >
          <div
            class="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden border border-forest/10 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Top Decorative Line */}
          <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-forest to-spring"></div>

          <div class="flex items-center gap-3 mb-2">
            <div class="w-9 h-9 rounded-xl bg-sage/30 flex items-center justify-center text-forest">
              <span class="material-icons text-lg">account_balance_wallet</span>
            </div>
            <div>
              <h3 class="text-xl sm:text-2xl font-cormorant text-forest font-bold">
                {props.title || "Edit Daily Budget"}
              </h3>
            </div>
          </div>

          <p class="text-earth text-xs sm:text-sm mb-6 leading-relaxed">
            {props.subtitle || "Set your target daily spending allowance to calibrate pacing and velocity indicators."}
          </p>

          <form onSubmit={handleSubmit} class="space-y-6">
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Daily Budget (IDR)
              </label>
              <div class="relative">
                <span class="absolute left-[1px] top-[1px] bottom-[1px] min-w-[44px] rounded-l-xl bg-spring/5 border-r border-forest/10 flex items-center justify-center text-sm font-outfit font-bold text-forest/50">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumericInput(budgetInput())}
                  onInput={(e) => {
                    const raw = e.currentTarget.value.replace(/\D/g, "");
                    setBudgetInput(raw);
                  }}
                  placeholder="0"
                  class="w-full pl-14 pr-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-2 focus:ring-forest/10 outline-none font-outfit font-bold text-forest text-base sm:text-lg"
                  required
                />
              </div>

              {/* Preset Quick Choosing Pills */}
              <div class="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
                <For each={BUDGET_PRESETS}>
                  {(preset) => (
                    <button
                      type="button"
                      onClick={() => setBudgetInput(preset.value.toString())}
                      class={`px-3 py-1 rounded-full text-xs font-outfit font-bold transition-all cursor-pointer border ${
                        budgetInput() === preset.value.toString()
                          ? "bg-forest text-white border-forest shadow-xs"
                          : "bg-sage/15 border-forest/5 text-forest/70 hover:bg-forest/10 hover:text-forest"
                      }`}
                    >
                      {preset.label}
                    </button>
                  )}
                </For>
              </div>

              {/* Quick Summary / Calculation */}
              <div class="mt-3 p-3 rounded-xl bg-sage/10 border border-forest/5 flex items-center justify-between text-xs font-outfit text-earth">
                <span>Estimated Monthly Target (30 days):</span>
                <span class="font-bold text-forest">
                  {formatRupiah((parseInt(budgetInput().replace(/\D/g, ""), 10) || 0) * 30)}
                </span>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                onClick={props.onClose}
                class="flex-1 px-4 py-2.5 rounded-xl font-outfit font-bold text-xs sm:text-sm text-earth hover:bg-sage/20 transition-all cursor-pointer border border-forest/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 bg-forest text-white px-4 py-2.5 rounded-xl font-outfit font-bold text-xs sm:text-sm shadow-md hover:bg-forest/90 transition-all cursor-pointer"
              >
                Save Budget
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  </Show>
  );
};
