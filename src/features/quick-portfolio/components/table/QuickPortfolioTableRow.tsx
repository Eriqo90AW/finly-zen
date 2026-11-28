import { Show } from "solid-js";
import { AssetLogo } from "../../../../components/common/AssetLogo";
import type { PortfolioAsset } from "../../../../types";
import { formatPercent } from "../../../../utils/format";
import type { EditableHoldingField, EditingCell } from "../../types";
import { QuickPortfolioInlineCell } from "./QuickPortfolioInlineCell";

interface QuickPortfolioTableRowProps {
  asset: PortfolioAsset;
  totalValue: number;
  initialCapital: number;
  hideFxRate: boolean;
  isSubmitting: boolean;
  editingCell: EditingCell | null;
  editValue: string;
  onEditInput: (val: string) => void;
  onStartEdit: (ticker: string, field: EditableHoldingField, currentVal: number) => void;
  onSaveEdit: (ticker: string, field: EditableHoldingField) => void;
  onKeyDown: (e: KeyboardEvent, ticker: string, field: EditableHoldingField) => void;
  onDeleteHolding: (ticker: string) => void;
  formatVal: (amount: number, isShort?: boolean) => string;
  formatPrice: (amount: number) => string;
  getCategory: (ticker: string) => string;
  getDisplayTicker: (ticker: string) => string;
}

