import { Show } from "solid-js";
import type { PortfolioAsset } from "../../../../../types";
import { formatNumericInput, getUsdRate } from "../../../../../utils/format";

interface AddAssetPricingFieldsProps {
  type: "BUY" | "SELL";
  selectedHeldAsset: PortfolioAsset | null;
  nativeCurrency: "IDR" | "USD";
  shares: number | null;
  price: number | null;
  currency: string;
  priceCurrency: number;
  isLoadingPrice: boolean;
  amount: number | null;
  onSharesInput: (value: number | null) => void;
  onPriceInput: (value: number | null) => void;
  onCurrencyChange: (currency: string) => void;
  onPriceCurrencyChange: (rate: number) => void;
}

const formatAveragePrice = (priceVal: number, currencyCode: "IDR" | "USD") => {
  if (currencyCode === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(priceVal);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceVal);
};

export const AddAssetPricingFields = (props: AddAssetPricingFieldsProps) => {
  const amountDisplay = () => {
    const amt = props.amount;
    if (amt === null) return "—";

    if (props.currency === "IDR") {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amt);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amt);
  };

  return (
    <>
      {/* Qty and Price Row */}
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
            Quantity (,)
            <Show when={props.type === "SELL" && props.selectedHeldAsset}>
              {(held) => (
                <span class="text-spring font-bold ml-1 normal-case tracking-normal">
                  · Owned: {Number(held().totalShares.toFixed(4))}
                </span>
              )}
            </Show>
          </label>
          <input
            type="number"
            step="0.0001"
            value={props.shares ?? ""}
            onInput={(e) =>
              props.onSharesInput(
                e.currentTarget.value ? Number(e.currentTarget.value) : null,
              )
            }
            placeholder="0.00"
            class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
            required
          />
        </div>
        <div>
          <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
            Price per Unit (,)
            <Show when={props.type === "SELL" && props.selectedHeldAsset}>
              {(held) => (
                <span class="text-spring font-bold ml-1 normal-case tracking-normal">
                  · Avg:{" "}
                  {formatAveragePrice(held().averagePrice, props.nativeCurrency)}
                </span>
              )}
            </Show>
          </label>
          <div class="relative flex items-stretch border border-forest/10 focus-within:border-forest/30 rounded-xl overflow-hidden bg-white">
            <div class="relative flex items-center bg-spring/5 px-3 cursor-pointer shrink-0 border-2 border-forest/5 rounded-l-[10px]">
              <select
                value={props.currency}
                onChange={(e) => props.onCurrencyChange(e.currentTarget.value)}
                class="bg-transparent font-outfit text-xs font-bold text-forest/40 focus:outline-none cursor-pointer pr-4 appearance-none z-10"
              >
                <option value="USD" class="text-forest bg-white">
                  USD
                </option>
                <option value="IDR" class="text-forest bg-white">
                  IDR
                </option>
              </select>
              <span class="material-icons absolute right-1.5 top-1/2 -translate-y-1/2 text-forest/40 pointer-events-none text-base z-0">
                expand_more
              </span>
            </div>
            <input
              type="number"
              step="0.01"
              value={props.price ?? ""}
              onInput={(e) =>
                props.onPriceInput(
                  e.currentTarget.value ? Number(e.currentTarget.value) : null,
                )
              }
              placeholder={props.isLoadingPrice ? "Fetching..." : "0.00"}
              class="w-full px-3 py-3 border-0 focus:ring-0 focus:outline-none outline-none font-outfit text-forest disabled:bg-forest/5 bg-transparent"
              required
              disabled={props.isLoadingPrice}
            />
            <Show when={props.isLoadingPrice}>
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <div class="w-4 h-4 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Exchange Rate & Total Amount Row */}
      <div class={props.currency === "USD" ? "grid grid-cols-2 gap-4" : ""}>
        <Show when={props.currency === "USD"}>
          <div class="animate-in fade-in slide-in-from-top-2 duration-200">
            <label class="text-[10px] uppercase tracking-widest text-earth font-bold mb-2 flex items-center justify-between">
              <span>USD Rate (IDR)</span>
              <button
                type="button"
                onClick={() => props.onPriceCurrencyChange(getUsdRate())}
                class="text-[9px] text-spring hover:underline font-bold uppercase tracking-wider cursor-pointer font-outfit"
              >
                Reset to Live
              </button>
            </label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 font-outfit text-xs font-bold text-forest/40">
                Rp
              </span>
              <input
                type="text"
                inputmode="decimal"
                value={formatNumericInput(
                  props.priceCurrency ? props.priceCurrency.toString() : "",
                )}
                onInput={(e) => {
                  const rawValue = e.currentTarget.value.replace(/\D/g, "");
                  props.onPriceCurrencyChange(rawValue ? Number(rawValue) : 0);
                }}
                placeholder="e.g., 16,300"
                class="w-full pl-10 pr-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                required
              />
            </div>
          </div>
        </Show>

        <div class={props.currency === "USD" ? "flex flex-col justify-end h-full" : ""}>
          <div class="py-2.5 px-4 rounded-xl bg-forest/[0.02] border border-forest/10 font-outfit text-forest transition-all flex items-center justify-between min-h-[50px]">
            <span class="text-xs text-earth/70 font-semibold">Amount</span>
            <div class="flex flex-col items-end gap-0.5">
              <span class="text-base font-bold text-forest">{amountDisplay()}</span>
              <Show when={props.amount !== null}>
                <span class="text-[10px] text-earth/60 font-medium">
                  {props.currency === "USD"
                    ? new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format((props.amount ?? 0) * props.priceCurrency)
                    : new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format((props.amount ?? 0) / getUsdRate())}
                </span>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
