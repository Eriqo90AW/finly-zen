import { For, Show, createSignal, createMemo, createEffect } from "solid-js";
import { Portal } from "solid-js/web";
import CloseRoundedIcon from "@suid/icons-material/CloseRounded";
import type { StockData } from "../../../types";
import {
  priceAlertState,
  addPriceAlert,
  removePriceAlert,
} from "../../../store/priceAlertStore";
import { formatUSD } from "../../../utils/format";

export interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockData: StockData;
}

export const PriceAlertModal = (props: PriceAlertModalProps) => {
  const currentPrice = () => props.stockData.valuation.extended_hours_price;
  const ticker = () => props.stockData.ticker.toUpperCase();
  const companyName = () => props.stockData.company_name;

  const [condition, setCondition] = createSignal<"above" | "below">("above");
  const [targetPriceInput, setTargetPriceInput] = createSignal<string>("");

  // Sync / Reset on open
  createEffect(() => {
    if (props.isOpen) {
      setCondition("above");
      setTargetPriceInput("");
    }
  });

  // Filter alerts for the current stock
  const stockAlerts = createMemo(() => {
    return priceAlertState.alerts.filter((a) => a.ticker === ticker());
  });

  const handleQuickAdjust = (percentage: number) => {
    const calculated = currentPrice() * (1 + percentage);
    setTargetPriceInput(calculated.toFixed(2));
  };

  const handleCreateAlert = (e: Event) => {
    e.preventDefault();
    const price = parseFloat(targetPriceInput());
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price target.");
      return;
    }

    addPriceAlert(ticker(), companyName(), price, condition());
    setTargetPriceInput("");
  };

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        classList={{
          "pointer-events-auto": props.isOpen,
          "pointer-events-none": !props.isOpen,
        }}
      >
        {/* Backdrop */}
        <div
          class="absolute inset-0 bg-forest/40 transition-opacity duration-300"
          classList={{
            "opacity-100": props.isOpen,
            "opacity-0": !props.isOpen,
          }}
          onClick={props.onClose}
        />

        {/* Modal Panel */}
        <div
          class="bg-white rounded-3xl py-8 px-10 w-[95vw] max-w-xl max-h-[85vh] shadow-2xl relative flex flex-col border border-forest/10 overflow-y-auto transition-all duration-300 ease-out will-change-transform z-10"
          style={{
            transform: props.isOpen
              ? "scale(1) translate3d(0, 0, 0)"
              : "scale(0.95) translate3d(0, 20px, 0)",
            opacity: props.isOpen ? 1 : 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div class="flex items-center justify-between mb-6 border-b border-forest/5 pb-2">
              <div>
                <h4 class="font-outfit font-bold text-forest text-xl flex items-center gap-2 leading-none">
                  <span class="material-icons text-spring">notifications_active</span>
                  <span>Price Notifications</span>
                </h4>
                <p class="text-[11px] text-earth/60 mt-0.5">
                  {companyName()} • <span class="font-black text-[10px] bg-forest/5 text-forest px-1.5 py-0.5 rounded uppercase">{ticker()}</span>
                </p>
              </div>
              <button
                onClick={props.onClose}
                class="p-2 rounded-xl text-earth/40 hover:text-forest hover:bg-sage/15 border border-transparent hover:border-forest/10 transition-all cursor-pointer flex items-center justify-center"
                title="Close"
              >
                <CloseRoundedIcon style={{ "font-size": "24px" }} />
              </button>
            </div>

            {/* Current Price Info Banner */}
            <div class="flex items-center justify-between bg-sage/20 border border-forest/5 rounded-2xl p-4 mb-6">
              <span class="text-xs font-bold text-earth uppercase tracking-wider">Current Stock Price</span>
              <span class="text-2xl font-outfit font-black text-forest">{formatUSD(currentPrice())}</span>
            </div>

            {/* Form Area */}
            <form onSubmit={handleCreateAlert} class="space-y-5 border-b border-forest/10 pb-6 mb-6">
              <div class="flex flex-col gap-2">
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold">Trigger Condition</label>
                <div class="flex bg-sage/10 p-1 rounded-xl border border-forest/5 w-full">
                  <button
                    type="button"
                    onClick={() => setCondition("above")}
                    class="flex-1 py-2 text-xs font-bold rounded-lg transition-all hover:cursor-pointer flex items-center justify-center gap-2"
                    classList={{
                      "bg-white text-forest shadow-sm": condition() === "above",
                      "text-earth/60 hover:text-earth": condition() !== "above",
                    }}
                  >
                    <span class="material-icons text-sm">trending_up</span> Price goes above
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition("below")}
                    class="flex-1 py-2 text-xs font-bold rounded-lg transition-all hover:cursor-pointer flex items-center justify-center gap-2"
                    classList={{
                      "bg-white text-forest shadow-sm": condition() === "below",
                      "text-earth/60 hover:text-earth": condition() !== "below",
                    }}
                  >
                    <span class="material-icons text-sm">trending_down</span> Price goes below
                  </button>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold">Price Target (USD)</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-earth/60 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={currentPrice().toFixed(2)}
                    value={targetPriceInput()}
                    onInput={(e) => setTargetPriceInput(e.currentTarget.value)}
                    class="w-full pl-8 pr-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-2 focus:ring-forest/10 outline-none font-outfit text-forest text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Quick Adjust Pills */}
              <div class="flex flex-col gap-2">
                <label class="block text-[10px] uppercase tracking-widest text-earth/50 font-bold">Quick Set (Relative to Current)</label>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickAdjust(-0.1)}
                    class="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-forest/10 bg-transparent text-earth hover:bg-sage/10 hover:border-forest/20 cursor-pointer"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjust(-0.05)}
                    class="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-forest/10 bg-transparent text-earth hover:bg-sage/10 hover:border-forest/20 cursor-pointer"
                  >
                    -5%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjust(0.05)}
                    class="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-forest/10 bg-transparent text-earth hover:bg-sage/10 hover:border-forest/20 cursor-pointer"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjust(0.1)}
                    class="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-forest/10 bg-transparent text-earth hover:bg-sage/10 hover:border-forest/20 cursor-pointer"
                  >
                    +10%
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                class="w-full bg-forest text-white py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span class="material-icons text-sm">add_alert</span> Set Price Alert
              </button>
            </form>

            {/* List of Active & Past Alerts for Ticker */}
            <div class="flex-1 flex flex-col min-h-0">
              <h5 class="text-[10px] uppercase tracking-widest text-earth font-bold mb-3">Alerts for {ticker()}</h5>
              <Show
                when={stockAlerts().length > 0}
                fallback={
                  <div class="text-center py-6 text-earth/50 text-xs italic">
                    No alerts set for {ticker()} yet.
                  </div>
                }
              >
                <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <For each={stockAlerts()}>
                    {(alert) => (
                      <div
                        class="flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-semibold"
                        classList={{
                          "bg-sage/10 border-forest/5 text-forest": !alert.triggered,
                          "bg-earth/5 border-forest/5 text-earth/60": alert.triggered,
                        }}
                      >
                        <div class="flex items-center gap-3">
                          <span
                            class="material-icons text-sm"
                            classList={{
                              "text-fin-green": alert.condition === "above" && !alert.triggered,
                              "text-fin-red": alert.condition === "below" && !alert.triggered,
                              "text-earth/40": alert.triggered,
                            }}
                          >
                            {alert.condition === "above" ? "trending_up" : "trending_down"}
                          </span>
                          <div>
                            <div class="flex items-center gap-2">
                              <span>Price goes {alert.condition === "above" ? "above" : "below"}</span>
                              <span class="font-black font-outfit text-sm">
                                {formatUSD(alert.targetPrice)}
                              </span>
                            </div>
                            <div class="text-[9px] text-earth/40 mt-0.5">
                              Created: {new Date(alert.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div class="flex items-center gap-2.5">
                          <Show
                            when={alert.triggered}
                            fallback={
                              <span class="px-2 py-0.5 text-[8px] bg-fin-green/10 text-fin-green border border-fin-green/20 rounded font-black tracking-wider uppercase">
                                Active
                              </span>
                            }
                          >
                            <span class="px-2 py-0.5 text-[8px] bg-earth/10 text-earth/50 border border-earth/20 rounded font-black tracking-wider uppercase">
                              Triggered
                            </span>
                          </Show>
                          <button
                            type="button"
                            onClick={() => removePriceAlert(alert.id)}
                            class="p-1 rounded-lg text-earth/40 hover:text-fin-red hover:bg-fin-red/10 cursor-pointer flex items-center justify-center transition-colors"
                            title="Delete Alert"
                          >
                            <span class="material-icons text-sm">delete_outline</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Portal>
  );
};
