import { createSignal, Show, createEffect } from "solid-js";
import {
  addTransactionToPortfolio,
} from "../../../store/portfolioStore";
import { getUsdRate } from "../../../utils/format";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
}

export const AddAssetModal = (props: AddAssetModalProps) => {
  const [ticker, setTicker] = createSignal("");
  const [shares, setShares] = createSignal<number | null>(null);
  const [price, setPrice] = createSignal<number | null>(null);
  const [currency, setCurrency] = createSignal<string>("USD");
  const [priceCurrency, setPriceCurrency] = createSignal<number>(getUsdRate());
  const [transactionDate, setTransactionDate] = createSignal(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = createSignal("");
  const [type, setType] = createSignal<"BUY" | "SELL">("BUY");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Initialize or update the exchange rate when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setPriceCurrency(getUsdRate());
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const t = ticker().trim().toUpperCase();
    const qty = Number(shares());
    const p = Number(price());
    const rate = Number(priceCurrency());

    if (t && qty > 0 && p > 0 && rate > 0) {
      setIsSubmitting(true);
      try {
        await addTransactionToPortfolio(props.portfolioId, {
          ticker: t,
          qty,
          pricePerUnit: p,
          priceCurrency: rate,
          currency: currency(),
          type: type(),
          notes: notes(),
          transactionDate: new Date(transactionDate()).toISOString(),
        });

        // Reset form
        setTicker("");
        setShares(null);
        setPrice(null);
        setNotes("");
        props.onClose();
      } catch (error) {
        console.error("Failed to add transaction:", error);
        alert("Failed to save transaction. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
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
            Add Transaction
          </h3>
          <form onSubmit={handleSubmit} class="space-y-4">
            {/* BUY/SELL Toggle */}
            <div class="flex bg-forest/5 p-1 rounded-xl mb-4">
              <button
                type="button"
                class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${type() === "BUY" ? "bg-white text-forest shadow-sm" : "text-earth hover:text-forest"}`}
                onClick={() => setType("BUY")}
              >
                BUY
              </button>
              <button
                type="button"
                class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${type() === "SELL" ? "bg-white text-red-600 shadow-sm" : "text-earth hover:text-red-500"}`}
                onClick={() => setType("SELL")}
              >
                SELL
              </button>
            </div>

            {/* Ticker Input */}
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Ticker Symbol
              </label>
              <input
                type="text"
                value={ticker()}
                onInput={(e) => setTicker(e.currentTarget.value.toUpperCase())}
                placeholder="e.g., NVDA, BTC-USD"
                class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                required
              />
            </div>

            {/* Qty and Price Row */}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={shares() ?? ""}
                  onInput={(e) =>
                    setShares(
                      e.currentTarget.value
                        ? Number(e.currentTarget.value)
                        : null,
                    )
                  }
                  placeholder="0.00"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Price per Unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price() ?? ""}
                  onInput={(e) =>
                    setPrice(
                      e.currentTarget.value
                        ? Number(e.currentTarget.value)
                        : null,
                    )
                  }
                  placeholder="0.00"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
            </div>

            {/* Currency and Exchange Rate Row */}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Currency
                </label>
                <select
                  value={currency()}
                  onChange={(e) => setCurrency(e.currentTarget.value)}
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 bg-transparent focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest cursor-pointer"
                >
                  <option value="USD">USD</option>
                  <option value="IDR">IDR</option>
                  <option value="SGD">SGD</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Exchange Rate (to IDR)
                </label>
                <input
                  type="number"
                  value={priceCurrency()}
                  onInput={(e) =>
                    setPriceCurrency(Number(e.currentTarget.value))
                  }
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Transaction Date
              </label>
              <input
                type="date"
                value={transactionDate()}
                onInput={(e) => setTransactionDate(e.currentTarget.value)}
                class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest cursor-pointer"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Notes
              </label>
              <textarea
                value={notes()}
                onInput={(e) => setNotes(e.currentTarget.value)}
                placeholder="Optional notes..."
                class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest resize-none h-20"
              />
            </div>

            {/* Buttons */}
            <div class="flex gap-4 pt-4">
              <button
                type="button"
                onClick={props.onClose}
                disabled={isSubmitting()}
                class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-spring/5 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting()}
                class="flex-1 bg-forest text-white px-6 py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-80"
              >
                <Show when={isSubmitting()} fallback="Submit">
                  <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </Show>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
