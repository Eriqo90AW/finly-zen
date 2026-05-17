import { createSignal, Show, For } from "solid-js";
import { createPortfolio } from "../../../store/portfolioStore";
import {
  formatNumericInput,
  formatRupiah,
  formatUSD,
  getUsdRate,
} from "../../../utils/format";

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePortfolioModal = (props: CreatePortfolioModalProps) => {
  const [pName, setPName] = createSignal("");
  const [pCash, setPCash] = createSignal("");
  const [currency, setCurrency] = createSignal<"IDR" | "USD">("IDR");

  const formatUSDInput = (val: string): string => {
    if (!val) return "";
    const parts = val.split(".");
    const integerPart = parseInt(parts[0].replace(/\D/g, ""));
    if (isNaN(integerPart) && parts.length === 1) return "";

    const formattedInteger = isNaN(integerPart)
      ? ""
      : new Intl.NumberFormat("en-US").format(integerPart);

    if (parts.length > 1) {
      return formattedInteger + "." + parts[1];
    }
    return formattedInteger;
  };

  const formatInput = (val: string) => {
    return currency() === "USD" ? formatUSDInput(val) : formatNumericInput(val);
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const enteredValue = parseFloat(pCash()) || 0;
    if (pName() && enteredValue >= 0) {
      const cashValue =
        currency() === "USD"
          ? Math.round(enteredValue * getUsdRate())
          : enteredValue;
      createPortfolio(pName(), cashValue);
      setPName("");
      setPCash("");
      props.onClose();
    }
  };

  const reverseConversion = () => {
    const rawVal = parseFloat(pCash()) || 0;
    if (rawVal === 0) return "";
    if (currency() === "IDR") {
      const usdValue = rawVal / getUsdRate();
      return `≈ ${formatUSD(usdValue, 2)}`;
    } else {
      const idrValue = rawVal * getUsdRate();
      return `≈ ${formatRupiah(idrValue)}`;
    }
  };

  const pills = () => {
    if (currency() === "IDR") {
      return [
        { label: "Rp5.000.000", value: "5000000" },
        { label: "Rp10.000.000", value: "10000000" },
        { label: "Rp50.000.000", value: "50000000" },
      ];
    } else {
      return [
        { label: "$500", value: "500" },
        { label: "$1,000", value: "1000" },
        { label: "$5,000", value: "5000" },
      ];
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
          {/* Colored Top Line Modal */}
          <div class="absolute top-0 left-0 w-full h-1 bg-forest"></div>
          <h3 class="text-2xl font-cormorant text-forest font-bold mb-6">
            Create a New Portfolio
          </h3>
          <form onSubmit={handleSubmit} class="space-y-6">
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Portfolio Name
              </label>
              <input
                type="text"
                value={pName()}
                onInput={(e) => setPName(e.currentTarget.value)}
                placeholder="e.g., Retirement Fund"
                class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                required
              />
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Initial Cash
              </label>
              <div class="flex gap-3">
                <div class="relative flex-1">
                  <span class="absolute left-[1px] top-[1px] bottom-[1px] min-w-[44px] rounded-l-xl bg-spring/5 border-r border-forest/10 flex items-center justify-center text-sm font-outfit font-bold text-forest/40">
                    {currency() === "IDR" ? "Rp" : "$"}
                  </span>
                  <input
                    type="text"
                    inputmode="decimal"
                    value={formatInput(pCash())}
                    onInput={(e) => {
                      let val = e.currentTarget.value;
                      if (currency() === "USD") {
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
                        setPCash(val);
                      } else {
                        const rawValue = val.replace(/\D/g, "");
                        setPCash(rawValue);
                      }
                    }}
                    placeholder="0"
                    class="w-full pl-14 pr-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                    required
                  />
                </div>
                <div class="flex p-1 rounded-xl border border-forest/10 bg-spring/5 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (currency() === "IDR") return;
                      setCurrency("IDR");
                      const currentVal = parseFloat(pCash()) || 0;
                      if (currentVal > 0) {
                        const idrValue = currentVal * getUsdRate();
                        setPCash(Math.round(idrValue).toString());
                      }
                    }}
                    class={`px-3 py-2 rounded-lg text-xs font-outfit font-bold transition-all cursor-pointer ${
                      currency() === "IDR"
                        ? "bg-white text-forest shadow-sm"
                        : "text-forest/40 hover:text-forest"
                    }`}
                  >
                    IDR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currency() === "USD") return;
                      setCurrency("USD");
                      const currentVal = parseFloat(pCash()) || 0;
                      if (currentVal > 0) {
                        const usdValue = currentVal / getUsdRate();
                        setPCash(Number(usdValue.toFixed(2)).toString());
                      }
                    }}
                    class={`px-3 py-2 rounded-lg text-xs font-outfit font-bold transition-all cursor-pointer ${
                      currency() === "USD"
                        ? "bg-white text-forest shadow-sm"
                        : "text-forest/40 hover:text-forest"
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>

              {/* Quick choosing pills */}
              <div class="flex flex-wrap gap-2 mt-3">
                <For each={pills()}>
                  {(pill) => (
                    <button
                      type="button"
                      onClick={() => setPCash(pill.value)}
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
                class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-spring/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 bg-forest text-white px-6 py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-all cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
