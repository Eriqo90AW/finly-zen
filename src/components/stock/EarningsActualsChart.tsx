import { createMemo } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { StockData } from "../../data/stockData";
import { formatUSD } from "../../utils/format";

interface EarningsActualsChartProps {
  data: StockData;
}

export const EarningsActualsChart = (props: EarningsActualsChartProps) => {
  const chartOptions = (): ApexOptions => {
    const estimates = props.data.earnings_estimates.eps_actuals_vs_estimates;
    
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "Outfit",
        background: "transparent"
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "60%",
          borderRadius: 4,
          borderRadiusApplication: "end"
        }
      },
      dataLabels: { enabled: false },
      colors: ["var(--color-fin-purple)", "var(--color-fin-green)"],
      xaxis: {
        categories: estimates.map(e => e.quarter),
        labels: { style: { colors: "#5C6B5E", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: "#5C6B5E", fontSize: "10px" },
          formatter: (val) => formatUSD(val, 2)
        }
      },
      grid: {
        borderColor: "rgba(26,77,46,0.06)",
        strokeDashArray: 4
      },
      legend: {
        position: "top",
        horizontalAlign: "left",
        fontFamily: "Outfit",
        labels: { colors: "#1A4D2E" }
      },
      annotations: {
        points: estimates.map((e, i) => {
          const beat = e.eps_actual - e.eps_estimate;
          return {
            x: e.quarter,
            y: e.eps_actual,
            marker: {
              size: 0,
            },
            label: {
              text: `+${beat.toFixed(2)}`,
              offsetY: -10,
              style: {
                color: "var(--color-fin-green)",
                background: "transparent",
                fontSize: "10px",
                fontWeight: 700
              }
            }
          };
        })
      },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        x: { show: false },
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const q = w.globals.labels[dataPointIndex];
          const est = series[0][dataPointIndex];
          const act = series[1][dataPointIndex];
          const beat = act - est;
          const pct = (beat / est * 100).toFixed(1);
          
          return `
            <div class="px-4 py-4 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 w-[190px] !h-auto border border-white/10">
              <div class="text-white/40 text-[10px] uppercase tracking-wider font-bold">${q} Results</div>
              <div class="flex justify-between items-center">
                <span class="text-white/60">Estimate</span>
                <span class="font-bold">${formatUSD(est)}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-white/60">Actual</span>
                <span class="font-bold text-[#10B981]">${formatUSD(act)}</span>
              </div>
              <div class="h-px bg-white/10 my-1" />
              <div class="flex justify-between items-center">
                <span class="text-white/40 font-medium">Surprise</span>
                <span class="font-bold text-[#10B981]">+${beat.toFixed(2)} (${pct}%)</span>
              </div>
            </div>
          `;
        }
      }
    };
  };

  const series = createMemo(() => [
    {
      name: "Estimate",
      data: props.data.earnings_estimates.eps_actuals_vs_estimates.map(e => e.eps_estimate)
    },
    {
      name: "Actual",
      data: props.data.earnings_estimates.eps_actuals_vs_estimates.map(e => e.eps_actual)
    }
  ]);

  return (
    <div class="col-span-5 premium-card p-6 min-h-[400px] flex flex-col">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h4 class="font-outfit font-bold text-forest text-lg">EPS Performance</h4>
          <p class="text-xs text-earth/60">Actuals vs Estimates</p>
        </div>
        <div class="flex items-center gap-2 px-3 py-1 bg-spring/10 text-forest text-[10px] font-bold rounded-full border border-spring/20">
          <span class="material-icons text-[12px]">check_circle</span>
          <span>4/4 BEATS</span>
        </div>
      </div>
      <div class="flex-1">
        <SolidApexCharts
          type="bar"
          options={chartOptions()}
          series={series()}
          height="100%"
        />
      </div>
    </div>
  );
};
