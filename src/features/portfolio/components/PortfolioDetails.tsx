import { useNavigate } from "@solidjs/router";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import { createMemo, createSignal, Show } from "solid-js";
import { deleteAssetFromPortfolio } from "../../../store/portfolioStore";
import type { Portfolio, PortfolioAsset } from "../../../types";
import { AssetDetailsSlideOver } from "./asset-details/AssetDetailsSlideOver";
import { PortfolioAssetsList } from "./assets-list/PortfolioAssetsList";
import { AddAssetModal } from "./modals/add-asset/AddAssetModal";
import { ManageCapitalModal } from "./modals/ManageCapitalModal";
import { PortfolioCharts } from "./PortfolioAllocation";
import { PortfolioHero } from "./PortfolioHero";
import { PerformanceHistoryChart } from "./performance/PortfolioPerformance";

interface PortfolioDetailsProps {
  portfolio?: Portfolio;
}

export const PortfolioDetails = (props: PortfolioDetailsProps) => {
  const navigate = useNavigate();
  const [selectedAsset, setSelectedAsset] =
    createSignal<PortfolioAsset | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = createSignal(false);
  const [showAddCapitalModal, setShowAddCapitalModal] = createSignal(false);
  const [tradeType, setTradeType] = createSignal<"BUY" | "SELL" | undefined>(
    undefined,
  );
  const [tradeTicker, setTradeTicker] = createSignal<string | undefined>(
    undefined,
  );

  const assetTransactions = createMemo(() => {
    const asset = selectedAsset();
    if (!asset || !props.portfolio) return [];
    return (props.portfolio.transactions || []).filter(
      (t) => t.ticker === asset.ticker,
    );
  });

  const handleDeleteAsset = (assetId: string, closeSlideOver = false) => {
    if (!props.portfolio) return;
    if (
      confirm(
        "Are you sure you want to delete this asset? All related transactions will be removed and cash will be adjusted.",
      )
    ) {
      deleteAssetFromPortfolio(props.portfolio.id, assetId);
      if (closeSlideOver) {
        setSelectedAsset(null);
      }
    }
  };

  return (
    <>
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/portfolio")}
            class="w-10 h-10 rounded-xl hover:bg-forest/5 flex items-center justify-center text-forest transition-colors duration-200 border border-forest/10 cursor-pointer"
          >
            <ChevronLeftIcon />
          </button>
          <div>
            <Show
              when={props.portfolio}
              fallback={
                <div class="h-9 bg-sage/20 rounded w-48 animate-pulse mb-1.5" />
              }
            >
              {(portfolio) => (
                <h1 class="text-4xl font-cormorant text-forest font-bold tracking-tight mb-1">
                  {portfolio().name}
                </h1>
              )}
            </Show>
            <p class="text-earth font-outfit tracking-wide uppercase text-[10px] font-bold">
              Detailed Portfolio Breakdown
            </p>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            type="button"
            onClick={() => {
              if (props.portfolio) {
                navigate(`/portfolio/${props.portfolio.id}/trades`);
              }
            }}
            disabled={!props.portfolio}
            class={`flex items-center gap-2 bg-white text-forest border border-forest/10 px-6 py-3 rounded-2xl font-outfit font-bold shadow-sm hover:bg-spring/5 transition-color duration-100 cursor-pointer w-fit ${
              !props.portfolio ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span class="material-icons text-lg">receipt_long</span>
            Trade History
          </button>

          <button
            type="button"
            onClick={() => {
              setTradeType(undefined);
              setTradeTicker(undefined);
              setShowAddAssetModal(true);
            }}
            disabled={!props.portfolio}
            class={`flex items-center gap-2 bg-forest text-white px-6 py-3 rounded-2xl font-outfit font-bold shadow-xl hover:brightness-90 transition-opacity duration-200 cursor-pointer w-fit ${
              !props.portfolio ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span class="material-icons text-lg">add_circle</span>
            Add Assets
          </button>

          <button
            type="button"
            onClick={() => setShowAddCapitalModal(true)}
            disabled={!props.portfolio}
            class={`flex items-center gap-2 bg-white text-forest border border-forest/10 px-6 py-3 rounded-2xl font-outfit font-bold shadow-sm hover:bg-spring/5 transition-color duration-100 cursor-pointer w-fit ${
              !props.portfolio ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span class="material-icons text-lg">account_balance</span>
            Add Capital
          </button>
        </div>
      </div>

      <PortfolioHero portfolio={props.portfolio} />
      <div class="grid grid-cols-12 gap-6 mb-8">
        <PortfolioCharts portfolio={props.portfolio} />
        <div class="premium-card p-6 col-span-8 h-[480px] flex flex-col cursor-default">
          <PerformanceHistoryChart
            history={props.portfolio?.history}
            nativeCurrency={props.portfolio?.nativeCurrency}
            priceCurrency={props.portfolio?.price_currency}
            initialCapital={props.portfolio?.initialCapital}
            totalValue={props.portfolio?.totalValue}
          />
        </div>
      </div>
      <PortfolioAssetsList
        portfolioId={props.portfolio?.id || ""}
        assets={props.portfolio?.assets || []}
        portfolioNativeCurrency={props.portfolio?.nativeCurrency}
        onSelectAsset={(a) => setSelectedAsset(a)}
        onDeleteAsset={(assetId) => handleDeleteAsset(assetId, false)}
      />

      <AssetDetailsSlideOver
        asset={selectedAsset()}
        transactions={assetTransactions()}
        isOpen={Boolean(selectedAsset())}
        onClose={() => setSelectedAsset(null)}
        portfolioTotalValue={props.portfolio?.totalValue ?? 0}
        portfolioId={props.portfolio?.id ?? ""}
        portfolioNativeCurrency={props.portfolio?.nativeCurrency}
        onTrade={(type, ticker) => {
          setTradeType(type);
          setTradeTicker(ticker);
          setShowAddAssetModal(true);
        }}
        onDeleteAsset={(assetId) => handleDeleteAsset(assetId, true)}
      />

      <AddAssetModal
        isOpen={showAddAssetModal() && Boolean(props.portfolio)}
        onClose={() => setShowAddAssetModal(false)}
        portfolioId={props.portfolio?.id || ""}
        assets={props.portfolio?.assets || []}
        initialType={tradeType()}
        initialTicker={tradeTicker()}
      />

      <ManageCapitalModal
        isOpen={showAddCapitalModal() && Boolean(props.portfolio)}
        onClose={() => setShowAddCapitalModal(false)}
        portfolioId={props.portfolio?.id || ""}
      />
    </>
  );
};
