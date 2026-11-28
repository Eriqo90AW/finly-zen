import { For, Show } from "solid-js";
import { quickPortfolioSearch, setQuickPortfolioSearch } from "../../../../store/portfolioStore";
import type { PortfolioAsset } from "../../../../types";
import { QuickPortfolioNewRowDraft } from "./QuickPortfolioNewRowDraft";
import { QuickPortfolioTableFooter } from "./QuickPortfolioTableFooter";
import { QuickPortfolioTableHeader } from "./QuickPortfolioTableHeader";
import { QuickPortfolioTableRow } from "./QuickPortfolioTableRow";
import { QuickPortfolioTableToolbar } from "./QuickPortfolioTableToolbar";
import { useQuickPortfolioTable } from "./useQuickPortfolioTable";

interface QuickPortfolioTableProps {
  assets: PortfolioAsset[];
  distinctAssetCount?: number;
  cashBalance: number;
  totalValue: number;
  initialCapital?: number;
  overallPL: number;
  overallPLPercent: number;
  currencyView: "USD" | "IDR";
  isSubmitting: boolean;
  onStartAddHolding: () => void;
  onCopyJson: () => void;
  isCopied: boolean;
  onSaveQty: (ticker: string, qty: number) => Promise<void>;
  onSavePrice: (ticker: string, price: number) => Promise<void>;
  onSaveRate: (ticker: string, rate: number) => Promise<void>;
  onDeleteHolding: (ticker: string) => void;
  onSaveCash: (newCash: number) => Promise<void>;
  onCreateNewHolding: (
    ticker: string,
    qty: number,
    price: number,
    currency: string,
    conversionRate: number,
  ) => Promise<void>;
  formatVal: (amount: number, isShort?: boolean) => string;
  formatCash: (amount: number, isShort?: boolean) => string;
  formatPrice: (amount: number) => string;
  getCategory: (ticker: string) => string;
  getCategoryIcon: (category: string) => string;
  getDisplayTicker: (ticker: string) => string;
  getUsdRate: () => number;
}

export const QuickPortfolioTable = (props: QuickPortfolioTableProps) => {
  const table = useQuickPortfolioTable(props);

  return (
    <section class="bg-card-bg rounded-premium border border-forest/10 shadow-premium flex flex-col overflow-hidden">
      <QuickPortfolioTableToolbar
        searchQuery={quickPortfolioSearch()}
        onSearchChange={setQuickPortfolioSearch}
        filterCategories={table.filterCategories()}
        selectedAssetType={table.selectedAssetType()}
        categoryCounts={table.categoryCounts()}
        onSelectAssetType={table.handleSelectAssetType}
        hideFxRate={table.hideFxRate()}
        onToggleHideFxRate={table.toggleHideFxRate}
        onStartAddHolding={props.onStartAddHolding}
        onCopyJson={props.onCopyJson}
        isCopied={props.isCopied}
      />

      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full min-w-[860px] text-left border-collapse whitespace-nowrap">
          <QuickPortfolioTableHeader
            sortBy={table.sortBy()}
            sortOrder={table.sortOrder()}
            hideFxRate={table.hideFxRate()}
            onSort={table.handleSort}
          />

          <tbody class="divide-y divide-forest/5 text-xs bg-white">
            <For each={table.sortedAssets()}>
              {(asset) => (
                <QuickPortfolioTableRow
                  asset={asset}
                  totalValue={props.totalValue}
                  initialCapital={props.initialCapital || 0}
                  hideFxRate={table.hideFxRate()}
                  isSubmitting={props.isSubmitting}
                  editingCell={table.editingCell()}
                  editValue={table.editValue()}
                  onEditInput={table.setEditValue}
                  onStartEdit={table.startEdit}
                  onSaveEdit={(ticker, field) => void table.saveEdit(ticker, field)}
                  onKeyDown={table.handleCellKeyDown}
                  onDeleteHolding={props.onDeleteHolding}
                  formatVal={props.formatVal}
                  formatPrice={props.formatPrice}
                  getCategory={props.getCategory}
                  getDisplayTicker={props.getDisplayTicker}
                />
              )}
            </For>

            <QuickPortfolioNewRowDraft
              draft={table.newRowDraft()}
              hideFxRate={table.hideFxRate()}
              isSubmitting={props.isSubmitting}
              getCategory={props.getCategory}
              getCategoryIcon={props.getCategoryIcon}
              getUsdRate={props.getUsdRate}
              onOpenDraft={table.openNewRowDraft}
              onUpdateDraft={table.updateNewRowDraft}
              onCancelDraft={table.cancelNewRowDraft}
              onCommitDraft={table.commitNewRowDraft}
            />

            <Show when={table.sortedAssets().length === 0 && !table.newRowDraft()}>
              <tr>
                <td colspan={table.hideFxRate() ? 7 : 8} class="text-center py-12 text-earth">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <span class="material-icons text-3xl text-earth/40">filter_alt_off</span>
                    <p class="font-outfit text-xs font-semibold">
                      {quickPortfolioSearch()
                        ? `No assets found matching "${quickPortfolioSearch()}"${table.selectedAssetType() !== "ALL" ? ` in ${table.selectedAssetType()}` : ""}`
                        : `No assets found in ${table.selectedAssetType()}`}
                    </p>
                    <Show when={table.selectedAssetType() !== "ALL" || quickPortfolioSearch()}>
                      <button
                        type="button"
                        onClick={table.resetFilters}
                        class="text-[11px] font-bold text-forest hover:underline cursor-pointer bg-transparent border-0 mt-1"
                      >
                        Reset filters
                      </button>
                    </Show>
                  </div>
                </td>
              </tr>
            </Show>
          </tbody>

          <QuickPortfolioTableFooter
            isFiltered={table.isFiltered()}
            hideFxRate={table.hideFxRate()}
            cashBalance={props.cashBalance}
            totalValue={props.totalValue}
            currencyView={props.currencyView}
            isCashEditing={table.isCashEditing()}
            editValue={table.editValue()}
            onEditInput={table.setEditValue}
            onStartCashEdit={table.startCashEdit}
            onSaveCashEdit={() => void table.saveCashEdit()}
            onCashKeyDown={table.handleCashKeyDown}
            dynamicTotalLabel={table.dynamicTotalLabel()}
            dynamicTotalValue={table.dynamicTotalValue()}
            dynamicPL={table.dynamicPL()}
            dynamicPLPercent={table.dynamicPLPercent()}
            formatVal={props.formatVal}
            formatCash={props.formatCash}
          />
        </table>
      </div>

      <div class="h-2 bg-transparent" />
    </section>
  );
};
