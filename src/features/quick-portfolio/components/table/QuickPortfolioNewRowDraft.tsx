import { Show } from "solid-js";
import { parseLocaleFloat } from "../../model/quickPortfolioFormatters";
import type { NewRowDraft } from "../../types";

interface QuickPortfolioNewRowDraftProps {
  draft: NewRowDraft | null;
  hideFxRate: boolean;
  isSubmitting: boolean;
  getCategory: (ticker: string) => string;
  getCategoryIcon: (category: string) => string;
  getUsdRate: () => number;
  onOpenDraft: () => void;
  onUpdateDraft: (patch: Partial<NewRowDraft>) => void;
  onCancelDraft: () => void;
  onCommitDraft: (
    symbol: string,
    qty: number,
    price: number,
    currency: string,
    conversionRate: number,
  ) => Promise<void>;
}

export const QuickPortfolioNewRowDraft = (props: QuickPortfolioNewRowDraftProps) => {
  let tickerRef: HTMLInputElement | undefined;
  let qtyRef: HTMLInputElement | undefined;
  let priceRef: HTMLInputElement | undefined;
  let currencyRef: HTMLSelectElement | undefined;
  let rateRef: HTMLInputElement | undefined;

  const commitDraft = async () => {
    const draft = props.draft;
    if (!draft) return;

    const symbol = draft.ticker.trim().toUpperCase();
    const qty = parseLocaleFloat(draft.qty);
    const price = parseLocaleFloat(draft.avgPrice);
    const currency = draft.currency;
    const conversionRate = parseLocaleFloat(draft.conversionRate);

    if (!symbol) {
      tickerRef?.focus();
      return;
    }
    if (Number.isNaN(qty) || qty <= 0) {
      qtyRef?.focus();
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      priceRef?.focus();
      return;
    }
    if (Number.isNaN(conversionRate) || conversionRate <= 0) {
      rateRef?.focus();
      return;
    }

    await props.onCommitDraft(symbol, qty, price, currency, conversionRate);
  };

  const handleKeyDown = (
    e: KeyboardEvent,
    field: "ticker" | "qty" | "avgPrice" | "currency" | "conversionRate",
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "ticker") {
        qtyRef?.focus();
        qtyRef?.select();
      } else if (field === "qty") {
        priceRef?.focus();
        priceRef?.select();
      } else if (field === "avgPrice") {
        if (!props.hideFxRate) {
          rateRef?.focus();
          rateRef?.select();
        } else {
          void commitDraft();
        }
      } else if (field === "conversionRate") {
        void commitDraft();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      props.onCancelDraft();
    }
  };

  return (
    <Show
      when={props.draft}
      fallback={
        <tr class="hover:bg-sage/10 transition-colors group opacity-75 hover:opacity-100">
          <td
            colspan={props.hideFxRate ? 9 : 10}
            class="px-6 py-3 cursor-pointer"
            classList={{ "cursor-not-allowed": props.isSubmitting }}
            onClick={props.onOpenDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onOpenDraft();
              }
            }}
          >
            <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-lg bg-sage/50 flex items-center justify-center text-forest/40 shrink-0">
                <span class="material-icons !text-sm">add</span>
              </div>
              <span class="font-bold text-earth/50 italic hover:text-forest text-[11px]">
                + Add Asset (fill ticker, quantity, buy price, currency & conversion rate)
              </span>
            </div>
          </td>
        </tr>
      }
    >
      {(draft) => (
        <tr class="bg-sage/15 border-y-2 border-dashed border-forest/30">
          {/* Asset / Ticker */}
          <td class="px-4 py-2 border-r border-forest/5 max-w-[320px]">
            <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-lg bg-forest text-white flex items-center justify-center shrink-0">
                <span class="material-icons !text-sm">
                  {draft().ticker ? props.getCategoryIcon(props.getCategory(draft().ticker)) : "edit"}
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <input
                    ref={(el) => {
                      tickerRef = el;
                      setTimeout(() => el.focus(), 50);
                    }}
                    type="text"
                    placeholder="TICKER"
                    autocomplete="off"
                    autocapitalize="characters"
                    spellcheck={false}
                    disabled={props.isSubmitting}
                    value={draft().ticker}
                    onInput={(e) =>
                      props.onUpdateDraft({ ticker: e.currentTarget.value.toUpperCase() })
                    }
                    onKeyDown={(e) => handleKeyDown(e, "ticker")}
                    class="bg-white border border-forest/30 rounded px-2 py-1 font-bold text-near-black text-xs w-20 uppercase focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                  />
                  <Show when={draft().ticker}>
                    <span class="px-1.5 py-0.5 rounded bg-sage/50 text-forest text-[8px] font-bold uppercase tracking-wider shrink-0">
                      {props.getCategory(draft().ticker)}
                    </span>
                  </Show>
                </div>
              </div>
            </div>
          </td>

          {/* Quantity */}
          <td class="px-4 py-2 text-right border-r border-forest/5">
            <input
              ref={qtyRef}
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              autocomplete="off"
              disabled={props.isSubmitting}
              value={draft().qty}
              onInput={(e) =>
                props.onUpdateDraft({ qty: e.currentTarget.value.replace(/[^0-9.,]/g, "") })
              }
              onKeyDown={(e) => handleKeyDown(e, "qty")}
              class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-20 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
            />
          </td>

          {/* Avg Buy Price */}
          <td class="px-4 py-2 text-right border-r border-forest/5">
            <input
              ref={priceRef}
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              autocomplete="off"
              disabled={props.isSubmitting}
              value={draft().avgPrice}
              onInput={(e) =>
                props.onUpdateDraft({ avgPrice: e.currentTarget.value.replace(/[^0-9.,]/g, "") })
              }
              onKeyDown={(e) => handleKeyDown(e, "avgPrice")}
              class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-20 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
            />
          </td>

          {/* Currency & Conversion Rate */}
          <Show when={!props.hideFxRate}>
            <td class="px-4 py-2 text-right border-r border-forest/5">
              <div class="flex items-center justify-end gap-1.5">
                <select
                  ref={currencyRef}
                  disabled={props.isSubmitting}
                  value={draft().currency}
                  onChange={(e) => {
                    const c = e.currentTarget.value;
                    props.onUpdateDraft({
                      currency: c,
                      conversionRate: c === "IDR" ? "1" : props.getUsdRate().toFixed(2),
                    });
                  }}
                  onKeyDown={(e) => handleKeyDown(e, "currency")}
                  class="bg-white border border-forest/30 rounded px-1 py-0.5 font-mono text-near-black text-xs w-12 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                >
                  <option value="USD">USD</option>
                  <option value="IDR">IDR</option>
                </select>
                <input
                  ref={rateRef}
                  type="text"
                  inputmode="decimal"
                  placeholder={draft().currency === "IDR" ? "1" : props.getUsdRate().toFixed(2)}
                  autocomplete="off"
                  disabled={props.isSubmitting || draft().currency === "IDR"}
                  value={draft().conversionRate}
                  onInput={(e) =>
                    props.onUpdateDraft({
                      conversionRate: e.currentTarget.value.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  onKeyDown={(e) => handleKeyDown(e, "conversionRate")}
                  class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-20 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 disabled:bg-sage/30 disabled:text-earth/60"
                />
              </div>
            </td>
          </Show>

          {/* Placeholders */}
          <td class="px-4 py-2 text-right font-mono text-earth/30 border-r border-forest/5">—</td>
          <td class="px-4 py-2 text-right font-mono text-earth/30 border-r border-forest/5">—</td>
          <td class="px-4 py-2 text-right font-mono text-earth/30 border-r border-forest/5">—</td>

          {/* Save / Cancel */}
          <td class="px-4 py-2 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <Show
                when={!props.isSubmitting}
                fallback={
                  <span class="flex items-center gap-1 text-[9px] text-forest font-outfit font-bold uppercase tracking-wider">
                    <span class="w-3 h-3 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
                    Saving…
                  </span>
                }
              >
                <button
                  type="button"
                  onClick={() => void commitDraft()}
                  class="bg-forest text-white rounded-lg p-1.5 hover:bg-forest/90 transition-colors shadow-sm cursor-pointer border-0"
                  title="Save holding (Enter)"
                >
                  <span class="material-icons !text-sm leading-none">check</span>
                </button>
                <button
                  type="button"
                  onClick={props.onCancelDraft}
                  class="bg-earth/15 text-earth rounded-lg p-1.5 hover:bg-earth/25 transition-colors cursor-pointer border-0"
                  title="Cancel (Esc)"
                >
                  <span class="material-icons !text-sm leading-none">close</span>
                </button>
              </Show>
            </div>
          </td>
        </tr>
      )}
    </Show>
  );
};
