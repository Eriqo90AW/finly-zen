import { createMemo, Show, untrack } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import {
  buildAreaChartOptions,
  buildStackedBarOptions,
  buildTickerPnLBarOptions,
  buildVolumeDonutOptions,
} from "./tradeHistoryChartOptions";
import {
  type CumulativePnLPoint,
  convertToDisplayAmount,
  type MonthlyActivityData,
  type TickerPnLItem,
  type VolumeBreakdownData,
} from "./tradeHistoryHelpers";

interface TradeAnalyticsChartsProps {
  isLoading: boolean;
  currency: "IDR" | "USD";
  nativeCurrency: "IDR" | "USD";
  cumulativePnLData: CumulativePnLPoint[];
  monthlyActivityData: MonthlyActivityData;
  volumeBreakdown: VolumeBreakdownData;
  tickerPnLList: TickerPnLItem[];
}

export const TradeAnalyticsCharts = (props: TradeAnalyticsChartsProps) => {
  const getCurrency = () => untrack(() => props.currency);

  const areaSeries = createMemo(() => [
    {
      name: "Cumulative Realized P&L",
      data: props.cumulativePnLData.map((d) =>
        convertToDisplayAmount(d.value, props.nativeCurrency, props.currency),
      ),
    },
  ]);

  const areaOptions = createMemo(() =>
    buildAreaChartOptions(
      props.cumulativePnLData,
      props.nativeCurrency,
      getCurrency,
    ),
  );

  const stackedBarOptions = createMemo(() =>
    buildStackedBarOptions(props.monthlyActivityData.categories),
  );

  const donutOptions = createMemo(() =>
    buildVolumeDonutOptions(props.nativeCurrency, getCurrency),
  );

  const barCategories = createMemo(() =>
    props.tickerPnLList.map((d) => d.ticker),
  );
  const barColors = createMemo(() =>
    props.tickerPnLList.map((item) =>
      item.realizedPnL >= 0 ? "#52C278" : "#f43f5e",
    ),
  );
  const barSeries = createMemo(() => [
    {
      name: "Total Realized Gain / Loss",
      data: props.tickerPnLList.map((d) =>
        convertToDisplayAmount(
          d.realizedPnL,
          props.nativeCurrency,
          props.currency,
        ),
      ),
    },
  ]);

  const barOptions = createMemo(() =>
    buildTickerPnLBarOptions(
      barCategories(),
      barColors(),
      props.nativeCurrency,
      getCurrency,
    ),
  );

  const chartHeight = createMemo(() => {
    const len = barCategories().length;
    return len === 0 ? 200 : Math.max(200, len * 40 + 50);
  });

  const hasVolumeData = () =>
    props.volumeBreakdown.series.reduce((a, b) => a + b, 0) > 0;

  return (
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up stagger-3">
      {/* Chart A: Cumulative Realized PnL */}
      <div class="premium-card p-5 flex flex-col">
        <div class="border-b border-forest/5 pb-3 mb-3">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
            <span class="material-icons text-sm text-forest/60">show_chart</span>
            Cumulative Performance
          </h4>
          <p class="text-earth/60 font-outfit text-[11px] mt-0.5">
            Running track of realized gains/losses across all historical selling
            and dividend events.
          </p>
        </div>
        <Show
          when={!props.isLoading && props.cumulativePnLData.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-16">
              <span class="material-icons text-3xl text-forest/10 mb-2">
                trending_up
              </span>
              {props.isLoading
                ? "Processing timeline..."
                : "No cumulative data points available."}
            </div>
          }
        >
          <div class="w-full h-[220px]">
            <SolidApexCharts
              options={areaOptions()}
              series={areaSeries()}
              type="area"
              height={220}
            />
          </div>
        </Show>
      </div>

      {/* Chart B: Monthly Trade Activity */}
      <div class="premium-card p-5 flex flex-col">
        <div class="border-b border-forest/5 pb-3 mb-3">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
            <span class="material-icons text-sm text-forest/60">
              calendar_month
            </span>
            Monthly Activity Patterns
          </h4>
          <p class="text-earth/60 font-outfit text-[11px] mt-0.5">
            Breakdown of trade frequencies (BUY, SELL, DIVIDEND) grouped by
            month.
          </p>
        </div>
        <Show
          when={
            !props.isLoading && props.monthlyActivityData.categories.length > 0
          }
          fallback={
            <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-16">
              <span class="material-icons text-3xl text-forest/10 mb-2">
                bar_chart
              </span>
              {props.isLoading
                ? "Grouping months..."
                : "No monthly data points available."}
            </div>
          }
        >
          <div class="w-full h-[220px]">
            <SolidApexCharts
              options={stackedBarOptions()}
              series={props.monthlyActivityData.series}
              type="bar"
              height={220}
            />
          </div>
        </Show>
      </div>

      {/* Chart C: Volume Breakdown Donut */}
      <div class="premium-card p-5 flex flex-col">
        <div class="border-b border-forest/5 pb-3 mb-3">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
            <span class="material-icons text-sm text-forest/60">pie_chart</span>
            Flow Volume Breakdown
          </h4>
          <p class="text-earth/60 font-outfit text-[11px] mt-0.5">
            Capital distributions allocated toward asset buys vs returns from
            sales and dividends.
          </p>
        </div>
        <Show
          when={!props.isLoading && hasVolumeData()}
          fallback={
            <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-16">
              <span class="material-icons text-3xl text-forest/10 mb-2">
                donut_large
              </span>
              {props.isLoading
                ? "Sizing breakdown..."
                : "No volume flow record."}
            </div>
          }
        >
          <div class="w-full h-[220px] flex items-center justify-center">
            <SolidApexCharts
              options={donutOptions()}
              series={props.volumeBreakdown.series}
              type="donut"
              height={210}
            />
          </div>
        </Show>
      </div>

      {/* Chart D: Ticker PnL Bar Chart */}
      <div class="premium-card p-5 flex flex-col">
        <div class="border-b border-forest/5 pb-3 mb-3">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
            <span class="material-icons text-sm text-forest/60">equalizer</span>
            Realized PnL per Traded Ticker
          </h4>
          <p class="text-earth/60 font-outfit text-[11px] mt-0.5">
            Net gains and losses realized on each individual asset ticker.
          </p>
        </div>
        <Show
          when={!props.isLoading && props.tickerPnLList.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center text-earth/40 italic font-outfit py-16">
              <span class="material-icons text-3xl text-forest/10 mb-2">
                view_week
              </span>
              {props.isLoading
                ? "Loading PnL chart..."
                : "No ticker trades available."}
            </div>
          }
        >
          <div class="w-full overflow-y-auto max-h-[220px]">
            <div class="w-full" style={{ "min-height": `${chartHeight()}px` }}>
              <SolidApexCharts
                options={barOptions()}
                series={barSeries()}
                type="bar"
                height={chartHeight()}
              />
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
