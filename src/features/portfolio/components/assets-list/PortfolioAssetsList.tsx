import { useNavigate } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";
import { portfolioState } from "../../../../store/portfolioStore";
import type { PortfolioAsset } from "../../../../types";
import { SetTargetAllocationModal } from "../modals/SetTargetModal";
import { AssetsListFilterMenu } from "./AssetsListFilterMenu";
import { AssetsListHeader } from "./AssetsListHeader";
import { AssetsListRow } from "./AssetsListRow";
import {
  type AssetSortKey,
  filterPortfolioAssets,
  getSavedSortBy,
  getSavedSortOrder,
  type SortOrder,
  saveAssetSort,
  sortPortfolioAssets,
} from "./assetsListHelpers";

interface PortfolioAssetsListProps {
  portfolioId: string;
  assets: PortfolioAsset[];
  portfolioNativeCurrency?: "IDR" | "USD";
  onSelectAsset: (asset: PortfolioAsset) => void;
  onDeleteAsset: (assetId: string) => void;
}

export const PortfolioAssetsList = (props: PortfolioAssetsListProps) => {
  const navigate = useNavigate();
  const currency = () => portfolioState.currencyView;
  const [targetModalOpen, setTargetModalOpen] = createSignal(false);
  const [selectedAssetForTarget, setSelectedAssetForTarget] =
    createSignal<PortfolioAsset | null>(null);

  const [activeFilters, setActiveFilters] = createSignal<Set<string>>(
    new Set(),
  );
  const [filterDropdownOpen, setFilterDropdownOpen] = createSignal(false);

  const [sortBy, setSortBy] = createSignal<AssetSortKey>(getSavedSortBy());
  const [sortOrder, setSortOrder] = createSignal<SortOrder>(
    getSavedSortOrder(),
  );

  const toggleFilter = (filter: string) => {
    const next = new Set(activeFilters());
    if (next.has(filter)) {
      next.delete(filter);
    } else {
      next.add(filter);
    }
    setActiveFilters(next);
  };

  const handleSort = (key: AssetSortKey) => {
    const nextOrder: SortOrder =
      sortBy() === key
        ? sortOrder() === "asc"
          ? "desc"
          : "asc"
        : key === "ticker"
          ? "asc"
          : "desc";

    setSortBy(key);
    setSortOrder(nextOrder);
    saveAssetSort(key, nextOrder);
  };

  const sortedAssets = createMemo(() =>
    sortPortfolioAssets(props.assets, sortBy(), sortOrder()),
  );

  const filteredAssets = createMemo(() =>
    filterPortfolioAssets(sortedAssets(), activeFilters()),
  );

  const openTargetModal = (asset: PortfolioAsset) => {
    setSelectedAssetForTarget(asset);
    setTargetModalOpen(true);
  };

  return (
    <>
      <div class="premium-card overflow-hidden cursor-default">
        <div class="px-8 py-6 border-b border-forest/5 flex justify-between items-center bg-white">
          <h4 class="font-outfit font-bold text-forest text-lg">Assets List</h4>
          <AssetsListFilterMenu
            activeFilters={activeFilters()}
            isOpen={filterDropdownOpen()}
            onToggleOpen={() => setFilterDropdownOpen(!filterDropdownOpen())}
            onClose={() => setFilterDropdownOpen(false)}
            onToggleFilter={toggleFilter}
            onClearFilters={() => {
              setActiveFilters(new Set<string>());
              setFilterDropdownOpen(false);
            }}
          />
        </div>

        <div class="flex flex-col min-w-[900px]">
          <AssetsListHeader
            sortBy={sortBy()}
            sortOrder={sortOrder()}
            onSort={handleSort}
          />

          <div class="flex flex-col">
            <Show
              when={!portfolioState.isLoading}
              fallback={
                <For each={[1, 2, 3]}>
                  {() => (
                    <div class="flex items-center px-8 py-5 border-b border-forest/5 animate-pulse">
                      <div class="w-1 mr-4 h-12 bg-sage/20 rounded-full" />
                      <div class="flex-[2] pr-4 flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-sage/20" />
                        <div class="flex-1 space-y-2">
                          <div class="h-4 bg-sage/20 rounded w-2/3" />
                          <div class="h-3 bg-sage/20 rounded w-1/3" />
                        </div>
                      </div>
                      <div class="flex-1 text-right space-y-2 pr-4">
                        <div class="h-4 bg-sage/20 rounded w-3/4 ml-auto" />
                        <div class="h-3 bg-sage/20 rounded w-1/2 ml-auto" />
                      </div>
                      <div class="flex-1 text-right space-y-2 pr-4">
                        <div class="h-4 bg-sage/20 rounded w-2/3 ml-auto" />
                        <div class="h-3 bg-sage/20 rounded w-1/2 ml-auto" />
                      </div>
                      <div class="flex-1 text-right space-y-2 pr-4">
                        <div class="h-4 bg-sage/20 rounded w-3/4 ml-auto" />
                        <div class="h-3 bg-sage/20 rounded w-1/2 ml-auto" />
                      </div>
                      <div class="w-32 flex justify-end">
                        <div class="h-4 bg-sage/20 rounded w-12" />
                      </div>
                      <div class="w-12" />
                    </div>
                  )}
                </For>
              }
            >
              <For
                each={filteredAssets()}
                fallback={
                  <div class="px-8 py-16 text-center text-earth/40 italic font-outfit">
                    {activeFilters().size > 0
                      ? "No assets match the active filters."
                      : 'No assets in this portfolio yet. Click "+ Add Assets" at the top to start.'}
                  </div>
                }
              >
                {(asset) => (
                  <AssetsListRow
                    asset={asset}
                    currency={currency()}
                    portfolioNativeCurrency={props.portfolioNativeCurrency}
                    onSelect={props.onSelectAsset}
                    onNavigateStock={(ticker) => navigate(`/stock/${ticker}`)}
                    onOpenTargetModal={openTargetModal}
                    onDelete={props.onDeleteAsset}
                  />
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>

      <SetTargetAllocationModal
        isOpen={targetModalOpen()}
        onClose={() => {
          setTargetModalOpen(false);
          setSelectedAssetForTarget(null);
        }}
        portfolioId={props.portfolioId}
        assetId={selectedAssetForTarget()?.id || ""}
        assetTicker={selectedAssetForTarget()?.ticker || ""}
        currentTargetAllocation={
          selectedAssetForTarget()?.targetAllocation || 0
        }
      />
    </>
  );
};
