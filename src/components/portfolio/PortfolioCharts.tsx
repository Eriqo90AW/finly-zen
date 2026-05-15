import { SolidApexCharts } from 'solid-apexcharts';
import { ApexOptions } from "apexcharts";
import { Portfolio } from "../../types";
import { formatPortfolioValue } from "../../utils/format";
import { portfolioState } from "../../store/portfolioStore";

interface PortfolioChartsProps {
  portfolio: Portfolio;
}

export const PortfolioCharts = (props: PortfolioChartsProps) => {
  const currency = () => portfolioState.currencyView;
  
  const donutOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: props.portfolio.assets.map(a => a.ticker),
    colors: ['#1A4D2E', '#4F6F52', '#739072', '#86A789', '#D2E3C8', '#EBF3E8'],
    legend: { position: 'bottom', fontFamily: 'Outfit' },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Allocation',
              formatter: () => 'Total'
            }
          }
        }
      }
    },
    dataLabels: { enabled: false }
  };

  const lineOptions: ApexOptions = {
    chart: { 
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: false }
    },
    stroke: { curve: 'smooth', width: 2, colors: ['#1A4D2E'] },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100, 100],
        colorStops: [
          { offset: 0, color: '#1A4D2E', opacity: 0.4 },
          { offset: 100, color: '#1A4D2E', opacity: 0 }
        ]
      }
    },
    xaxis: {
      type: 'datetime',
      categories: props.portfolio.history.map(h => h.date),
      labels: { style: { colors: '#5C6B5E', fontFamily: 'Outfit' } }
    },
    yaxis: {
      labels: { 
        style: { colors: '#5C6B5E', fontFamily: 'Outfit' },
        formatter: (val) => formatPortfolioValue(val, currency(), true)
      }
    },
    grid: { borderColor: 'rgba(26,77,46,0.05)' },
    tooltip: { 
      theme: 'dark', 
      x: { format: 'dd MMM yyyy' },
      y: {
        formatter: (val) => formatPortfolioValue(val, currency())
      }
    }
  };

  return (
    <div class="grid grid-cols-12 gap-6 mb-8">
      <div class="premium-card p-6 col-span-4 h-[400px] flex flex-col">
        <h4 class="font-outfit font-bold text-forest mb-4">Asset Allocation</h4>
        <div class="flex-1 flex items-center justify-center">
          {props.portfolio.assets.length > 0 ? (
            <SolidApexCharts 
              options={donutOptions} 
              series={props.portfolio.assets.map(a => a.actualAllocation)} 
              type="donut" 
              width="100%"
            />
          ) : (
            <div class="text-earth/30 font-outfit text-sm italic">No assets to display</div>
          )}
        </div>
      </div>

      <div class="premium-card p-6 col-span-8 h-[400px] flex flex-col">
        <h4 class="font-outfit font-bold text-forest mb-4">Performance History</h4>
        <div class="flex-1">
          <SolidApexCharts 
            options={lineOptions} 
            series={[{ name: 'Portfolio Value', data: props.portfolio.history.map(h => h.value) }]} 
            type="area" 
            height="100%"
          />
        </div>
      </div>
    </div>
  );
};
