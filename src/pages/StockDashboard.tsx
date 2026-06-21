import { createResource, Show, onCleanup, createEffect, createSignal, onMount } from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchStockData } from "../data/marketData";
import { PriceActionChart } from "../components/scren-markets/PriceActionChart";
import { StockHero } from "../components/scren-markets/StockHero";
import { MetricsCard } from "../components/scren-markets/MetricsCard";
import { FinancialPerformanceChart } from "../components/scren-markets/FinancialPerformanceChart";
import { EarningsActualsChart } from "../components/scren-markets/EarningsActualsChart";
import { DCFValuationCalculator } from "../components/scren-markets/DCFValuationCalculator";
import { EstimatesTable } from "../components/scren-markets/EstimatesTable";
import { setCurrentStockData, setIsStockLoading } from "../store/stockContext";
import { getMarketStatus } from "../utils/marketTime";
import { MarketStatus, PriceAlert } from "../types";
import { checkAlerts } from "../store/priceAlertStore";
import { PriceAlertToast } from "../components/scren-markets/PriceAlertToast";


const REFRESH_INTERVAL_SECONDS = 300;

const StockDashboard = () => {
  const params = useParams();
  const [stockData, { refetch }] = createResource(() => params.ticker, fetchStockData);
  
  const [marketStatus, setMarketStatus] = createSignal<MarketStatus>(getMarketStatus());
  const [nextUpdateIn, setNextUpdateIn] = createSignal(REFRESH_INTERVAL_SECONDS);

  let marketTimer: any;
  let countdownTimer: any;

  onMount(() => {
    // Update market status every second
    marketTimer = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 1000);

    // Synchronized Countdown & Refresh
    countdownTimer = setInterval(() => {
      setNextUpdateIn((prev) => {
        if (prev <= 1) {
          if (!stockData.loading) {
            refetch();
          }
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
  });

  // Reset countdown when ticker changes to keep it fresh
  createEffect(() => {
    if (params.ticker) {
      setNextUpdateIn(REFRESH_INTERVAL_SECONDS);
    }
  });

  onCleanup(() => {
    clearInterval(marketTimer);
    clearInterval(countdownTimer);
  });


  const [timedOut, setTimedOut] = createSignal(false);

  // Handle loading timeout
  createEffect(() => {
    if (stockData.loading) {
      setTimedOut(false);
      const timeout = setTimeout(() => {
        if (stockData.loading) {
          setTimedOut(true);
        }
      }, 10000);
      onCleanup(() => clearTimeout(timeout));
    } else {
      setTimedOut(false);
    }
  });


  // Sync data to shared context for TopBar
  createEffect(() => {
    setIsStockLoading(stockData.loading);
  });

  const hasFinancialData = () => {
    const data = stockData();
    if (!data) return false;
    const hasAnnuals = data.segment_data?.annual_financials && data.segment_data.annual_financials.length > 0;
    const hasEstimates = data.earnings_estimates?.by_period && 
      (data.earnings_estimates.by_period.current_quarter || 
       data.earnings_estimates.by_period.next_quarter || 
       data.earnings_estimates.by_period.current_year || 
       data.earnings_estimates.by_period.next_year);
    return !!(hasAnnuals || hasEstimates);
  };

  const [activeToasts, setActiveToasts] = createSignal<PriceAlert[]>([]);

  const dismissToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((a) => a.id !== id));
  };

  createEffect(() => {
    const data = stockData();
    if (data) {
      setCurrentStockData(data);
      const price = data.valuation?.extended_hours_price ?? data.valuation?.current_price ?? 0;
      const newlyTriggered = checkAlerts(data.ticker, price);
      if (newlyTriggered.length > 0) {
        setActiveToasts((prev) => [...prev, ...newlyTriggered]);
      }
    }
  });

  onCleanup(() => {
    setCurrentStockData(null);
    setIsStockLoading(false);
  });

  const ErrorState = () => (
    <div class="premium-card p-12 flex flex-col items-center justify-center gap-4 text-center">
      <div class="w-16 h-16 rounded-full bg-fin-red/10 flex items-center justify-center text-fin-red">
        <span class="material-icons text-3xl">error_outline</span>
      </div>
      <h2 class="text-2xl font-cormorant font-bold text-forest">Ticker Not Found</h2>
      <p class="text-earth max-w-md">We couldn't find any financial data for "{params.ticker?.toUpperCase()}". Please check the ticker symbol and try again.</p>
    </div>
  );

  return (
    <Show when={stockData() || !stockData.loading || timedOut()} fallback={
      <div class="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div class="w-12 h-12 border-4 border-forest/10 border-t-forest rounded-full animate-spin"></div>
        <p class="text-earth font-outfit font-medium">Fetching market data for {params.ticker?.toUpperCase()}...</p>
      </div>
    }>
      <Show when={!timedOut() && stockData()} fallback={<ErrorState />}>
        <div class="space-y-6 animate-fade-in-up pb-10">
          {/* Hero Section */}
          <StockHero
            data={stockData()!}
            marketStatus={marketStatus()}
            nextUpdateIn={nextUpdateIn()}
          />

          {/* Primary Chart + Key Metrics Row */}
          <div class="flex flex-col lg:flex-row gap-6 h-auto lg:h-[470px]">
            <div class="lg:w-3/4 w-full h-[370px] lg:h-full">
              <PriceActionChart data={stockData()!} />
            </div>
            <div class="lg:w-1/4 w-full h-full">
              <MetricsCard data={stockData()!} />
            </div>
          </div>

          <Show when={hasFinancialData()}>
            {/* Secondary Charts: Revenue/Earnings & EPS Actuals */}
            <div class="bento-grid !grid-rows-none">
              <FinancialPerformanceChart data={stockData()!} />
              <EarningsActualsChart data={stockData()!} />
            </div>

            {/* Detailed Data: Forward Estimates */}
            <EstimatesTable data={stockData()!} />

            {/* DCF Valuation Calculator */}
            <DCFValuationCalculator data={stockData()!} />
          </Show>
        </div>
      </Show>
      <PriceAlertToast alerts={activeToasts()} onDismiss={dismissToast} />
    </Show>
  );
};

export default StockDashboard;
