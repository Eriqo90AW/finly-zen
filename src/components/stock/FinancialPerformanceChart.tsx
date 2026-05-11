import { createMemo } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { StockData } from "../../data/stockData";
import { formatUSDCompact } from "../../utils/format";

interface FinancialPerformanceChartProps {
  data: StockData;
}

export const FinancialPerformanceChart = (props: FinancialPerformanceChartProps) => {
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
      categories: props.data.segment_data.annual_financials.map(f => f.year.toString()),
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
      borderColor: "rgba(26,77,46,0.06)",
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
        const year = w.globals.labels[dataPointIndex];
        const rev = series[0][dataPointIndex];
        const earn = series[1][dataPointIndex];
        const margin = (earn / rev * 100).toFixed(1);
        
        return `
          <div class="px-4 py-4 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 w-[200px] !h-auto border border-white/10">
            <div class="text-white/40 text-[10px] uppercase tracking-wider font-bold">${year} Fiscal Year</div>
            <div class="flex justify-between items-center">
              <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[#6366F1]"></span> Revenue</span>
              <span class="font-bold">${formatUSDCompact(rev)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[#10B981]"></span> Earnings</span>
              <span class="font-bold">${formatUSDCompact(earn)}</span>
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
      data: props.data.segment_data.annual_financials.map(f => f.revenue)
    },
    {
      name: "Earnings",
      data: props.data.segment_data.annual_financials.map(f => f.earnings)
    }
  ]);

  return (
    <div class="col-span-7 premium-card p-6 min-h-[400px] flex flex-col">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h4 class="font-outfit font-bold text-forest text-lg">Financial Performance</h4>
          <p class="text-xs text-earth/60">Annual Revenue & Net Earnings</p>
        </div>
        <span class="px-3 py-1 bg-sage/20 text-forest text-[10px] font-bold rounded-lg uppercase tracking-widest border border-forest/5">FY22 - FY25</span>
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
