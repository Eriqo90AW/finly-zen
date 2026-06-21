import { createMemo } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { formatUSD } from "../../utils/format";
import type { PriceActionChartProps } from "../../types";

export const PriceActionChart = (props: PriceActionChartProps) => {
  const chartOptions = createMemo((): ApexOptions => {
    const corporateActions = props.data.corporate_actions || [];
    const priceAction = props.data.price_action || [];

    const splitAction = corporateActions.find(
      (a) => a.type === "split",
    );

    // Find the closest index for the split action annotation
    let splitIndex = -1;
    if (splitAction) {
      splitIndex = priceAction.findIndex(
        (p) =>
          new Date(p.date).getTime() >= new Date(splitAction.date).getTime(),
      );
    }

    return {
      chart: {
        type: "candlestick",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "Outfit",
        background: "transparent",
        animations: { enabled: false },
        events: {
          mounted: (chartContext: any) => {
            const labels = chartContext.el.querySelectorAll(
              ".apexcharts-xaxis-label text, .apexcharts-xaxis-label tspan",
            );
            labels.forEach((l: any) => {
              if (/[a-zA-Z]/.test(l.textContent)) {
                l.style.fontWeight = "700";
                l.style.fill = "var(--color-forest)";
              }
            });
          },
          updated: (chartContext: any) => {
            const labels = chartContext.el.querySelectorAll(
              ".apexcharts-xaxis-label text, .apexcharts-xaxis-label tspan",
            );
            labels.forEach((l: any) => {
              if (/[a-zA-Z]/.test(l.textContent)) {
                l.style.fontWeight = "700";
                l.style.fill = "var(--color-forest)";
              }
            });
          },
        },
      },
      plotOptions: {
        candlestick: {
          colors: {
            upward: "var(--color-fin-green)",
            downward: "var(--color-fin-red)",
          },
          wick: { useFillColor: true },
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "rgba(26,77,46,0.15)",
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        padding: { left: 10, right: 10 },
      },
      xaxis: {
        type: "category",
        labels: {
          style: { colors: "#5C6B5E", fontSize: "10px" },
          formatter: (val: string, timestamp: any) => {
            if (!val) return "";
            const d = new Date(val);
            const data = priceAction;
            const index =
              typeof timestamp === "number" && timestamp >= 0
                ? timestamp
                : data.findIndex((p) => p.date === val);
            if (index === 0) {
              return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }
            // Show month + day when the month changes
            if (index > 0) {
              const prevDateStr = data[index - 1]?.date;
              if (prevDateStr) {
                const prevDate = new Date(prevDateStr);
                if (d.getMonth() !== prevDate.getMonth()) {
                  return d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }
              }
            }
            return d.getDate().toString();
          },

          rotate: 0,
          hideOverlappingLabels: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      yaxis: {
        opposite: true,
        labels: {
          style: { colors: "#5C6B5E", fontSize: "10px" },
          formatter: (val) => {
            // Dynamically choose decimals based on the price range
            const prices = priceAction.flatMap(p => [p.high, p.low]);
            if (prices.length === 0) return formatUSD(val, 2);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const range = maxPrice - minPrice;
            const decimals = range < 5 ? 2 : range < 50 ? 1 : 0;
            return formatUSD(val, decimals);
          },
        },
      },
      annotations: {
        xaxis:
          splitIndex !== -1 && priceAction[splitIndex]
            ? [
                {
                  x: priceAction[splitIndex].date,
                  borderColor: "var(--color-forest)",
                  strokeDashArray: 4,
                  label: {
                    text: `${splitAction!.stock_split} Split`,
                    style: {
                      color: "#fff",
                      background: "var(--color-forest)",
                      fontSize: "10px",
                      padding: { left: 8, right: 8, top: 4, bottom: 4 },
                    },
                  },
                },
              ]
            : [],
      },
      tooltip: {
        theme: "dark",
        x: { show: false },
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          const point = priceAction[dataPointIndex];
          if (!point) return "";
          return `
            <div class="px-4 py-4 bg-[#1C2B20]/90 text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 w-[220px] border border-white/10">
              <div class="text-white/40 text-[10px] uppercase tracking-wider font-bold">
                ${new Date(point.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div class="flex justify-between items-center">
                <span class="text-white/60">Close Price</span>
                <span class="font-bold text-xl text-white">${formatUSD(point.close)}</span>
              </div>
              <div class="my-1" />
              <div class="grid grid-cols-2 gap-x-6 gap-y-2">
                <div class="flex flex-col"><span class="text-white/40 text-[9px] uppercase font-bold">Open</span> <span class="font-medium">${formatUSD(point.open)}</span></div>
                <div class="flex flex-col"><span class="text-white/40 text-[9px] uppercase font-bold">High</span> <span class="font-medium">${formatUSD(point.high)}</span></div>
                <div class="flex flex-col"><span class="text-white/40 text-[9px] uppercase font-bold">Low</span> <span class="font-medium">${formatUSD(point.low)}</span></div>
                <div class="flex flex-col"><span class="text-white/40 text-[9px] uppercase font-bold">Volume</span> <span class="font-medium">${point.volume ? (point.volume / 1000000).toFixed(1) + "M" : "N/A"}</span></div>
              </div>
            </div>
          `;
        },
      },
    };
  });

  return (
    <div class="premium-card p-6 h-full flex flex-col hover:cursor-default">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h4 class="font-outfit font-bold text-forest text-lg">
            Price Action
          </h4>
          <p class="text-xs text-earth/60">Historical performance (6 Months)</p>
        </div>
        <div class="flex gap-2">
          <span class="px-3 py-1 bg-forest/5 text-forest text-[10px] font-bold rounded-lg uppercase tracking-widest border border-forest/10">
            6M
          </span>
          <span class="px-3 py-1 bg-sage/20 text-earth text-[10px] font-bold rounded-lg uppercase tracking-widest">
            1W Candlestick
          </span>
        </div>
      </div>
      <div class="flex-1">
        <SolidApexCharts
          type="candlestick"
          options={chartOptions()}
          series={[
            {
              name: "Price",
              data: (props.data.price_action || []).map((p) => ({
                x: p.date,
                y: [p.open, p.high, p.low, p.close],
              })),
            },
          ]}
          height="100%"
        />
      </div>
    </div>
  );
};
