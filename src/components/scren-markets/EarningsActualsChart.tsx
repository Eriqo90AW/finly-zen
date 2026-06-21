import { createMemo, createSignal, Show, createEffect } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { formatUSD } from "../../utils/format";
import type { EarningsActualsChartProps } from "../../types";


export const EarningsActualsChart = (props: EarningsActualsChartProps) => {
  const [periodType, setPeriodType] = createSignal<"annual" | "quarterly">(
    (localStorage.getItem("finly_earnings_chart_period") as "annual" | "quarterly") || "quarterly"
  );

  createEffect(() => {
    localStorage.setItem("finly_earnings_chart_period", periodType());
  });

  const epsData = createMemo(() => {
    const earningsEstimates = props.data.earnings_estimates || {} as any;
    const epsActuals = earningsEstimates.eps_actuals_vs_estimates || [];
    const segmentData = props.data.segment_data || {} as any;
    const annuals = segmentData.annual_financials || [];

    if (periodType() === "quarterly") {
      return epsActuals.map((e: any) => ({
        label: e.quarter || "",
        estimate: e.eps_estimate,
        actual: e.eps_actual,
        surprise: (e.eps_actual ?? 0) - (e.eps_estimate ?? 0),
        surprisePct: e.eps_estimate && e.eps_estimate !== 0 
          ? ((e.eps_actual ?? 0) - e.eps_estimate) / Math.abs(e.eps_estimate) * 100 
          : 0
      }));
    } else {
      // Annual EPS derived from earnings and shares outstanding
      const shares = props.data.advanced_ratios?.shares_outstanding || 1;
      return annuals.map((f: any) => {
        const eps = (f.earnings || 0) / shares;
        return {
          label: f.year ? f.year.toString() : "",
          estimate: null,
          actual: eps,
          surprise: null,
          surprisePct: null
        };
      });
    }
  });

  const chartOptions = createMemo((): ApexOptions => {
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
          columnWidth: periodType() === "quarterly" ? "60%" : "40%",
          borderRadius: 4,
          borderRadiusApplication: "end"
        }
      },
      dataLabels: { enabled: false },
      markers: { size: 0 }, // Ensure no dots/markers
      colors: ["var(--color-fin-purple)", "var(--color-fin-green)"],
      xaxis: {
        categories: epsData().map(e => e.label),
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
        borderColor: "rgba(26,77,46,0.15)",
        strokeDashArray: 4
      },
      legend: {
        show: periodType() === "quarterly",
        position: "top",
        horizontalAlign: "left",
        fontFamily: "Outfit",
        labels: { colors: "#1A4D2E" }
      },
      annotations: {
        points: periodType() === "quarterly" ? epsData().map((e) => {
          return {
            x: e.label,
            y: Math.max(e.actual ?? 0, e.estimate ?? 0, 0),
            marker: { size: 0 },
            label: {
              text: e.surprise && e.surprise > 0 ? `+${e.surprise.toFixed(2)}` : `${e.surprise?.toFixed(2)}`,
              offsetY: -10,
              style: {
                color: e.surprise && e.surprise > 0 ? "var(--color-fin-green)" : "var(--color-fin-purple)",
                background: "transparent",
                fontSize: "10px",
                fontWeight: 700
              }
            }
          };
        }) : []
      },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        x: { show: false },
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const item = epsData()[dataPointIndex];
          const est = item.estimate;
          const act = item.actual;
          
          let growthInfo = "";
          if (dataPointIndex > 0) {
            const prevAct = epsData()[dataPointIndex - 1].actual;
            const growth = ((act - prevAct) / Math.abs(prevAct) * 100).toFixed(1);
            growthInfo = `<div class="flex justify-between items-center">
              <span class="text-white/40">Growth vs Prev</span>
              <span class="font-bold ${parseFloat(growth) >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}">${parseFloat(growth) >= 0 ? '+' : ''}${growth}%</span>
            </div>`;
          }

          return `
            <div class="px-4 py-4 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 w-[190px] !h-auto border border-white/10">
              <div class="text-white/40 text-[10px] uppercase tracking-wider font-bold">${item.label} Results</div>
              ${est !== null ? `
              <div class="flex justify-between items-center">
                <span class="text-white/60">Estimate</span>
                <span class="font-bold">${formatUSD(est)}</span>
              </div>
              ` : ''}
              <div class="flex justify-between items-center">
                <span class="text-white/60">${est !== null ? 'Actual' : 'EPS'}</span>
                <span class="font-bold text-[#10B981]">${formatUSD(act)}</span>
              </div>
              <div class="h-px bg-white/10 my-1" />
              ${item.surprise !== null ? `
              <div class="flex justify-between items-center">
                <span class="text-white/40 font-medium">Surprise</span>
                <span class="font-bold text-[#10B981]">${item.surprise > 0 ? '+' : ''}${item.surprise.toFixed(2)} (${item.surprisePct?.toFixed(1)}%)</span>
              </div>
              ` : ''}
              ${growthInfo}
            </div>
          `;
        }
      }
    };
  });

  const series = createMemo(() => {
    if (periodType() === "quarterly") {
      return [
        {
          name: "Estimate",
          data: epsData().map(e => e.estimate)
        },
        {
          name: "Actual",
          data: epsData().map(e => e.actual)
        }
      ];
    } else {
      return [
        {
          name: "Actual EPS",
          data: epsData().map(e => e.actual)
        }
      ];
    }
  });

  return (
    <div class="col-span-5 premium-card p-6 min-h-[400px] flex flex-col">
      <div class="flex items-center justify-between mb-6 hover:cursor-default">
        <div>
          <h4 class="font-outfit font-bold text-forest text-lg">EPS Performance</h4>
          <p class="text-xs text-earth/60">{periodType() === "annual" ? "Historical" : "Actuals vs Estimates"}</p>
        </div>
        
        <div class="flex items-center gap-3">
          <Show when={periodType() === "quarterly"}>
            <div class="flex items-center gap-2 px-3 py-1 bg-spring/10 text-forest text-[10px] font-bold rounded-full border border-spring/20">
              <span class="material-icons text-[12px]">check_circle</span>
              <span>BEATS</span>
            </div>
          </Show>
          
          <div class="flex items-center bg-sage/10 p-1 rounded-xl border border-forest/5">
            <button 
              onClick={() => setPeriodType("annual")}
              class={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all hover:cursor-pointer ${
                periodType() === "annual" ? "bg-white text-forest shadow-sm" : "text-earth/60 hover:text-earth"
              }`}
            >
              ANNUAL
            </button>
            <button 
              onClick={() => setPeriodType("quarterly")}
              class={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all hover:cursor-pointer ${
                periodType() === "quarterly" ? "bg-white text-forest shadow-sm" : "text-earth/60 hover:text-earth"
              }`}
            >
              QUARTERLY
            </button>
          </div>
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
