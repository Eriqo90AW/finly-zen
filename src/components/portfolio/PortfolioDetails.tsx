import { createSignal, createMemo } from "solid-js";
import {
  setActivePortfolioId,
  deleteAssetFromPortfolio,
} from "../../store/portfolioStore";
import { PortfolioHero } from "./modules/PortfolioHero";
import { PortfolioCharts } from "./modules/PortfolioAllocation";
import { PerformanceHistoryChart } from "./modules/PortfolioPerformance";
import { PortfolioAssetsList } from "./modules/PortfolioAssetsList";
import { AssetDetailsSlideOver } from "./modules/AssetDetailsSlideOver";
import { AddAssetModal } from "./modals/AddAssetModal";
import { ManageCapitalModal } from "./modals/ManageCapitalModal";
import { PortfolioAsset, Portfolio } from "../../types";
import AddIcon from "@suid/icons-material/Add";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";

interface PortfolioDetailsProps {
  portfolio: Portfolio;
}

export const PortfolioDetails = (props: PortfolioDetailsProps) => {
  const [selectedAsset, setSelectedAsset] = createSignal<PortfolioAsset | null>(
    null,
  );
  const [showAddAssetModal, setShowAddAssetModal] = createSignal(false);
  const [showAddCapitalModal, setShowAddCapitalModal] = createSignal(false);

  const assetTransactions = createMemo(() => {
    const asset = selectedAsset();
    if (!asset) return [];
    return props.portfolio.transactions.filter(
      (t) => t.ticker === asset.ticker,
    );
  });

  return (
    <>
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
          <button
            onClick={() => setActivePortfolioId(null)}
            class="w-10 h-10 rounded-xl hover:bg-forest/5 flex items-center justify-center text-forest transition-colors duration-200 border border-forest/10 cursor-pointer"
          >
            <ChevronLeftIcon />
          </button>
          <div>
            <h1 class="text-4xl font-cormorant text-forest font-bold tracking-tight mb-1">
              {props.portfolio.name}
            </h1>
            <p class="text-earth font-outfit tracking-wide uppercase text-[10px] font-bold">
              Detailed Portfolio Breakdown
            </p>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            onClick={() => setShowAddAssetModal(true)}
            class="flex items-center gap-2 bg-forest text-white px-6 py-3 rounded-2xl font-outfit font-bold shadow-xl hover:brightness-90  transition-opacity duration-200 cursor-pointer w-fit"
          >
            <span class="material-icons text-lg">add_circle</span>
            Add Assets
          </button>

          <button
            onClick={() => setShowAddAssetModal(true)}
            class="flex items-center gap-2 bg-white text-forest border border-forest/10 px-6 py-3 rounded-2xl font-outfit font-bold shadow-sm hover:bg-spring/5 transition-color duration-100 cursor-pointer w-fit"
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
          <PerformanceHistoryChart history={props.portfolio.history} />
        </div>
      </div>
      <PortfolioAssetsList
        assets={props.portfolio.assets}
        onSelectAsset={(a) => setSelectedAsset(a)}
        onAddAsset={() => setShowAddAssetModal(true)}
        onDeleteAsset={(assetId) => {
          if (
            confirm(
              "Are you sure you want to delete this asset? All related transactions will be removed and cash will be adjusted.",
            )
          ) {
            deleteAssetFromPortfolio(props.portfolio.id, assetId);
          }
        }}
      />

      {/* Detail SlideOver */}
      <AssetDetailsSlideOver
        asset={selectedAsset()}
        transactions={assetTransactions()}
        isOpen={!!selectedAsset()}
        onClose={() => setSelectedAsset(null)}
        onDeleteAsset={(assetId) => {
          if (
            confirm(
              "Are you sure you want to delete this asset? All related transactions will be removed and cash will be adjusted.",
            )
          ) {
            deleteAssetFromPortfolio(props.portfolio.id, assetId);
            setSelectedAsset(null);
          }
        }}
      />

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={showAddAssetModal()}
        onClose={() => setShowAddAssetModal(false)}
        portfolioId={props.portfolio.id}
      />

      {/* Add Capital Modal */}
      <ManageCapitalModal
        isOpen={showAddCapitalModal()}
        onClose={() => setShowAddCapitalModal(false)}
        portfolioId={props.portfolio.id}
      />
    </>
  );
};
