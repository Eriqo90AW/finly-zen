import { For, Show, createMemo } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { Portfolio } from "../../../types";
import { formatPortfolioValue } from "../../../utils/format";
import { portfolioState } from "../../../store/portfolioStore";

interface PortfolioChartsProps {
  portfolio: Portfolio;
}

// Helper to generate a deterministic color from a string (the ticker)
const getAssetColor = (ticker: string) => {
  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#F97316",
    "#14B8A6",
    "#6366F1",
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const PortfolioCharts = (props: PortfolioChartsProps) => {
  const currency = () => portfolioState.currencyView;

  const assetColors = createMemo(() =>
    props.portfolio.assets.map((a) => getAssetColor(a.ticker)),
  );
  const cashPercentage = createMemo(() =>
    props.portfolio.totalValue > 0
      ? (props.portfolio.cash / props.portfolio.totalValue) * 100
      : 0,
  );

  const donutOptions = createMemo(
    (): ApexOptions => ({
      chart: {
        type: "donut",
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: { enabled: true, delay: 150 },
          dynamicAnimation: { enabled: true, speed: 350 },
        },
        dropShadow: {
          enabled: true,
          blur: 10,
          left: 0,
          top: 4,
          opacity: 0.05,
          color: "#1A4D2E",
        },
      },
      labels: [...props.portfolio.assets.map((a) => a.ticker), "Cash"],
      colors: [...assetColors(), "#2D7D46"], // Use mid-green for cash
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { show: false },
      tooltip: { enabled: false },
      states: {
        hover: { filter: { type: "none" } },
      },
      plotOptions: {
        pie: {
          expandOnClick: true,
          donut: {
            size: "78%",
            labels: { show: false },
          },
        },
      },
    }),
  );

  // Removed lineOptions and lineSeries - extracted to PerformanceHistoryChart

  const donutSeries = createMemo(() => [
    ...props.portfolio.assets.map((a) => a.actualAllocation),
    cashPercentage(),
  ]);

  const assetsValue = () => props.portfolio.totalValue - props.portfolio.cash;

  return (
    <>
      {/* Asset Allocation Card (CategoryCard Style) */}
      <div class="premium-card p-6 col-span-4 h-[480px] flex flex-col overflow-hidden cursor-default">
        <h4 class="font-outfit font-bold text-forest mb-6">Asset Allocation</h4>

        <div class="relative h-[220px] mb-6">
          <Show
            when={props.portfolio.totalValue > 0}
            fallback={
              <div class="w-full h-full flex items-center justify-center text-earth/30 font-outfit text-sm italic">
                No data to display
              </div>
            }
          >
            <SolidApexCharts
              options={donutOptions()}
              series={donutSeries()}
              type="donut"
              height="100%"
            />
            {/* Custom donut center overlay */}
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none pb-4">
              <div class="flex flex-col items-center gap-0.5 font-outfit">
                <span class="text-[8px] uppercase tracking-widest text-earth/50 font-semibold">
                  Market Value
                </span>
                <span class="text-[12px] font-bold text-terracotta-dark leading-tight">
                  {formatPortfolioValue(assetsValue(), currency())}
                </span>

                <div class="w-16 h-px bg-forest/15 my-1" />

                <span class="text-[10px] uppercase tracking-widest text-earth/40 font-semibold">
                  Net Worth
                </span>
                <span class="text-[16px] font-bold text-forest leading-tight">
                  {formatPortfolioValue(props.portfolio.totalValue, currency())}
                </span>
              </div>
            </div>
          </Show>
        </div>

        {/* Asset List with Scrollbar */}
        <div class="flex-1 flex flex-col">
          <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar-thin max-h-[160px] pl-1 pr-2.5 space-y-2">
            {/* Cash Entry */}
            <div class="flex items-center justify-between group hover:bg-earth/2 -mx-3 px-3 py-1.5 transition-all cursor-pointer">
              <div class="flex items-center gap-3 self-stretch">
                <div class="w-1 bg-mid-green self-stretch" />
                <div class="flex flex-col">
                  <span class="text-sm font-outfit font-bold text-earth group-hover:text-forest transition-colors leading-tight">
                    Cash
                  </span>
                  <span class="text-[10px] text-earth/40">Liquidity</span>
                </div>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-sm font-outfit font-bold text-forest">
                  {formatPortfolioValue(props.portfolio.cash, currency())}
                </span>
                <span class="text-[10px] font-bold text-earth/40 uppercase tracking-wider">
                  {cashPercentage().toFixed(1)}%
                </span>
              </div>
            </div>

            <For each={props.portfolio.assets}>
              {(asset) => (
                <div class="flex items-center justify-between group hover:bg-earth/2 -mx-3 px-3 py-1.5 transition-all cursor-pointer">
                  <div class="flex items-center gap-3 self-stretch">
                    <div
                      class="w-1 self-stretch"
                      style={{
                        "background-color": getAssetColor(asset.ticker),
                      }}
                    />
                    <div class="flex flex-col">
                      <span class="text-sm font-outfit font-bold text-earth group-hover:text-forest transition-colors leading-tight">
                        {asset.ticker}
                      </span>
                      <span class="text-[10px] text-earth/40 truncate max-w-[120px]">
                        {asset.name}
                      </span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end">
                    <span class="text-sm font-outfit font-bold text-forest">
                      {formatPortfolioValue(asset.currentValue, currency())}
                    </span>
                    <span class="text-[10px] font-bold text-earth/40 uppercase tracking-wider">
                      {asset.actualAllocation.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      {/* Inline scrollbar styles matching CategoryCard */}
      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(26, 77, 46, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(26, 77, 46, 0.35);
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 77, 46, 0.6);
          border-radius: 10px;
        }
      `}</style>
    </>
  );
};
