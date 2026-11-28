import { For, Show } from "solid-js";
import type { PortfolioTransactionDB } from "../../../../types";
import { TradeHistoryFilters } from "./TradeHistoryFilters";
import { TradeHistoryRow } from "./TradeHistoryRow";
import type { TradeSortKey } from "./tradeHistoryHelpers";

interface TradeHistoryTableProps {
  isLoading: boolean;
  rawCount: number;
  totalProcessed: number;
  paginatedTransactions: PortfolioTransactionDB[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  searchQuery: string;
  typeFilter: string;
  sortBy: TradeSortKey;
  sortOrder: "asc" | "desc";
  expandedTxId: string | null;
  tickerLogos: Record<string, string>;
  tickerNames: Record<string, string>;
  currency: "IDR" | "USD";
  nativeCurrency: "IDR" | "USD";
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (type: string) => void;
  onSort: (key: TradeSortKey) => void;
  onToggleExpand: (id: string) => void;
  onPageChange: (page: number) => void;
  onNavigateStock: (ticker: string) => void;
}

export const TradeHistoryTable = (props: TradeHistoryTableProps) => {
  const sortIcon = (key: TradeSortKey) =>
    props.sortBy === key
      ? props.sortOrder === "asc"
        ? "expand_less"
        : "expand_more"
      : "unfold_more";

  return (
    <div class="premium-card overflow-hidden animate-fade-in-up stagger-5">
      <TradeHistoryFilters
        totalRecords={props.totalProcessed}
        currentPage={props.currentPage}
        pageSize={props.pageSize}
        searchQuery={props.searchQuery}
        typeFilter={props.typeFilter}
        onSearchChange={props.onSearchChange}
        onTypeFilterChange={props.onTypeFilterChange}
      />

      {/* Table Container */}
      <div
        class="overflow-x-auto w-full relative custom-scrollbar"
        style={{ "max-height": "650px" }}
      >
        <table class="w-full min-w-[760px] sm:min-w-[900px] border-collapse">
          <thead class="sticky-header bg-white/95 border-b border-forest/5 text-[10px] font-bold uppercase tracking-widest text-earth/65 select-none">
            <tr>
              <th class="w-1.5 py-4 px-2" />
              <th class="py-4 px-4 text-left font-bold">
                <button
                  type="button"
                  onClick={() => props.onSort("ticker")}
                  class="flex items-center gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest"
                >
                  Asset
                  <span class="material-icons text-[14px]">
                    {sortIcon("ticker")}
                  </span>
                </button>
              </th>
              <th class="py-4 px-4 text-left font-bold">
                <button
                  type="button"
                  onClick={() => props.onSort("type")}
                  class="flex items-center gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest"
                >
                  Type
                  <span class="material-icons text-[14px]">
                    {sortIcon("type")}
                  </span>
                </button>
              </th>
              <th class="py-4 px-4 text-left font-bold">
                <button
                  type="button"
                  onClick={() => props.onSort("date")}
                  class="flex items-center gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest"
                >
                  Date
                  <span class="material-icons text-[14px]">
                    {sortIcon("date")}
                  </span>
                </button>
              </th>
              <th class="py-4 px-4 text-right font-bold">
                <button
                  type="button"
                  onClick={() => props.onSort("qty")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest ml-auto"
                >
                  Shares
                  <span class="material-icons text-[14px]">
                    {sortIcon("qty")}
                  </span>
                </button>
              </th>
              <th class="py-4 px-4 text-right font-bold">
                <button
                  type="button"
                  onClick={() => props.onSort("price")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest ml-auto"
                >
                  Price/Share
                  <span class="material-icons text-[14px]">
                    {sortIcon("price")}
                  </span>
                </button>
              </th>
              <th class="py-4 px-4 text-right font-bold">
                <button
                  type="button"
                  onClick={() => props.onSort("amount")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer bg-transparent border-0 p-0 font-bold uppercase tracking-widest ml-auto"
                >
                  Total
                  <span class="material-icons text-[14px]">
                    {sortIcon("amount")}
                  </span>
                </button>
              </th>
              <th class="w-16 py-4 px-2" />
            </tr>
          </thead>

          <tbody class="divide-y divide-forest/5 bg-white">
            <Show
              when={!props.isLoading}
              fallback={
                <For each={[1, 2, 3, 4, 5]}>
                  {() => (
                    <tr class="animate-pulse">
                      <td class="w-1.5 py-5 px-2">
                        <div class="w-1 h-6 bg-sage/20 rounded-full" />
                      </td>
                      <td class="py-5 px-4">
                        <div class="h-4.5 bg-sage/20 rounded w-16" />
                      </td>
                      <td class="py-5 px-4">
                        <div class="h-4.5 bg-sage/20 rounded w-12" />
                      </td>
                      <td class="py-5 px-4">
                        <div class="h-4.5 bg-sage/20 rounded w-28" />
                      </td>
                      <td class="py-5 px-4">
                        <div class="h-4.5 bg-sage/20 rounded w-10 ml-auto" />
                      </td>
                      <td class="py-5 px-4">
                        <div class="h-4.5 bg-sage/20 rounded w-20 ml-auto" />
                      </td>
                      <td class="py-5 px-4">
                        <div class="h-4.5 bg-sage/20 rounded w-24 ml-auto" />
                      </td>
                      <td class="w-16" />
                    </tr>
                  )}
                </For>
              }
            >
              <For
                each={props.paginatedTransactions}
                fallback={
                  <tr>
                    <td
                      colspan="8"
                      class="px-8 py-16 text-center text-earth/40 italic font-outfit bg-white"
                    >
                      {props.rawCount === 0
                        ? "No transactions recorded for this portfolio."
                        : "No transactions match your search filter."}
                    </td>
                  </tr>
                }
              >
                {(tx) => (
                  <TradeHistoryRow
                    tx={tx}
                    isExpanded={props.expandedTxId === tx.id}
                    logoUrl={props.tickerLogos[tx.asset_ticker.toUpperCase()]}
                    assetName={props.tickerNames[tx.asset_ticker.toUpperCase()]}
                    currency={props.currency}
                    nativeCurrency={props.nativeCurrency}
                    onToggleExpand={props.onToggleExpand}
                    onNavigateStock={props.onNavigateStock}
                  />
                )}
              </For>
            </Show>
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <Show when={props.totalPages > 1}>
        <div class="px-6 py-4 border-t border-forest/5 flex items-center justify-between bg-white/70 font-outfit text-xs text-earth">
          <div>
            Page <b>{props.currentPage}</b> of <b>{props.totalPages}</b>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              disabled={props.currentPage === 1}
              onClick={() => props.onPageChange(Math.max(1, props.currentPage - 1))}
              class="px-3 py-1.5 rounded-lg border border-forest/10 text-forest font-bold hover:bg-forest/5 transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none active:scale-95"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={props.currentPage === props.totalPages}
              onClick={() =>
                props.onPageChange(
                  Math.min(props.totalPages, props.currentPage + 1),
                )
              }
              class="px-3 py-1.5 rounded-lg border border-forest/10 text-forest font-bold hover:bg-forest/5 transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none active:scale-95"
            >
              Next
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};
