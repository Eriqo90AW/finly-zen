import { createResource, Show, onCleanup, createEffect } from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchStockData } from "../data/stockData";
import { PriceActionChart } from "../components/stock/PriceActionChart";
import { StockHero } from "../components/stock/StockHero";
import { MetricsCard } from "../components/stock/MetricsCard";
import { FinancialPerformanceChart } from "../components/stock/FinancialPerformanceChart";
import { EarningsActualsChart } from "../components/stock/EarningsActualsChart";
import { EstimatesTable } from "../components/stock/EstimatesTable";
import { formatUSD, formatUSDCompact } from "../utils/format";
import { setCurrentStockData } from "../store/stockContext";
import { getMarketStatus, MarketStatus } from "../utils/marketTime";
import { createSignal, onMount } from "solid-js";


const StockDashboard = () => {
  const params = useParams();
  const [stockData] = createResource(() => params.ticker, fetchStockData);
  
  const [marketStatus, setMarketStatus] = createSignal<MarketStatus>(getMarketStatus());

  let timer: any;
  onMount(() => {
    timer = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 1000);
  });

  onCleanup(() => {
    clearInterval(timer);
  });


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
            <StockHero data={d} marketStatus={marketStatus()} />

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
