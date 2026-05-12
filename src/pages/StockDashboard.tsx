import { createResource, Show, onCleanup, createEffect } from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchStockData } from "../data/stockData";
import { PriceActionChart } from "../components/stock/PriceActionChart";
import { MetricsCard } from "../components/stock/MetricsCard";
import { FinancialPerformanceChart } from "../components/stock/FinancialPerformanceChart";
import { EarningsActualsChart } from "../components/stock/EarningsActualsChart";
import { EstimatesTable } from "../components/stock/EstimatesTable";
import { formatUSD, formatUSDCompact } from "../utils/format";
import { setCurrentStockData } from "../store/stockContext";

const StockDashboard = () => {
  const params = useParams();
  const [stockData] = createResource(() => params.ticker, fetchStockData);

  // Sync data to shared context for TopBar
  createEffect(() => {
    const data = stockData();
    if (data) {
      setCurrentStockData(data);
    }
  });

  onCleanup(() => {
    setCurrentStockData(null);
  });

  return (
    <Show when={!stockData.loading} fallback={
      <div class="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div class="w-12 h-12 border-4 border-forest/10 border-t-forest rounded-full animate-spin"></div>
        <p class="text-earth font-outfit font-medium">Fetching market data for {params.ticker?.toUpperCase()}...</p>
      </div>
    }>
      <Show when={stockData()} fallback={
        <div class="premium-card p-12 flex flex-col items-center justify-center gap-4 text-center">
          <div class="w-16 h-16 rounded-full bg-fin-red/10 flex items-center justify-center text-fin-red">
            <span class="material-icons text-3xl">error_outline</span>
          </div>
          <h2 class="text-2xl font-cormorant font-bold text-forest">Ticker Not Found</h2>
          <p class="text-earth max-w-md">We couldn't find any financial data for "{params.ticker?.toUpperCase()}". Please check the ticker symbol and try again.</p>
        </div>
      }>
        {(data) => {
          const d = data();
          return (
          <div class="space-y-6 animate-fade-in-up pb-10">
            {/* Hero Section */}
            <div class="premium-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-white to-sage/5 border-forest/5">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-3">
                  <h1 class="text-4xl font-cormorant font-bold text-forest leading-none">
                    {d.company_name}
                  </h1>
                  <div class="flex flex-wrap gap-2">
                    <span class="bg-forest text-white text-xs px-2 py-0.5 rounded-lg font-bold tracking-wider">
                      {d.ticker}
                    </span>
                    <span class="bg-sage text-forest text-xs px-2 py-0.5 rounded-lg font-medium border border-forest/10">
                      {d.exchange}
                    </span>
                    <Show when={d.sector}>
                      <span class="bg-fin-blue/10 text-fin-blue text-[10px] px-2 py-0.5 rounded-lg font-bold border border-fin-blue/10 uppercase tracking-tight">
                        {d.sector}
                      </span>
                    </Show>
                    <Show when={d.industry}>
                      <span class="bg-fin-purple/10 text-fin-purple text-[10px] px-2 py-0.5 rounded-lg font-bold border border-fin-purple/10 uppercase tracking-tight">
                        {d.industry}
                      </span>
                    </Show>
                  </div>
                </div>
                <p class="text-sm text-earth/60 font-medium mt-1">
                  {d.currency} • Latest Market Data • As of: {new Date(d.as_of).toLocaleDateString()}
                </p>
              </div>

              <div class="flex items-end gap-6">
                <div class="text-right">
                  <p class="text-[10px] font-bold text-earth uppercase tracking-widest mb-1">Current Price</p>
                  <div class="flex items-baseline gap-2">
                    <span class="text-4xl font-outfit font-black text-forest">
                      {formatUSD(d.valuation.current_price)}
                    </span>
                    <span class="text-fin-green font-bold text-sm">
                      +1.24%
                    </span>
                  </div>
                </div>
                <div class="h-12 w-px bg-forest/10" />
                <div class="text-right">
                  <p class="text-[10px] font-bold text-earth uppercase tracking-widest mb-1">Market Cap</p>
                  <span class="text-xl font-outfit font-bold text-forest">
                    {formatUSDCompact(d.valuation.market_cap)}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Chart + Key Metrics Row */}
            <div class="flex flex-col lg:flex-row gap-6 h-auto lg:h-[500px]">
              <div class="lg:w-3/4 w-full h-[400px] lg:h-full">
                <PriceActionChart data={d} />
              </div>
              <div class="lg:w-1/4 w-full h-full">
                <MetricsCard data={d} />
              </div>
            </div>

            {/* Secondary Charts: Revenue/Earnings & EPS Actuals */}
            <div class="bento-grid !grid-rows-none">
              <FinancialPerformanceChart data={d} />
              <EarningsActualsChart data={d} />
            </div>

            {/* Detailed Data: Forward Estimates */}
            <EstimatesTable data={d} />
          </div>
          );
        }}
      </Show>
    </Show>
  );
};

export default StockDashboard;
