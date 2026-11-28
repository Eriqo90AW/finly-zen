import { Show } from "solid-js";
import { AssetLogo } from "../../../../components/common/AssetLogo";
import type { PortfolioTransactionDB } from "../../../../types";
import { getAssetColor } from "../../../../utils/colors";
import { formatDateDetail, formatPortfolioValue } from "../../../../utils/format";
import { formatTxCurrency, getTxAmountInNative } from "./tradeHistoryHelpers";

interface TradeHistoryRowProps {
  tx: PortfolioTransactionDB;
  isExpanded: boolean;
  logoUrl?: string;
  assetName?: string;
  currency: "IDR" | "USD";
  nativeCurrency: "IDR" | "USD";
  onToggleExpand: (id: string) => void;
  onNavigateStock: (ticker: string) => void;
}

export const TradeHistoryRow = (props: TradeHistoryRowProps) => {
  const assetColor = () => getAssetColor(props.tx.asset_ticker);
  const displayAmt = () =>
    getTxAmountInNative(props.tx, props.nativeCurrency === "USD");

  return (
    <>
      <tr
        onClick={() => props.onToggleExpand(props.tx.id)}
        class="group hover:bg-earth/5 transition-all duration-150 cursor-pointer relative"
      >
        <td class="w-1.5 py-4 px-2 relative">
          <div
            class="absolute left-0 top-0 bottom-0 w-1 transition-transform duration-200 group-hover:scale-x-[1.5] origin-left"
            style={{ "background-color": assetColor() }}
          />
        </td>

        {/* Ticker Column with Logo & Company Name */}
        <td class="py-4 px-4">
          <div class="flex items-center gap-4 min-w-0">
            <AssetLogo
              ticker={props.tx.asset_ticker}
              logoUrl={props.logoUrl}
              size="lg"
              class="w-10 h-10 rounded-xl shadow-xs border border-forest/10"
              imageClass="object-contain p-1 bg-white"
              fallbackType="letter"
            />
            <div class="flex flex-col min-w-0">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  props.onNavigateStock(props.tx.asset_ticker);
                }}
                class="font-outfit font-bold text-forest text-base leading-tight group-hover:text-spring transition-colors hover:underline cursor-pointer"
              >
                {props.tx.asset_ticker}
              </span>
              <span class="text-xs text-earth/60 truncate max-w-[180px]">
                {props.assetName || "Unknown Asset"}
              </span>
            </div>
          </div>
        </td>

        {/* Type Indicator */}
        <td class="py-4 px-4">
          <span
            class={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
              props.tx.type === "BUY"
                ? "bg-spring/10 text-spring border-spring/20"
                : props.tx.type === "SELL"
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-blue-500/10 text-blue-500 border-blue-500/20"
            }`}
          >
            <span class="material-icons text-[10px]">
              {props.tx.type === "BUY"
                ? "arrow_upward"
                : props.tx.type === "SELL"
                  ? "arrow_downward"
                  : "payments"}
            </span>
            {props.tx.type}
          </span>
        </td>

        {/* Transaction Date */}
        <td class="py-4 px-4 text-xs font-outfit text-earth/80">
          {formatDateDetail(props.tx.transaction_date)}
        </td>

        {/* Shares count */}
        <td class="py-4 px-4 text-right font-outfit font-semibold text-xs text-forest">
          {Number(props.tx.qty).toLocaleString(undefined, {
            maximumFractionDigits: 6,
          })}
        </td>

        {/* Price per unit */}
        <td class="py-4 px-4 text-right font-outfit font-semibold text-xs text-forest">
          {formatTxCurrency(
            Number(props.tx.price_per_unit),
            props.tx.settlement_currency,
          )}
        </td>

        {/* Computed Total Amount */}
        <td class="py-4 px-4 text-right">
          <div class="flex flex-col items-end">
            <span class="font-outfit font-black text-xs text-forest">
              {formatTxCurrency(
                Number(props.tx.qty) * Number(props.tx.price_per_unit),
                props.tx.settlement_currency,
              )}
            </span>
            <Show when={props.tx.settlement_currency !== props.currency}>
              <span class="text-[9px] text-earth/40 font-semibold mt-0.5">
                ≈{" "}
                {formatPortfolioValue(
                  displayAmt(),
                  props.currency,
                  false,
                  props.nativeCurrency,
                )}
              </span>
            </Show>
          </div>
        </td>

        {/* Expand chevron */}
        <td class="py-4 px-2 text-center text-earth/40 select-none">
          <span
            class={`material-icons transition-transform duration-200 text-lg ${
              props.isExpanded ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </td>
      </tr>

      {/* Collapsible Details Panel */}
      <Show when={props.isExpanded}>
        <tr>
          <td
            colspan="8"
            class="p-0 bg-[#F6F8F6] border-t border-b border-forest/5"
          >
            <div class="px-8 py-5 font-outfit flex flex-col gap-4 text-xs text-forest animate-slide-down">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="flex flex-col gap-1.5">
                  <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider">
                    Exchange Rate (fx_rate_to_base)
                  </span>
                  <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                    <span class="material-icons text-sm text-earth/40">
                      currency_exchange
                    </span>
                    1 {props.tx.settlement_currency} ={" "}
                    {Number(props.tx.fx_rate_to_base).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}{" "}
                    {props.nativeCurrency}
                  </span>
                </div>

                <div class="flex flex-col gap-1.5">
                  <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider">
                    Created Timestamp
                  </span>
                  <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                    <span class="material-icons text-sm text-earth/40">
                      add_circle_outline
                    </span>
                    {formatDateDetail(props.tx.created_at)}
                  </span>
                </div>

                <div class="flex flex-col gap-1.5">
                  <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider">
                    Last Updated Timestamp
                  </span>
                  <span class="font-semibold bg-white border border-forest/10 rounded-xl px-3 py-2 text-forest/80 shadow-sm flex items-center gap-1.5">
                    <span class="material-icons text-sm text-earth/40">
                      edit
                    </span>
                    {formatDateDetail(props.tx.updated_at)}
                  </span>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider">
                  Transaction Notes
                </span>
                <div class="bg-white border border-forest/10 rounded-xl p-4 text-forest/80 shadow-sm min-h-[60px] flex gap-2.5 items-start">
                  <span class="material-icons text-base text-earth/35 mt-0.5">
                    description
                  </span>
                  <p
                    class={`leading-relaxed ${
                      !props.tx.notes ? "italic text-earth/40" : ""
                    }`}
                  >
                    {props.tx.notes || "No notes recorded for this transaction."}
                  </p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </Show>
    </>
  );
};
