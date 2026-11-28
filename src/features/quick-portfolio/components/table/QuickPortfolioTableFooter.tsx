import { Show } from "solid-js";
import { formatPercent } from "../../../../utils/format";

interface QuickPortfolioTableFooterProps {
  isFiltered: boolean;
  hideFxRate: boolean;
  cashBalance: number;
  totalValue: number;
  currencyView: "USD" | "IDR";
  isCashEditing: boolean;
  editValue: string;
  onEditInput: (val: string) => void;
  onStartCashEdit: () => void;
  onSaveCashEdit: () => void;
  onCashKeyDown: (e: KeyboardEvent) => void;
  dynamicTotalLabel: string;
  dynamicTotalValue: number;
  dynamicPL: number;
  dynamicPLPercent: number;
  formatVal: (amount: number, isShort?: boolean) => string;
  formatCash: (amount: number, isShort?: boolean) => string;
}

export const QuickPortfolioTableFooter = (props: QuickPortfolioTableFooterProps) => {
  return (
    <tfoot class="bg-sage/10 border-t-2 border-forest/10 font-outfit text-xs font-bold text-near-black">
      <Show when={!props.isFiltered}>
        <tr>
          <td class="px-6 py-4">Cash Balance</td>
          <Show
            when={props.isCashEditing}
            fallback={
              <td
                onClick={props.onStartCashEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    props.onStartCashEdit();
                  }
                }}
                class="px-6 py-4 text-right font-mono hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                colspan={props.hideFxRate ? 5 : 6}
              >
                {props.formatCash(props.cashBalance)}
              </td>
            }
          >
            <td
              class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner"
              colspan={props.hideFxRate ? 4 : 5}
            >
              <div class="flex items-center justify-end">
                <input
                  ref={(el) => {
                    setTimeout(() => {
                      el.focus();
                      el.select();
                    }, 50);
                  }}
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  value={props.editValue}
                  onInput={(e) => props.onEditInput(e.currentTarget.value.replace(/[^0-9.,]/g, ""))}
                  onBlur={props.onSaveCashEdit}
                  onKeyDown={props.onCashKeyDown}
                  class="w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                />
              </div>
              <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">
                Edit
              </div>
            </td>
          </Show>
          <td class="px-6 py-4 text-right font-mono" colspan="2">
            {((props.cashBalance / (props.totalValue || 1)) * 100).toFixed(1)}% of total
          </td>
        </tr>
      </Show>
      <tr class="bg-sage/20 border-t border-forest/10 text-sm">
        <td class="px-6 py-4 font-bold" colspan={props.hideFxRate ? 4 : 5}>
          {props.dynamicTotalLabel}
        </td>
        <td class="px-6 py-4 text-right font-mono font-extrabold">
          {props.formatVal(props.dynamicTotalValue)}
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex flex-col items-end">
            <span
              class="font-mono font-extrabold"
              classList={{
                "text-forest": props.dynamicPL >= 0,
                "text-red-600": props.dynamicPL < 0,
              }}
            >
              {props.dynamicPL >= 0 ? "+" : ""}
              {props.formatVal(props.dynamicPL)}
            </span>
            <span
              class="text-xs font-mono font-bold"
              classList={{
                "text-forest": props.dynamicPL >= 0,
                "text-red-600": props.dynamicPL < 0,
              }}
            >
              {formatPercent(props.dynamicPLPercent)}
            </span>
          </div>
        </td>
        <td class="px-6 py-4 text-right font-mono text-xs font-bold text-near-black">
          {((props.dynamicTotalValue / (props.totalValue || 1)) * 100).toFixed(1)}%
        </td>
      </tr>
    </tfoot>
  );
};