export const QuickPortfolioTableRow = (props: QuickPortfolioTableRowProps) => {
  const category = () => props.getCategory(props.asset.ticker);
  const isEditing = (field: EditableHoldingField) =>
    props.editingCell?.ticker === props.asset.ticker && props.editingCell?.field === field;

  const allocationStats = () => {
    const mktAlloc = (props.asset.currentValue / (props.totalValue || 1)) * 100;
    const costVal = props.asset.currentValue - props.asset.totalGainLoss;
    const costAlloc = (costVal / (props.initialCapital || 1)) * 100;
    const drift = mktAlloc - costAlloc;
    return { mktAlloc, costAlloc, drift, isPos: drift >= 0 };
  };

  return (
    <tr class="hover:bg-sage/10 transition-colors group">
      {/* Asset Column */}
      <td class="px-6 py-4 border-r border-transparent group-hover:border-forest/5 transition-colors overflow-hidden max-w-[320px]">
        <div class="flex items-center gap-3">
          <AssetLogo
            ticker={props.asset.ticker}
            logoUrl={props.asset.logoUrl}
            name={props.asset.name}
            category={category()}
            size="sm"
            class="w-7 h-7 rounded-lg bg-sage shadow-xs border border-forest/10"
          />
          <div class="min-w-0">
            <div class="font-bold text-near-black truncate">
              {props.asset.name || props.asset.ticker}
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[10px] text-earth uppercase font-semibold">
                {props.getDisplayTicker(props.asset.ticker)}
              </span>
              <span class="px-1.5 py-0.25 rounded bg-sage/50 text-forest text-[8px] font-bold uppercase tracking-wider">
                {category()}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Quantity Column (Editable) */}
      <QuickPortfolioInlineCell
        isEditing={isEditing("qty")}
        editValue={props.editValue}
        onEditInput={props.onEditInput}
        onStartEdit={() => props.onStartEdit(props.asset.ticker, "qty", props.asset.totalShares)}
        onSave={() => props.onSaveEdit(props.asset.ticker, "qty")}
        onKeyDown={(e) => props.onKeyDown(e, props.asset.ticker, "qty")}
        displayClass="px-6 py-4 text-right font-mono text-near-black font-semibold hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
      >
        {Number.parseFloat(props.asset.totalShares.toFixed(8)).toString()}
      </QuickPortfolioInlineCell>

      {/* Avg Buy Price Column (Editable) */}
      <QuickPortfolioInlineCell
        isEditing={isEditing("avgPrice")}
        editValue={props.editValue}
        onEditInput={props.onEditInput}
        onStartEdit={() =>
          props.onStartEdit(props.asset.ticker, "avgPrice", props.asset.averagePrice)
        }
        onSave={() => props.onSaveEdit(props.asset.ticker, "avgPrice")}
        onKeyDown={(e) => props.onKeyDown(e, props.asset.ticker, "avgPrice")}
        displayClass="px-6 py-4 text-right font-mono text-earth hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
      >
        {props.formatPrice(props.asset.averagePrice)}
      </QuickPortfolioInlineCell>

      {/* Conversion Rate & Currency Column (Editable) */}
      <Show when={!props.hideFxRate}>
        <QuickPortfolioInlineCell
          isEditing={isEditing("conversionRate")}
          editValue={props.editValue}
          onEditInput={props.onEditInput}
          onStartEdit={() =>
            props.onStartEdit(
              props.asset.ticker,
              "conversionRate",
              props.asset.conversionRate ?? 1,
            )
          }
          onSave={() => props.onSaveEdit(props.asset.ticker, "conversionRate")}
          onKeyDown={(e) => props.onKeyDown(e, props.asset.ticker, "conversionRate")}
          displayClass="px-6 py-4 text-right font-mono text-earth hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
          inputClass="w-16 bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
          suffix={props.asset.currency || "USD"}
        >
          <span class="font-bold">{(props.asset.conversionRate ?? 1).toFixed(2)}</span>
          <span class="text-[9px] text-earth/50 font-bold ml-1.5 uppercase tracking-wider">
            {props.asset.currency || "USD"}
          </span>
        </QuickPortfolioInlineCell>
      </Show>

      {/* Current Price Column */}
      <td class="px-6 py-4 text-right font-mono text-near-black font-bold border-r border-transparent group-hover:border-forest/5 transition-colors">
        {props.formatPrice(props.asset.currentPrice)}
      </td>

      {/* Total Value Column */}
      <td class="px-6 py-4 text-right font-mono text-near-black font-bold border-r border-transparent group-hover:border-forest/5 transition-colors">
        {props.formatVal(props.asset.currentValue)}
      </td>

      {/* P/L ($/%) Column */}
      <td class="px-6 py-4 text-right border-r border-transparent group-hover:border-forest/5 transition-colors">
        <div class="flex flex-col items-end">
          <span
            class="font-mono font-bold"
            classList={{
              "text-forest": props.asset.totalGainLoss >= 0,
              "text-red-600": props.asset.totalGainLoss < 0,
            }}
          >
            {props.asset.totalGainLoss >= 0 ? "+" : ""}
            {props.formatVal(props.asset.totalGainLoss)}
          </span>
          <span
            class="text-[10px] font-mono font-bold"
            classList={{
              "text-forest": props.asset.totalGainLoss >= 0,
              "text-red-600": props.asset.totalGainLoss < 0,
            }}
          >
            {props.asset.averagePrice > 0
              ? formatPercent(
                  props.asset.totalGainLoss / (props.asset.totalShares * props.asset.averagePrice),
                )
              : "0.00%"}
          </span>
        </div>
      </td>

      {/* Allocation Column */}
      <td class="pl-6 pr-2 py-4 text-right">
        <div class="flex items-center justify-end">
          <div class="flex flex-col items-end flex-1">
            <div class="w-full bg-sage/60 rounded-full h-1.5 mb-1 overflow-hidden border border-forest/30">
              <div
                class="bg-forest h-1.5 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, allocationStats().mktAlloc))}%` }}
              />
            </div>
            <div class="flex items-center justify-between w-full text-[10px] font-mono leading-tight">
              <span class="font-bold text-near-black">
                {allocationStats().mktAlloc.toFixed(1)}%
              </span>
              <span
                class={`text-[8.5px] px-1 py-0.2 rounded-full font-bold font-mono ${
                  allocationStats().isPos
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-rose-500/10 text-rose-600"
                }`}
                title="Allocation Drift (Market % − Cost %)"
              >
                {allocationStats().isPos ? "+" : ""}
                {allocationStats().drift.toFixed(1)}%
              </span>
            </div>
            <div class="text-[9px] text-earth/60 font-mono mt-0.5">
              {allocationStats().costAlloc.toFixed(1)}% Cost
            </div>
          </div>
          <button
            type="button"
            onClick={() => props.onDeleteHolding(props.asset.ticker)}
            disabled={props.isSubmitting}
            class="w-5 h-5 flex items-start justify-start opacity-0 group-hover:opacity-100 transition-opacity text-earth/40 hover:text-red-500 cursor-pointer disabled:cursor-not-allowed shrink-0 border-0 bg-transparent ml-1.5"
            title="Remove holding"
          >
            <span class="material-icons !text-sm">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
};
