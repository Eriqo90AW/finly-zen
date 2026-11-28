import { useNavigate } from "@solidjs/router";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import type { Portfolio } from "../../../../types";
import { formatRupiah, getUsdRate } from "../../../../utils/format";
import { TradeAnalyticsCharts } from "./TradeAnalyticsCharts";
import { TradeHistoryTable } from "./TradeHistoryTable";
import { TradePerformersGrid } from "./TradePerformersGrid";
import { TradeSummaryStats } from "./TradeSummaryStats";
import { useTradeHistory } from "./useTradeHistory";

interface TradeHistoryProps {
  portfolio: Portfolio;
}

export const TradeHistory = (props: TradeHistoryProps) => {
  const navigate = useNavigate();
  const state = useTradeHistory(() => props.portfolio);

  return (
    <div class="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-2 animate-fade-in-up stagger-1">
        <div class="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/portfolio/${props.portfolio.id}`)}
            class="w-10 h-10 rounded-xl hover:bg-forest/5 flex items-center justify-center text-forest transition-all duration-200 border border-forest/10 cursor-pointer active:scale-95"
          >
            <ChevronLeftIcon />
          </button>
          <div>
            <h1 class="text-3xl md:text-4xl font-cormorant text-forest font-bold tracking-tight mb-1">
              {props.portfolio.name}
            </h1>
            <p class="text-earth font-outfit tracking-wide uppercase text-[10px] font-bold">
              Trade History & Performance Analysis
            </p>
          </div>
        </div>

        {/* Live Exchange Rate info */}
        <div class="flex items-center gap-2 bg-sage/20 border border-forest/5 rounded-2xl px-4 py-2 text-xs font-outfit text-forest/70 self-start md:self-auto">
          <span class="material-icons text-sm">currency_exchange</span>
          <span>
            Live USD rate: <b>{formatRupiah(getUsdRate())}</b>
          </span>
        </div>
      </div>

      <TradeSummaryStats
        stats={state.summaryStats()}
        isLoading={state.isLoadingTxs()}
        currency={state.currency()}
        nativeCurrency={props.portfolio.nativeCurrency}
      />

      <TradeAnalyticsCharts
        isLoading={state.isLoadingTxs()}
        currency={state.currency()}
        nativeCurrency={props.portfolio.nativeCurrency}
        cumulativePnLData={state.cumulativePnLData()}
        monthlyActivityData={state.monthlyActivityData()}
        volumeBreakdown={state.volumeBreakdown()}
        tickerPnLList={state.tickerPnLList()}
      />

      <TradePerformersGrid
        leadersBoard={state.leadersBoard()}
        tickerLogos={state.tickerLogos()}
        tickerNames={state.tickerNames()}
        currency={state.currency()}
        nativeCurrency={props.portfolio.nativeCurrency}
        onNavigateStock={(ticker) => navigate(`/stock/${ticker}`)}
      />

      <TradeHistoryTable
        isLoading={state.isLoadingTxs()}
        rawCount={state.rawTransactions().length}
        totalProcessed={state.processedTransactions().length}
        paginatedTransactions={state.paginatedTransactions()}
        currentPage={state.currentPage()}
        totalPages={state.totalPages()}
        pageSize={state.pageSize}
        searchQuery={state.searchQuery()}
        typeFilter={state.typeFilter()}
        sortBy={state.sortBy()}
        sortOrder={state.sortOrder()}
        expandedTxId={state.expandedTxId()}
        tickerLogos={state.tickerLogos()}
        tickerNames={state.tickerNames()}
        currency={state.currency()}
        nativeCurrency={props.portfolio.nativeCurrency}
        onSearchChange={state.setSearchQuery}
        onTypeFilterChange={state.setTypeFilter}
        onSort={state.handleSort}
        onToggleExpand={state.toggleRowExpand}
        onPageChange={state.setCurrentPage}
        onNavigateStock={(ticker) => navigate(`/stock/${ticker}`)}
      />
    </div>
  );
};
