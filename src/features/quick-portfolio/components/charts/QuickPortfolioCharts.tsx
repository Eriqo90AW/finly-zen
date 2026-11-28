import type { ApexOptions } from "apexcharts";
import type { AllocationItem } from "../../../../types";
import type {
  AllocationView,
  PerfKpi,
  PerfPeriod,
  PerfPoint,
  PerfSeriesApexItem,
  PortfolioAllocations,
} from "../../types";
import { AllocationChartCard } from "./AllocationChartCard";
import { PerformanceTrendCard } from "./PerformanceTrendCard";

interface QuickPortfolioChartsProps {
  allocations: PortfolioAllocations;
  allocationView: AllocationView;
  setAllocationView: (v: AllocationView) => void;
  detailAllocations: AllocationItem[];
  perfKpi: PerfKpi | null;
  perfPeriod: PerfPeriod;
  setPerfPeriod: (p: PerfPeriod) => void;
  perfChartReady: boolean;
  perfOptions: ApexOptions;
  perfSeriesApex: PerfSeriesApexItem[];
  perfSeries: PerfPoint[];
  formatVal: (amount: number) => string;
  formatPercent: (amount: number) => string;
}

export const QuickPortfolioCharts = (props: QuickPortfolioChartsProps) => {
  return (
    <div class="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-5">
      <AllocationChartCard
        allocations={props.allocations}
        allocationView={props.allocationView}
        setAllocationView={props.setAllocationView}
        detailAllocations={props.detailAllocations}
        formatVal={props.formatVal}
      />

      <PerformanceTrendCard
        perfKpi={props.perfKpi}
        perfPeriod={props.perfPeriod}
        setPerfPeriod={props.setPerfPeriod}
        perfChartReady={props.perfChartReady}
        perfOptions={props.perfOptions}
        perfSeriesApex={props.perfSeriesApex}
        perfSeries={props.perfSeries}
        formatVal={props.formatVal}
        formatPercent={props.formatPercent}
      />

      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
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
    </div>
  );
};
