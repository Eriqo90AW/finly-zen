import { Show } from "solid-js";
import { formatPercent } from "../../../utils/format";
import { AddHoldingModal } from "../components/AddHoldingModal";
import { CategoryPnLCard } from "../components/CategoryPnLCard";
import { ConfirmDeleteAssetModal } from "../components/ConfirmDeleteAssetModal";
import { DailyMoversCard } from "../components/DailyMoversCard";
import { QuickPortfolioHeader } from "../components/QuickPortfolioHeader";
import { QuickPortfolioKPIs } from "../components/QuickPortfolioKPIs";
import { QuickPortfolioCharts } from "../components/charts/QuickPortfolioCharts";
import { QuickPortfolioTable } from "../components/table/QuickPortfolioTable";
import { useQuickPortfolio } from "../model/useQuickPortfolio";

export function QuickPortfolioPage() {
  const vm = useQuickPortfolio();

  return (
    <div class="flex-1 flex flex-col gap-6 w-full pb-12 animate-fade-in-up">
      <QuickPortfolioHeader
        lastUpdatedLabel={vm.lastUpdatedLabel()}
        isRefreshing={vm.isRefreshing()}
        onRefresh={vm.handleRefresh}
      />

      <Show
        when={!vm.isLoading()}
        fallback={
          <div class="flex flex-col items-center justify-center py-32 gap-4">
            <div class="w-12 h-12 border-4 border-forest/10 border-t-forest rounded-full animate-spin" />
            <span class="text-earth font-outfit text-sm animate-pulse">
              Initializing Quick Portfolio...
            </span>
          </div>
        }
      >
        <section class="grid grid-cols-12 gap-6">
          <QuickPortfolioKPIs
            totalValue={vm.totalValue()}
            overallPL={vm.overallPL()}
            overallPLPercent={vm.overallPLPercent()}
            todayChange={vm.todayChange()}
            todayChangePercent={vm.todayChangePercent()}
            hasTodayChangeData={vm.hasTodayChangeData()}
            formatVal={vm.formatVal}
            formatPercent={formatPercent}
          />

          <div class="col-span-12 lg:col-span-6 flex flex-col h-full">
            <CategoryPnLCard
              categories={vm.categoryPnLData()}
              formatVal={vm.formatVal}
              formatPercent={formatPercent}
            />
          </div>

          <div class="col-span-12 lg:col-span-6 flex flex-col h-full">
            <DailyMoversCard
              assets={vm.quickPortfolio()?.assets || []}
              formatVal={vm.formatVal}
              formatPercent={formatPercent}
              getDisplayTicker={vm.getDisplayTicker}
              getCategory={vm.getCategory}
            />
          </div>

          <QuickPortfolioCharts
            allocations={vm.allocations()}
            allocationView={vm.allocationView()}
            setAllocationView={vm.setAllocationView}
            detailAllocations={vm.detailAllocations()}
            perfKpi={vm.perfKpi()}
            perfPeriod={vm.perfPeriod()}
            setPerfPeriod={vm.setPerfPeriod}
            perfChartReady={vm.perfChartReady()}
            perfOptions={vm.perfOptions()}
            perfSeriesApex={vm.perfSeriesApex()}
            perfSeries={vm.perfSeries()}
            formatVal={vm.formatVal}
            formatPercent={formatPercent}
          />
        </section>

        <QuickPortfolioTable
          assets={vm.quickPortfolio()?.assets || []}
          distinctAssetCount={vm.distinctAssetCount()}
          cashBalance={vm.cashBalance()}
          totalValue={vm.totalValue()}
          initialCapital={vm.initialCapital()}
          overallPL={vm.overallPL()}
          overallPLPercent={vm.overallPLPercent()}
          currencyView={vm.currencyView()}
          isSubmitting={vm.isSubmitting()}
          onStartAddHolding={vm.startAddHoldingModal}
          onCopyJson={vm.handleCopyJson}
          isCopied={vm.isCopied()}
          onSaveQty={vm.saveQty}
          onSavePrice={vm.savePrice}
          onSaveRate={vm.saveRate}
          onDeleteHolding={vm.requestDeleteHolding}
          onSaveCash={vm.saveCash}
          onCreateNewHolding={vm.createNewHolding}
          formatVal={vm.formatVal}
          formatCash={vm.formatCash}
          formatPrice={vm.formatPrice}
          getCategory={vm.getCategory}
          getCategoryIcon={vm.getCategoryIcon}
          getDisplayTicker={vm.getDisplayTicker}
          getUsdRate={vm.getUsdRate}
        />
      </Show>

      <AddHoldingModal
        isOpen={vm.showAddModal()}
        onClose={() => vm.setShowAddModal(false)}
        isSubmitting={vm.isSubmitting()}
        newTicker={vm.newTicker()}
        setNewTicker={vm.setNewTicker}
        newQty={vm.newQty()}
        setNewQty={vm.setNewQty}
        newPrice={vm.newPrice()}
        setNewPrice={vm.setNewPrice}
        newCurrency={vm.newCurrency()}
        setNewCurrency={vm.setNewCurrency}
        newConversionRate={vm.newConversionRate()}
        setNewConversionRate={vm.setNewConversionRate}
        getUsdRate={vm.getUsdRate}
        onSubmit={vm.handleAddHoldingSubmit}
      />

      <ConfirmDeleteAssetModal
        isOpen={vm.showDeleteModal()}
        assetName={vm.assetToDelete()?.name || ""}
        onConfirm={vm.confirmDeleteHolding}
        onClose={() => vm.setShowDeleteModal(false)}
      />
    </div>
  );
}
