import { Show } from "solid-js";

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  newTicker: string;
  setNewTicker: (t: string) => void;
  newQty: number | null;
  setNewQty: (q: number | null) => void;
  newPrice: number | null;
  setNewPrice: (p: number | null) => void;
  newCurrency: string;
  setNewCurrency: (c: string) => void;
  newConversionRate: number | null;
  setNewConversionRate: (r: number | null) => void;
  getUsdRate: () => number;
  onSubmit: (e: Event) => void;
}

export const AddHoldingModal = (props: AddHoldingModalProps) => {
  return (
    <Show when={props.isOpen}>
      <div 
        onClick={props.onClose}
        class="fixed inset-0 z-50 flex items-center justify-center bg-forest/30 backdrop-blur-xs p-6"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative flex flex-col border border-forest/10 animate-scale-in"
        >
          <div class="absolute top-0 left-0 w-full h-1.5 bg-forest"></div>
          <h3 class="text-xl font-cormorant text-forest font-bold mb-4">Add Asset Holding</h3>
          
          <form onSubmit={props.onSubmit} class="flex flex-col gap-4">
            <div>
              <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Ticker Symbol</label>
              <input 
                type="text" 
                required
                placeholder="e.g. MSFT, GOOG, ETH-USD"
                value={props.newTicker}
                onInput={(e) => props.setNewTicker(e.currentTarget.value.toUpperCase())}
                class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Quantity</label>
                <input 
                  type="number" 
                  step="0.00000001"
                  required
                  min="0"
                  placeholder="0.00"
                  value={props.newQty || ""}
                  onInput={(e) => props.setNewQty(parseFloat(e.currentTarget.value))}
                  class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Avg Buy Price</label>
                <input 
                  type="number" 
                  step="0.00000001"
                  required
                  min="0"
                  placeholder="$0.00"
                  value={props.newPrice || ""}
                  onInput={(e) => props.setNewPrice(parseFloat(e.currentTarget.value))}
                  class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Currency</label>
                <select
                  value={props.newCurrency}
                  onChange={(e) => {
                    const c = e.currentTarget.value;
                    props.setNewCurrency(c);
                    props.setNewConversionRate(c === "IDR" ? 1 : props.getUsdRate());
                  }}
                  class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none animate-none"
                >
                  <option value="USD">USD</option>
                  <option value="IDR">IDR</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-wider mb-1.5">Conversion Rate</label>
                <input 
                  type="number" 
                  step="any"
                  required
                  min="1"
                  placeholder={props.newCurrency === "IDR" ? "1" : props.getUsdRate().toFixed(2)}
                  value={props.newConversionRate ?? ""}
                  onInput={(e) => props.setNewConversionRate(parseFloat(e.currentTarget.value))}
                  class="w-full bg-sage/20 border border-transparent rounded-lg py-2 px-3 text-xs font-outfit text-near-black focus:bg-white focus:border-forest/20 focus:outline-none"
                />
              </div>
            </div>

            <div class="flex gap-3 justify-end mt-4">
              <button 
                type="button" 
                onClick={props.onClose}
                class="px-4 py-2 text-xs font-bold text-earth hover:text-forest transition-colors cursor-pointer border-0 bg-transparent outline-none"
              >
                CANCEL
              </button>
              <button 
                type="submit" 
                disabled={props.isSubmitting}
                class="px-5 py-2 text-xs font-bold bg-forest text-white rounded-lg hover:brightness-95 transition-all shadow-md cursor-pointer flex items-center gap-1 border-0 outline-none"
              >
                <Show when={props.isSubmitting} fallback="ADD POSITION">
                  <div class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-1" />
                  ADDING...
                </Show>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
