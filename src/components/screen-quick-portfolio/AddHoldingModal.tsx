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
        class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-sm p-6 animate-fade-in"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative flex flex-col border border-forest/10 overflow-hidden"
        >
          <div class="absolute top-0 left-0 w-full h-1.5 bg-forest"></div>
          <div class="flex items-center justify-between mb-5">
            <div>
              <span class="text-[10px] font-bold text-earth uppercase tracking-widest">
                Quick Portfolio
              </span>
              <h3 class="text-2xl font-cormorant text-forest font-bold tracking-tight">
                Add Asset Position
              </h3>
            </div>
            <button
              onClick={props.onClose}
              class="w-8 h-8 rounded-full bg-sage/50 hover:bg-sage text-forest flex items-center justify-center transition-colors cursor-pointer border-0 outline-none"
            >
              <span class="material-icons !text-lg">close</span>
            </button>
          </div>
          
          <form onSubmit={props.onSubmit} class="flex flex-col gap-4 font-outfit">
            <div>
              <label class="block text-[10px] uppercase font-bold text-earth tracking-widest mb-1.5">
                Ticker Symbol
              </label>
              <input 
                type="text" 
                required
                placeholder="e.g. BBCA.JK, MSFT, BTC-USD"
                value={props.newTicker}
                onInput={(e) => props.setNewTicker(e.currentTarget.value.toUpperCase())}
                class="w-full bg-page-bg border border-forest/10 rounded-xl py-2.5 px-3.5 text-xs text-near-black focus:bg-white focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none transition-all"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-widest mb-1.5">
                  Quantity
                </label>
                <input 
                  type="number" 
                  step="0.00000001"
                  required
                  min="0"
                  placeholder="0.00"
                  value={props.newQty || ""}
                  onInput={(e) => props.setNewQty(parseFloat(e.currentTarget.value))}
                  class="w-full bg-page-bg border border-forest/10 rounded-xl py-2.5 px-3.5 text-xs text-near-black focus:bg-white focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-widest mb-1.5">
                  Avg Buy Price
                </label>
                <input 
                  type="number" 
                  step="0.00000001"
                  required
                  min="0"
                  placeholder="0.00"
                  value={props.newPrice || ""}
                  onInput={(e) => props.setNewPrice(parseFloat(e.currentTarget.value))}
                  class="w-full bg-page-bg border border-forest/10 rounded-xl py-2.5 px-3.5 text-xs text-near-black focus:bg-white focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-widest mb-1.5">
                  Currency
                </label>
                <select
                  value={props.newCurrency}
                  onChange={(e) => {
                    const c = e.currentTarget.value;
                    props.setNewCurrency(c);
                    props.setNewConversionRate(c === "IDR" ? 1 : props.getUsdRate());
                  }}
                  class="w-full bg-page-bg border border-forest/10 rounded-xl py-2.5 px-3.5 text-xs text-near-black focus:bg-white focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="IDR">IDR (Rp)</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] uppercase font-bold text-earth tracking-widest mb-1.5">
                  FX Conversion Rate
                </label>
                <input 
                  type="number" 
                  step="any"
                  required
                  min="1"
                  placeholder={props.newCurrency === "IDR" ? "1" : props.getUsdRate().toFixed(2)}
                  value={props.newConversionRate ?? ""}
                  onInput={(e) => props.setNewConversionRate(parseFloat(e.currentTarget.value))}
                  class="w-full bg-page-bg border border-forest/10 rounded-xl py-2.5 px-3.5 text-xs text-near-black focus:bg-white focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div class="flex gap-3 justify-end mt-4 pt-2">
              <button 
                type="button" 
                onClick={props.onClose}
                class="px-4 py-2.5 text-xs font-bold text-earth hover:text-forest transition-colors cursor-pointer border-0 bg-transparent outline-none"
              >
                CANCEL
              </button>
              <button 
                type="submit" 
                disabled={props.isSubmitting}
                class="px-6 py-2.5 text-xs font-bold bg-forest text-white rounded-xl hover:bg-mid-green transition-all shadow-md cursor-pointer flex items-center gap-1.5 border-0 outline-none active:scale-95"
              >
                <Show when={props.isSubmitting} fallback="SAVE POSITION">
                  <div class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-1" />
                  SAVING...
                </Show>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};

