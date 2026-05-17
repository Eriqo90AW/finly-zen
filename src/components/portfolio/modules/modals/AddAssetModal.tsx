import { createSignal, Show } from "solid-js";
import { addTransactionToPortfolio } from "../../../../store/portfolioStore";
import { PortfolioTransactionType } from "../../../../types";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
}

export const AddAssetModal = (props: AddAssetModalProps) => {
  const [ticker, setTicker] = createSignal("");
  const [shares, setShares] = createSignal(0);
  const [price, setPrice] = createSignal(0);
  const [type, setType] = createSignal<PortfolioTransactionType>("BUY");

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (ticker() && shares() > 0 && price() > 0) {
      addTransactionToPortfolio(props.portfolioId, {
        ticker: ticker().toUpperCase(),
        shares: shares(),
        pricePerShare: price(),
        totalAmount: shares() * price(),
        type: type(),
        date: new Date().toISOString(),
      });
      setTicker("");
      setShares(0);
      setPrice(0);
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
            Add Transaction
          </h3>
          <form onSubmit={handleSubmit} class="space-y-4">
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
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Ticker Symbol
              </label>
              <input
                type="text"
                value={ticker()}
                onInput={(e) => setTicker(e.currentTarget.value)}
                placeholder="e.g., AAPL"
                class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                required
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Shares
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={shares()}
                  onInput={(e) => setShares(Number(e.currentTarget.value))}
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Price per Share
                </label>
                <input
                  type="number"
                  value={price()}
                  onInput={(e) => setPrice(Number(e.currentTarget.value))}
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
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
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
