import { createSignal, For, Show, createMemo } from "solid-js";
import { formatPortfolioValue } from "../../../utils/format";
import { portfolioState } from "../../../store/portfolioStore";
import { SetTargetAllocationModal } from "../modals/SetTargetModal";
import { getAssetColor } from "../../../utils/colors";
import { getMarketStatus } from "../../../utils/marketTime";
import type { PortfolioAsset } from "../../../types";
import { useNavigate } from "@solidjs/router";

interface PortfolioAssetsListProps {
  portfolioId: string;
  assets: PortfolioAsset[];
  portfolioNativeCurrency?: 'IDR' | 'USD';
  onSelectAsset: (asset: PortfolioAsset) => void;
  onAddAsset: () => void;
  onDeleteAsset: (assetId: string) => void;
}

export const PortfolioAssetsList = (props: PortfolioAssetsListProps) => {
  const navigate = useNavigate();
  const currency = () => portfolioState.currencyView;
  const [targetModalOpen, setTargetModalOpen] = createSignal(false);
  const [selectedAssetForTarget, setSelectedAssetForTarget] =
    createSignal<PortfolioAsset | null>(null);

  // Helper to load sorting state safely from localStorage
  const getSavedSortBy = ():
    | "ticker"
    | "value"
    | "price"
    | "gain"
    | "allocation" => {
    try {
      return (
        (localStorage.getItem("finly_zen_assets_sort_by") as any) || "value"
      );
    } catch (e) {
      return "value";
    }
  };

  const getSavedSortOrder = (): "asc" | "desc" => {
    try {
      return (
        (localStorage.getItem("finly_zen_assets_sort_order") as any) || "desc"
      );
    } catch (e) {
      return "desc";
    }
  };

  // Sorting state for the assets list columns
  const [sortBy, setSortBy] = createSignal<
    "ticker" | "value" | "price" | "gain" | "allocation"
  >(getSavedSortBy());
  const [sortOrder, setSortOrder] = createSignal<"asc" | "desc">(
    getSavedSortOrder(),
  );

  // Handle column header clicks
  const handleSort = (
    key: "ticker" | "value" | "price" | "gain" | "allocation",
  ) => {
    const nextOrder =
      sortBy() === key
        ? sortOrder() === "asc"
          ? "desc"
          : "asc"
        : key === "ticker"
          ? "asc"
          : "desc";

    setSortBy(key);
    setSortOrder(nextOrder);

    try {
      localStorage.setItem("finly_zen_assets_sort_by", key);
      localStorage.setItem("finly_zen_assets_sort_order", nextOrder);
    } catch (e) {
      console.warn("localStorage sorting persistence failed:", e);
    }
  };

  // Reactively compute the sorted asset list
  const sortedAssets = createMemo(() => {
    const list = [...props.assets];
    const key = sortBy();
    const order = sortOrder();
    const { session } = getMarketStatus();

    const getActivePrice = (asset: PortfolioAsset) => {
      if (
        session === "Pre-market" &&
        asset.preMarketPrice != null &&
        !isNaN(asset.preMarketPrice)
      ) {
        return asset.preMarketPrice;
      } else if (
        session === "After-hours" &&
        asset.postMarketPrice != null &&
        !isNaN(asset.postMarketPrice)
      ) {
        return asset.postMarketPrice;
      }
      return asset.currentPrice ?? 0;
    };

    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (key === "ticker") {
        valA = a.ticker.toLowerCase();
        valB = b.ticker.toLowerCase();
      } else if (key === "value") {
        const priceA = getActivePrice(a);
        const priceB = getActivePrice(b);
        valA = a.totalShares * priceA;
        valB = b.totalShares * priceB;
      } else if (key === "price") {
        valA = getActivePrice(a);
        valB = getActivePrice(b);
      } else if (key === "gain") {
        const priceA = getActivePrice(a);
        const priceB = getActivePrice(b);
        const valueA = a.totalShares * priceA;
        const valueB = b.totalShares * priceB;
        const costBasisA = a.totalShares * a.averagePrice;
        const costBasisB = b.totalShares * b.averagePrice;
        valA = valueA - costBasisA;
        valB = valueB - costBasisB;
      } else if (key === "allocation") {
        // Sorting by allocation is equivalent to sorting by value
        const priceA = getActivePrice(a);
        const priceB = getActivePrice(b);
        valA = a.totalShares * priceA;
        valB = b.totalShares * priceB;
      }

      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  });

  const calculateGainPercentage = (asset: PortfolioAsset) => {
    const costBasis = asset.totalShares * asset.averagePrice;
    if (costBasis === 0) return 0;
    return (asset.totalGainLoss / costBasis) * 100;
  };

  const openTargetModal = (asset: PortfolioAsset) => {
    setSelectedAssetForTarget(asset);
    setTargetModalOpen(true);
  };

  const MiniDonut = (donutProps: { percentage: number; color: string }) => {
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
      circumference - (donutProps.percentage / 100) * circumference;

    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        class="transform -rotate-90"
      >
        <circle
          cx="12"
          cy="12"
          r={radius}
          stroke="currentColor"
          stroke-width="3.5"
          fill="transparent"
          class="text-forest/10"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          stroke={donutProps.color}
          stroke-width="3.5"
          fill="transparent"
          stroke-dasharray={`${circumference}`}
          stroke-dashoffset={`${strokeDashoffset}`}
          stroke-linecap="round"
          class="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
    );
  };

  return (
    <>
      <div class="premium-card overflow-hidden cursor-default">
        <div class="px-8 py-6 border-b border-forest/5 flex justify-between items-center bg-white">
          <h4 class="font-outfit font-bold text-forest text-lg">Assets</h4>
          <button
            onClick={() => props.onAddAsset()}
            class="px-4 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest/90 transition-[background-color,box-shadow] duration-200 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
          >
            <span class="material-icons text-sm">add</span>
            ADD ASSET
          </button>
        </div>

        <div class="flex flex-col min-w-[900px]">
          {/* Header Row */}
          <div class="flex items-center px-8 py-4 border-b border-forest/5 text-[11px] font-bold uppercase tracking-widest text-earth/60 group/header">
            {/* Spacer for the vertical bar */}
            <div class="w-1 mr-4" />

            <button
              onClick={() => handleSort("ticker")}
              class="flex-[2] min-w-0 flex items-center gap-1 hover:text-forest transition-colors cursor-pointer uppercase text-left font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
            >
              Asset
              <span
                class={`material-icons !text-[16px] transition-all duration-200 ${
                  sortBy() === "ticker"
                    ? "text-forest font-bold"
                    : "text-earth/20 opacity-0 group-hover/header:opacity-100"
                }`}
              >
                {sortBy() === "ticker" && sortOrder() === "asc"
                  ? "expand_less"
                  : "expand_more"}
              </span>
            </button>

            <button
              onClick={() => handleSort("value")}
              class="flex-1 flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
            >
              <span
                class={`material-icons !text-[16px] transition-all duration-200 ${
                  sortBy() === "value"
                    ? "text-forest font-bold"
                    : "text-earth/20 opacity-0 group-hover/header:opacity-100"
                }`}
              >
                {sortBy() === "value" && sortOrder() === "asc"
                  ? "expand_less"
                  : "expand_more"}
              </span>
              Value
            </button>

            <button
              onClick={() => handleSort("price")}
              class="flex-1 flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
            >
              <span
                class={`material-icons !text-[16px] transition-all duration-200 ${
                  sortBy() === "price"
                    ? "text-forest font-bold"
                    : "text-earth/20 opacity-0 group-hover/header:opacity-100"
                }`}
              >
                {sortBy() === "price" && sortOrder() === "asc"
                  ? "expand_less"
                  : "expand_more"}
              </span>
              Price / Avg
            </button>

            <button
              onClick={() => handleSort("gain")}
              class="flex-1 flex justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
            >
              <span
                class={`material-icons !text-[16px] transition-all duration-200 ${
                  sortBy() === "gain"
                    ? "text-forest font-bold"
                    : "text-earth/20 opacity-0 group-hover/header:opacity-100"
                }`}
              >
                {sortBy() === "gain" && sortOrder() === "asc"
                  ? "expand_less"
                  : "expand_more"}
              </span>
              Total Gain
            </button>

            <button
              onClick={() => handleSort("allocation")}
              class="w-32 flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
            >
              <span
                class={`material-icons !text-[16px] transition-all duration-200 ${
                  sortBy() === "allocation"
                    ? "text-forest font-bold"
                    : "text-earth/20 opacity-0 group-hover/header:opacity-100"
                }`}
              >
                {sortBy() === "allocation" && sortOrder() === "asc"
                  ? "expand_less"
                  : "expand_more"}
              </span>
              Allocation
            </button>

            <div class="w-12" />
          </div>

          {/* Assets List */}
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
                each={sortedAssets()}
                fallback={
                  <div class="px-8 py-16 text-center text-earth/40 italic font-outfit">
                    No assets in this portfolio yet. Click "+ Add Asset" to
                    start.
                  </div>
                }
              >
                {(asset) => {
                  const assetColor = getAssetColor(asset.ticker);

                  const { session } = getMarketStatus();
                  const activePrice = (() => {
                    if (
                      session === "Pre-market" &&
                      asset.preMarketPrice != null &&
                      !isNaN(asset.preMarketPrice)
                    ) {
                      return asset.preMarketPrice;
                    } else if (
                      session === "After-hours" &&
                      asset.postMarketPrice != null &&
                      !isNaN(asset.postMarketPrice)
                    ) {
                      return asset.postMarketPrice;
                    }
                    return asset.currentPrice ?? 0;
                  })();

                  const costBasis = asset.totalShares * asset.averagePrice;
                  const effectiveCurrentValue = asset.totalShares * activePrice;
                  const effectiveTotalGainLoss =
                    effectiveCurrentValue - costBasis;
                  const gainPercent =
                    costBasis === 0
                      ? 0
                      : (effectiveTotalGainLoss / costBasis) * 100;
                  const isPositive = effectiveTotalGainLoss >= 0;

                  return (
                    <div
                      onClick={() => props.onSelectAsset(asset)}
                      class="group flex items-center px-8 py-5 border-b border-forest/5 hover:bg-earth/5 transition-colors duration-200 cursor-pointer relative"
                    >
                      <div
                        class="absolute left-0 top-0 bottom-0 w-1 transition-transform duration-200 group-hover:scale-x-[1.5] origin-left"
                        style={{ "background-color": assetColor }}
                      />

                      {/* Name Column */}
                      <div class="flex-[2] pr-4 flex items-center gap-4 min-w-0">
                        <Show
                          when={asset.logoUrl}
                          fallback={
                            <div
                              class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                              style={{ "background-color": assetColor }}
                            >
                              {asset.ticker.charAt(0)}
                            </div>
                          }
                        >
                          {(logoUrl) => {
                            const [hasError, setHasError] = createSignal(false);
                            return (
                              <div
                                class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden"
                                style={{
                                  "background-color": hasError()
                                    ? assetColor
                                    : "#ffffff",
                                }}
                              >
                                <Show
                                  when={!hasError()}
                                  fallback={
                                    <span>{asset.ticker.charAt(0)}</span>
                                  }
                                >
                                  <img
                                    src={logoUrl()}
                                    alt={asset.ticker}
                                    class="w-full h-full object-contain p-1 bg-white"
                                    onError={() => setHasError(true)}
                                  />
                                </Show>
                              </div>
                            );
                          }}
                        </Show>
                        <div class="flex flex-col min-w-0">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/stock/${asset.ticker}`);
                            }}
                            class="font-outfit font-bold text-forest text-base leading-tight group-hover:text-spring transition-colors hover:underline cursor-pointer"
                          >
                            {asset.ticker}
                          </span>
                          <span class="text-xs text-earth/60 truncate max-w-[180px]">
                            {asset.name}
                          </span>
                        </div>
                      </div>

                      {/* Value Column */}
                      <div class="flex-1 flex flex-col items-end gap-0.5">
                        <span class="font-outfit font-bold text-forest text-base leading-tight">
                          {formatPortfolioValue(
                            effectiveCurrentValue,
                            currency(),
                            false,
                            props.portfolioNativeCurrency,
                          )}
                        </span>
                        <span class="text-[11px] text-earth/60 font-medium">
                          {formatPortfolioValue(costBasis, currency(), false, props.portfolioNativeCurrency)}
                        </span>
                      </div>

                      {/* Price / Avg Column */}
                      <div class="flex-1 flex flex-col items-end gap-0.5">
                        <span class="font-outfit font-medium text-forest text-sm">
                          {formatPortfolioValue(activePrice, currency(), false, props.portfolioNativeCurrency)}
                        </span>
                        <span class="text-[11px] text-earth/60 font-medium">
                          {formatPortfolioValue(asset.averagePrice, currency(), false, props.portfolioNativeCurrency)}
                        </span>
                      </div>

                      {/* Gain Column */}
                      <div class="flex-1 flex flex-col items-end gap-0.5">
                        <span
                          class={`font-outfit font-bold text-sm ${isPositive ? "text-emerald-600" : "text-rose-500"}`}
                        >
                          {isPositive ? "+" : ""}
                          {formatPortfolioValue(
                            effectiveTotalGainLoss,
                            currency(),
                            false,
                            props.portfolioNativeCurrency,
                          )}
                        </span>
                        <div
                          class={`flex items-center text-[11px] font-bold ${isPositive ? "text-emerald-600/80" : "text-rose-500/80"}`}
                        >
                          <span class="material-icons !text-[16px]">
                            {isPositive ? "arrow_drop_up" : "arrow_drop_down"}
                          </span>
                          {Math.abs(gainPercent).toFixed(2)}%
                        </div>
                      </div>

                      {/* Allocation Column */}
                      <div class="w-32 flex justify-end items-center gap-3 relative">
                        <MiniDonut
                          percentage={asset.actualAllocation}
                          color={assetColor}
                        />
                        <div class="flex flex-col items-end">
                          <span class="font-outfit text-forest font-bold text-sm">
                            {asset.actualAllocation.toFixed(1)}%
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTargetModal(asset);
                            }}
                            class="flex items-center gap-0.5 font-outfit text-earth/60 text-xs font-medium bg-transparent cursor-pointer hover:underline"
                            title="Set Target Allocation"
                          >
                            <span>{asset.targetAllocation.toFixed(1)}%</span>
                          </button>
                        </div>
                      </div>

                      {/* Action Column */}
                      <div class="w-12 flex justify-end items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onDeleteAsset(asset.id);
                          }}
                          class="opacity-0 group-hover:opacity-100 transition-opacity text-earth/20 hover:text-rose-500 pt-1.5 px-1 hover:bg-rose-50 rounded-md cursor-pointer"
                          title="Delete Portfolio"
                        >
                          <span class="material-icons text-base">
                            delete_outline
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                }}
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
