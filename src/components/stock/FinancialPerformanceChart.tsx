import { createMemo, createSignal, createEffect } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { FinancialPerformanceChartProps } from "../../types";
import { formatUSDCompact } from "../../utils/format";


export const FinancialPerformanceChart = (props: FinancialPerformanceChartProps) => {
  const [periodType, setPeriodType] = createSignal<"annual" | "quarterly">(
    (localStorage.getItem("finly_performance_chart_period") as "annual" | "quarterly") || "annual"
  );

  createEffect(() => {
    localStorage.setItem("finly_performance_chart_period", periodType());
  });

  const financialData = createMemo(() => {
    return periodType() === "annual" 
      ? props.data.segment_data.annual_financials 
      : props.data.segment_data.quarterly_financials;
  });

  const chartOptions = (): ApexOptions => ({
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Outfit",
      background: "transparent"
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 6,
        borderRadiusApplication: "end"
      }
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"]
    },
    colors: ["var(--color-fin-blue)", "var(--color-fin-green)"],
    xaxis: {
      categories: financialData().map(f => "year" in f ? f.year.toString() : f.period),
      labels: { style: { colors: "#5C6B5E", fontSize: "12px" } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "#5C6B5E", fontSize: "10px" },
        formatter: (val) => formatUSDCompact(val)
      }
    },
    grid: {
      borderColor: "rgba(26,77,46,0.15)",
      strokeDashArray: 4
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
      labels: { colors: "#1A4D2E" },
      markers: { size: 6, shape: "circle" }
    },
    tooltip: {
      theme: "dark",
      shared: true,
      intersect: false,
      x: { show: false },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const item = financialData()[dataPointIndex];
        const label = "year" in item ? item.year : item.period;
        const rev = series[0][dataPointIndex] || 0;
        const earn = series[1][dataPointIndex] || 0;
        const margin = rev !== 0 ? (earn / rev * 100).toFixed(1) : "0";
        
        // Calculate Growth (YoY for annual, QoQ for quarterly)
        let revGrowth = "";
        let earnGrowth = "";
        if (dataPointIndex > 0) {
          const prevRev = series[0][dataPointIndex - 1];
          const prevEarn = series[1][dataPointIndex - 1];
          const rg = ((rev - prevRev) / prevRev * 100).toFixed(1);
          const eg = ((earn - prevEarn) / prevEarn * 100).toFixed(1);
          revGrowth = `<span class="${parseFloat(rg) >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}">(${parseFloat(rg) >= 0 ? '+' : ''}${rg}%)</span>`;
          earnGrowth = `<span class="${parseFloat(eg) >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}">(${parseFloat(eg) >= 0 ? '+' : ''}${eg}%)</span>`;
        }

        return `
          <div class="px-4 py-4 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 w-[220px] !h-auto border border-white/10">
            <div class="text-white/40 text-[10px] uppercase tracking-wider font-bold">${label} ${periodType() === "annual" ? 'Fiscal Year' : 'Period'}</div>
            <div class="flex justify-between items-center">
              <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[#6366F1]"></span> Revenue</span>
              <div class="flex flex-col items-end">
                <span class="font-bold">${formatUSDCompact(rev)}</span>
                ${revGrowth ? `<span class="text-[9px] font-medium">${revGrowth}</span>` : ''}
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[#10B981]"></span> Earnings</span>
              <div class="flex flex-col items-end">
                <span class="font-bold">${formatUSDCompact(earn)}</span>
                ${earnGrowth ? `<span class="text-[9px] font-medium">${earnGrowth}</span>` : ''}
              </div>
            </div>
            <div class="h-px bg-white/10 my-1" />
            <div class="flex justify-between items-center">
              <span class="text-white/40">Net Margin</span>
              <span class="font-bold text-[#10B981]">${margin}%</span>
            </div>
          </div>
        `;
      }
    }
  });

  const series = createMemo(() => [
    {
      name: "Revenue",
      data: financialData().map(f => f.revenue)
    },
    {
      name: "Earnings",
      data: financialData().map(f => f.earnings)
    }
  ]);

  return (
    <div class="col-span-7 premium-card p-6 min-h-[400px] flex flex-col">
      <div class="flex items-center justify-between mb-6 hover:cursor-default">
        <div>
          <h4 class="font-outfit font-bold text-forest text-lg">Financial Performance</h4>
          <p class="text-xs text-earth/60">{periodType() === "annual" ? "Annual" : "Quarterly"} Revenue & Net Earnings</p>
        </div>
        
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
