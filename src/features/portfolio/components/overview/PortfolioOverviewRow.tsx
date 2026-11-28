import { Show } from "solid-js";
import type { Portfolio } from "../../../../types";
import { getPortfolioColor } from "../../../../utils/colors";
import {
  calculateDisplayGainAndPercentage,
  formatNumericInput,
  formatPortfolioValue,
  formatUSDInput,
} from "../../../../utils/format";
import { PortfolioMiniDonut } from "./PortfolioMiniDonut";

interface PortfolioOverviewRowProps {
  portfolio: Portfolio;
  currency: "IDR" | "USD";
  isEditingCash: boolean;
  cashEditValue: string;
  onNavigate: (id: string) => void;
  onStartEditCash: (portfolio: Portfolio) => void;
  onCashEditChange: (value: string) => void;
  onCommitCashEdit: (portfolioId: string) => void;
  onCancelCashEdit: () => void;
  onRequestDelete: (portfolio: { id: string; name: string }) => void;
}

export const PortfolioOverviewRow = (props: PortfolioOverviewRowProps) => {
  const pColor = () => getPortfolioColor(props.portfolio.name);
  const isUSD = () => (props.portfolio.price_currency ?? 1) > 1;

  const gainStats = () =>
    calculateDisplayGainAndPercentage(
      props.portfolio.totalValue,
      props.portfolio.initialCapital,
      props.portfolio.price_currency ?? 1,
      props.portfolio.nativeCurrency,
      props.currency,
    );

  const initialPlusCash = () =>
    props.portfolio.assets.reduce(
      (sum, a) => sum + a.averagePrice * a.totalShares,
      0,
    ) + props.portfolio.cash;

  return (
    <div
      onClick={() => props.onNavigate(props.portfolio.id)}
      class="group flex items-center px-8 py-5 border-b border-forest/5 hover:bg-slate-50/80 transition-colors duration-200 cursor-pointer relative"
    >
      {/* Left side dynamic indicator stripe */}
      <div
        class="absolute left-0 top-0 bottom-0 w-1 transition-transform duration-200 group-hover:scale-x-[1.5] origin-left"
        style={{ "background-color": pColor() }}
      />

      {/* Portfolio Name Badge Column */}
      <div class="flex-[2] flex pr-4 items-center gap-4 min-w-0">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
          style={{ "background-color": pColor() }}
        >
          {props.portfolio.name.charAt(0).toUpperCase()}
        </div>
        <div class="flex flex-col min-w-0">
          <span class="font-outfit font-bold text-forest text-base leading-tight group-hover:text-spring transition-colors">
            {props.portfolio.name}
          </span>
          <span class="text-xs text-earth/60 truncate max-w-[180px]">
            ID: {props.portfolio.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Total Value Column */}
      <div class="flex-1 flex flex-col items-end gap-0.5">
        <span class="font-outfit font-bold text-forest text-sm">
          {formatPortfolioValue(
            props.portfolio.totalValue,
            props.currency,
            false,
            props.portfolio.nativeCurrency,
          )}
        </span>
      </div>

      {/* All-Time Gain Column */}
      <div class="flex-1 flex flex-col items-end gap-0.5">
        <span
          class={`font-outfit font-bold text-sm ${
            gainStats().isPositive ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {gainStats().isPositive ? "+" : ""}
          {formatPortfolioValue(
            gainStats().gain,
            props.currency,
            true,
            props.currency,
          )}
        </span>
        <div
          class={`flex items-center text-[11px] font-bold ${
            gainStats().isPositive ? "text-emerald-600/80" : "text-rose-500/80"
          }`}
        >
          <span class="material-icons !text-[14px]">
            {gainStats().isPositive ? "arrow_drop_up" : "arrow_drop_down"}
          </span>
          {Math.abs(gainStats().percentage).toFixed(2)}%
        </div>
      </div>

      {/* Initial / Cash Column */}
      <div class="flex-1 flex flex-col items-end gap-0.5">
        <span class="font-outfit font-medium text-forest text-sm">
          {formatPortfolioValue(
            initialPlusCash(),
            props.currency,
            false,
            props.portfolio.nativeCurrency,
            props.portfolio.price_currency,
          )}
        </span>
        <Show
          when={props.isEditingCash}
          fallback={
            <span
              onClick={(e) => {
                e.stopPropagation();
                props.onStartEditCash(props.portfolio);
              }}
              class="text-[11px] text-earth/60 font-medium hover:text-forest hover:underline cursor-pointer transition-colors"
            >
              Cash:{" "}
              {formatPortfolioValue(
                props.portfolio.cash,
                props.currency,
                false,
                props.portfolio.nativeCurrency,
                props.portfolio.price_currency,
              )}
            </span>
          }
        >
          <div
            class="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <span class="text-[11px] text-earth/60 font-medium">Cash:</span>
            <input
              id={`cash-input-${props.portfolio.id}`}
              type="text"
              inputmode="decimal"
              value={
                isUSD()
                  ? formatUSDInput(props.cashEditValue)
                  : formatNumericInput(props.cashEditValue)
              }
              onInput={(e) => {
                let val = e.currentTarget.value;
                if (isUSD()) {
                  val = val.replace(/,/g, ".");
                  const parts = val.split(".");
                  if (parts.length > 1) {
                    val = `${parts[0].replace(/\D/g, "")}.${parts[1].slice(0, 2).replace(/\D/g, "")}`;
                  } else {
                    val = val.replace(/\D/g, "");
                  }
                } else {
                  val = val.replace(/\D/g, "");
                }
                props.onCashEditChange(val);
              }}
              onBlur={() => props.onCommitCashEdit(props.portfolio.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  props.onCommitCashEdit(props.portfolio.id);
                } else if (e.key === "Escape") {
                  props.onCancelCashEdit();
                }
              }}
              class="w-24 text-[11px] text-right font-outfit font-medium text-forest bg-transparent border border-forest/20 rounded px-1 py-0.5 focus:outline-none focus:border-forest/40"
            />
          </div>
        </Show>
      </div>

      {/* Assets Column */}
      <div class="flex-1 flex flex-col items-end gap-0.5">
        <span class="font-outfit text-forest font-bold text-sm">
          {props.portfolio.assets.length}{" "}
          {props.portfolio.assets.length === 1 ? "Asset" : "Assets"}
        </span>
        <span class="text-[11px] text-earth/60 font-medium">Total Assets</span>
      </div>

      {/* Chart Column */}
      <div class="w-36 flex justify-end items-center">
        <PortfolioMiniDonut portfolio={props.portfolio} />
      </div>

      {/* Action Column */}
      <div class="w-12 flex justify-end items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onRequestDelete({
              id: props.portfolio.id,
              name: props.portfolio.name,
            });
          }}
          class="opacity-0 group-hover:opacity-100 transition-opacity text-earth/20 hover:text-rose-500 pt-1.5 px-1 hover:bg-rose-50 rounded-md cursor-pointer"
          title="Delete Portfolio"
        >
          <span class="material-icons text-base">delete_outline</span>
        </button>
      </div>
    </div>
  );
};
