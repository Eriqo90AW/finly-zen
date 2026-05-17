import { For, Show, createMemo } from "solid-js";
import { SolidApexCharts } from 'solid-apexcharts';
import { ApexOptions } from "apexcharts";
import { Portfolio } from "../../types";
import { formatPortfolioValue } from "../../utils/format";
import { portfolioState } from "../../store/portfolioStore";

interface PortfolioChartsProps {
  portfolio: Portfolio;
}

// Helper to generate a deterministic color from a string (the ticker)
const getAssetColor = (ticker: string) => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1'
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const PortfolioCharts = (props: PortfolioChartsProps) => {
  const currency = () => portfolioState.currencyView;
  
  const assetColors = createMemo(() => props.portfolio.assets.map(a => getAssetColor(a.ticker)));
  const cashPercentage = createMemo(() => props.portfolio.totalValue > 0 
    ? (props.portfolio.cash / props.portfolio.totalValue) * 100 
    : 0);

  const donutOptions = createMemo((): ApexOptions => ({
    chart: { 
      type: 'donut',
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: { enabled: true, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 }
      },
      dropShadow: {
        enabled: true,
        blur: 10,
        left: 0,
        top: 4,
        opacity: 0.05,
        color: '#1A4D2E'
      }
    },
    labels: [...props.portfolio.assets.map(a => a.ticker), "Cash"],
    colors: [...assetColors(), "#1A4D2E"], // Use forest green for cash
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { show: false },
    tooltip: { enabled: false },
    states: {
      hover: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '78%',
          labels: { show: false }
        }
      }
    }
  }));

  const lineOptions = createMemo((): ApexOptions => ({
    chart: { 
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: false },
      zoom: { enabled: false },
      dropShadow: {
        enabled: true,
        top: 8,
        left: 0,
        blur: 12,
        opacity: 0.1,
        color: '#1A4D2E'
      }
    },
    dataLabels: { enabled: false },
    colors: ["#1A4D2E"],
    stroke: { 
      curve: 'straight', 
      width: 3, 
      colors: ['#1A4D2E'] 
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0,
        stops: [0, 95, 100],
        colorStops: [
          { offset: 0, color: '#1A4D2E', opacity: 0.3 },
          { offset: 100, color: '#1A4D2E', opacity: 0 }
        ]
      }
    },
    markers: {
      size: 4,
      colors: ['#1A4D2E'],
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: { size: 6 }
    },
    xaxis: {
      type: 'datetime',
      categories: props.portfolio.history.map(h => h.date),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { 
        style: { 
          colors: '#5C6B5E', 
          fontFamily: 'Outfit',
          fontSize: '10px',
          fontWeight: 600
        },
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM \'yy',
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      }
    },
    yaxis: {
      labels: { 
        style: { 
          colors: '#5C6B5E', 
          fontFamily: 'Outfit',
          fontSize: '10px',
          fontWeight: 600
        },
        formatter: (val) => formatPortfolioValue(val, currency(), true)
      }
    },
    grid: { 
      show: true,
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      padding: { left: 20, right: 20, bottom: 0, top: 0 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    tooltip: { 
      shared: true,
      intersect: false,
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const val = series[seriesIndex][dataPointIndex];
        const dateStr = props.portfolio.history[dataPointIndex].date;
        const d = new Date(dateStr);
        const fullDate = d.toLocaleDateString("en-GB", { 
          day: "numeric", 
          month: "long", 
          year: "numeric" 
        });

        return `
          <div class="px-4 py-3 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 min-w-[180px] border border-white/5">
            <span class="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold mb-1">${fullDate}</span>
            <div class="flex justify-between items-center gap-6">
              <span class="flex items-center gap-2 text-white/80">
                <span class="w-2 h-2 rounded-full bg-[#1A4D2E] shadow-[0_0_8px_rgba(26,77,46,0.6)]"></span> 
                Net Worth
              </span>
              <span class="font-bold text-sm tracking-tight">
                ${formatPortfolioValue(val, currency())}
              </span>
            </div>
          </div>
        `;
      }
    }
  }));

  const donutSeries = createMemo(() => [...props.portfolio.assets.map(a => a.actualAllocation), cashPercentage()]);
  const lineSeries = createMemo(() => [{ name: 'Portfolio Value', data: props.portfolio.history.map(h => h.value) }]);

  const assetsValue = () => props.portfolio.totalValue - props.portfolio.cash;

  return (
    <div class="grid grid-cols-12 gap-6 mb-8">
      {/* Asset Allocation Card (CategoryCard Style) */}
      <div class="premium-card p-6 col-span-4 h-[480px] flex flex-col overflow-hidden">
        <h4 class="font-outfit font-bold text-forest mb-6">Asset Allocation</h4>
        
        <div class="relative h-[220px] mb-6">
          <Show when={props.portfolio.totalValue > 0} fallback={
            <div class="w-full h-full flex items-center justify-center text-earth/30 font-outfit text-sm italic">
              No data to display
            </div>
          }>
            <SolidApexCharts 
              options={donutOptions()} 
              series={donutSeries()} 
              type="donut" 
              height="100%" 
            />
            {/* Custom donut center overlay */}
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none pb-4">
              <div class="flex flex-col items-center gap-0.5 font-outfit">
                <span class="text-[9px] uppercase tracking-widest text-earth/50 font-semibold">Market Value</span>
                <span class="text-[14px] font-bold text-forest leading-tight">
                  {formatPortfolioValue(assetsValue(), currency())}
                </span>

                <div class="w-16 h-px bg-forest/15 my-1" />

                <span class="text-[9px] uppercase tracking-widest text-earth/40 font-semibold">Net Worth</span>
                <span class="text-[20px] font-bold text-forest leading-tight">
                  {formatPortfolioValue(props.portfolio.totalValue, currency())}
                </span>
              </div>
            </div>
          </Show>
        </div>

        {/* Asset List with Scrollbar */}
        <div class="flex-1 overflow-hidden flex flex-col">
          <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar-thin space-y-4 max-h-[160px]">
            {/* Cash Entry */}
            <div class="flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <div 
                  class="w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-transparent transition-all duration-300 bg-forest" 
                />
                <div class="flex flex-col">
                  <span class="text-sm font-outfit font-bold text-earth group-hover:text-forest transition-colors leading-tight">
                    Cash
                  </span>
                  <span class="text-[10px] text-earth/40">
                    Liquidity
                  </span>
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
                <div class="flex items-center justify-between group">
                  <div class="flex items-center gap-3">
                    <div 
                      class="w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-transparent transition-all duration-300" 
                      style={{ 'background-color': getAssetColor(asset.ticker) }} 
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

      {/* Performance History Chart */}
      <div class="premium-card p-6 col-span-8 h-[480px] flex flex-col">
        <h4 class="font-outfit font-bold text-forest mb-6">Performance History</h4>
        <div class="flex-1">
          <SolidApexCharts 
            options={lineOptions()} 
            series={lineSeries()} 
            type="area" 
            height="100%"
          />
        </div>
      </div>

      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: rgba(26, 77, 46, 0.05); border-radius: 10px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(26, 77, 46, 0.2); border-radius: 10px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(26, 77, 46, 0.4); }
      `}</style>
    </div>
  );
};

