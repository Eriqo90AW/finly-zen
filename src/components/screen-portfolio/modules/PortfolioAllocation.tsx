import { ApexOptions } from "apexcharts";
import { For, Show, createMemo } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { getAssetColor } from "../../../utils/colors";
import { formatPortfolioValue } from "../../../utils/format";
import { portfolioState } from "../../../store/portfolioStore";
import type { Portfolio, AllocationItem } from "../../../types";

interface PortfolioChartsProps {
  portfolio?: Portfolio;
}

export const PortfolioCharts = (props: PortfolioChartsProps) => {
  const currency = () => portfolioState.currencyView;

  const sortedAllocationItems = createMemo((): AllocationItem[] => {
    const assets = props.portfolio?.assets || [];
    const cash = props.portfolio?.cash || 0;
    const total = props.portfolio?.totalValue || 0;
    const cashPct = total > 0 ? (cash / total) * 100 : 0;

    const items: AllocationItem[] = [
      ...assets.map((a) => ({
        isCash: false,
        ticker: a.ticker,
        name: a.name,
        value: a.currentValue,
        percentage: a.actualAllocation,
        color: getAssetColor(a.ticker),
      })),
      {
        isCash: true,
        ticker: "Cash",
        name: "Liquidity",
        value: cash,
        percentage: cashPct,
        color: "#2D7D46",
      },
    ];

    return items.sort((a, b) => b.percentage - a.percentage);
  });

  const donutOptions = createMemo(
    (): ApexOptions => ({
      chart: {
        type: "donut",
        animations: {
          enabled: false,
        },
        dropShadow: {
          enabled: false,
        },
      },
      labels: sortedAllocationItems().map((item) => item.ticker),
      colors: sortedAllocationItems().map((item) => item.color),
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

  const donutSeries = createMemo(() =>
    sortedAllocationItems().map((item) => item.percentage),
  );

  const assetsValue = () =>
    (props.portfolio?.totalValue ?? 0) - (props.portfolio?.cash ?? 0);

  return (
    <>
      {/* Asset Allocation Card (CategoryCard Style) */}
      <div class="premium-card p-6 col-span-4 h-[480px] flex flex-col overflow-hidden cursor-default">
        <h4 class="font-outfit font-bold text-forest mb-6">Asset Allocation</h4>

        <Show
          when={!portfolioState.isLoading && props.portfolio}
          fallback={
            <div class="flex-1 flex flex-col animate-pulse">
              <div class="h-[220px] mb-6 flex items-center justify-center">
                <div class="w-40 h-40 rounded-full border-[16px] border-sage/20 flex items-center justify-center">
                  <div class="space-y-2 text-center">
                    <div class="h-3 bg-sage/20 rounded w-16 mx-auto" />
                    <div class="h-4 bg-sage/20 rounded w-24 mx-auto" />
                  </div>
                </div>
              </div>
              <div class="space-y-4 flex-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-1 h-8 bg-sage/20 rounded-full" />
                    <div class="space-y-2">
                      <div class="h-4 bg-sage/20 rounded w-16" />
                      <div class="h-3 bg-sage/20 rounded w-10" />
                    </div>
                  </div>
                  <div class="space-y-2 items-end flex flex-col">
                    <div class="h-4 bg-sage/20 rounded w-20" />
                    <div class="h-3 bg-sage/20 rounded w-8" />
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-1 h-8 bg-sage/20 rounded-full" />
                    <div class="space-y-2">
                      <div class="h-4 bg-sage/20 rounded w-12" />
                      <div class="h-3 bg-sage/20 rounded w-16" />
                    </div>
                  </div>
                  <div class="space-y-2 items-end flex flex-col">
                    <div class="h-4 bg-sage/20 rounded w-24" />
                    <div class="h-3 bg-sage/20 rounded w-8" />
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <div class="relative h-[220px] mb-6">
            <Show
              when={(props.portfolio?.totalValue ?? 0) > 0}
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
                    Assets Value
                  </span>
                  <span class="text-[12px] font-bold text-terracotta-dark leading-tight">
                    {formatPortfolioValue(assetsValue(), currency(), false, props.portfolio?.nativeCurrency)}
                  </span>

                  <div class="w-16 h-px bg-forest/15 my-1" />

                  <span class="text-[10px] uppercase tracking-widest text-earth/40 font-semibold">
                    Net Worth
                  </span>
                  <span class="text-[16px] font-bold text-forest leading-tight">
                    {formatPortfolioValue(
                      props.portfolio?.totalValue || 0,
                      currency(),
                      false,
                      props.portfolio?.nativeCurrency,
                    )}
                  </span>
                </div>
              </div>
            </Show>
          </div>

          {/* Asset List with Scrollbar */}
          <div class="flex-1 flex flex-col">
            <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar-thin max-h-[160px] pl-1 pr-2.5 space-y-2">
              <For each={sortedAllocationItems()}>
                {(item) => (
                  <div class="flex items-center justify-between group hover:bg-earth/2 -mx-3 px-3 py-1.5 transition-colors duration-200 cursor-pointer">
                    <div class="flex items-center gap-3 self-stretch">
                      <div
                        class="w-1 self-stretch"
                        style={{
                          "background-color": item.color,
                        }}
                      />
                      <div class="flex flex-col">
                        <span class="text-sm font-outfit font-bold text-earth group-hover:text-forest transition-colors leading-tight">
                          {item.ticker}
                        </span>
                        <span class="text-[10px] text-earth/40 truncate max-w-[120px]">
                          {item.name}
                        </span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end">
                      <span class="text-sm font-outfit font-bold text-forest">
                        {item.percentage.toFixed(1)}%
                      </span>
                      <span class="text-[10px] font-bold text-earth/40 uppercase tracking-wider">
                        {formatPortfolioValue(item.value, currency(), false, props.portfolio?.nativeCurrency)}
                      </span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
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
