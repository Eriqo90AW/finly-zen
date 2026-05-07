import { For } from "solid-js";
import { state } from "../store";
import { SolidApexCharts } from 'solid-apexcharts';
import { ApexOptions } from "apexcharts";
import { formatRupiah } from "../utils/format";

const Reports = () => {
  const stackedBarOptions: ApexOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    colors: ['#1A4D2E', '#2D7D46', '#52C278', '#C8E6C9', '#E8F5EC'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    xaxis: { categories: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'], labels: { style: { fontFamily: 'Outfit' } } },
    legend: { position: 'top', horizontalAlign: 'left', fontFamily: 'Outfit' },
    grid: { borderColor: 'rgba(26,77,46,0.05)' }
  };

  const cashFlowOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    colors: ['#52C278'],
    stroke: { curve: 'smooth', width: 3 },
    fill: { 
      type: 'gradient', 
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } 
    },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], labels: { style: { fontFamily: 'Outfit' } } },
    yaxis: { labels: { style: { fontFamily: 'Outfit' } } }
  };

  const radarOptions: ApexOptions = {
    chart: { type: 'radar', toolbar: { show: false } },
    colors: ['#1A4D2E', '#52C278'],
    labels: ['Food', 'Transport', 'Shop', 'Ent.', 'Health', 'Utils'],
    stroke: { width: 2 },
    fill: { opacity: 0.4 },
    markers: { size: 0 },
    legend: { show: true, position: 'bottom', fontFamily: 'Outfit' }
  };

  const merchants = [
    { name: "Starbucks", amount: 150000, percent: 85 },
    { name: "Tokopedia", amount: 250000, percent: 60 },
    { name: "Ranch Market", amount: 1000000, percent: 100 },
    { name: "Netflix", amount: 185000, percent: 10 },
    { name: "Shell", amount: 750000, percent: 45 },
  ];

  return (
    <div class="space-y-8 animate-fade-in-up pb-20">
      <h2 class="text-3xl font-cormorant text-forest">Cultivation Reports</h2>

      <div class="grid grid-cols-12 gap-8">
        {/* Stacked History */}
        <div class="col-span-8 premium-card p-8 bg-white h-[400px]">
          <h4 class="font-outfit font-bold text-forest mb-6">6-Month Spending Structure</h4>
          <div class="h-[300px]">
             <SolidApexCharts 
              options={stackedBarOptions} 
              series={[
                { name: 'Fixed', data: [1200, 1200, 1200, 1200, 1200, 1200] },
                { name: 'Variable', data: [440, 505, 414, 671, 227, 413] },
                { name: 'Leisure', data: [130, 230, 200, 80, 130, 220] }
              ]} 
              type="bar" 
              height="100%" 
             />
          </div>
        </div>

        {/* Top Merchants */}
        <div class="col-span-4 premium-card p-8 bg-white flex flex-col">
          <h4 class="font-outfit font-bold text-forest mb-6">Top Merchants</h4>
          <div class="flex-1 space-y-6">
            <For each={merchants}>
              {(m) => (
                <div class="space-y-2">
                  <div class="flex justify-between text-xs font-outfit">
                    <span class="font-bold text-forest">{m.name}</span>
                    <span class="text-earth">{formatRupiah(m.amount)}</span>
                  </div>
                  <div class="h-1.5 w-full bg-sage/30 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-forest rounded-full"
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Cash Flow */}
        <div class="col-span-7 premium-card p-8 bg-white h-[350px]">
          <h4 class="font-outfit font-bold text-forest mb-6">Net Cash Flow</h4>
          <div class="h-[250px]">
             <SolidApexCharts 
              options={cashFlowOptions} 
              series={[{ name: 'Net Flow', data: [1200, -200, 800, 450, 1100, 900] }]} 
              type="area" 
              height="100%" 
             />
          </div>
        </div>

        {/* Category Radar */}
        <div class="col-span-5 premium-card p-8 bg-white h-[350px]">
          <h4 class="font-outfit font-bold text-forest mb-2">Category Comparison</h4>
          <p class="text-[10px] text-earth uppercase tracking-widest mb-4">This Month vs Last</p>
          <div class="h-[220px]">
             <SolidApexCharts 
              options={radarOptions} 
              series={[
                { name: 'This Month', data: [80, 50, 30, 40, 100, 20] },
                { name: 'Last Month', data: [20, 30, 40, 80, 20, 80] }
              ]} 
              type="radar" 
              height="100%" 
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
