import { Accessor, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import CloseRoundedIcon from "@suid/icons-material/CloseRounded";

export interface FinancialPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMetrics: Accessor<Set<"revenue" | "earnings" | "eps">>;
  toggleMetric: (metric: "revenue" | "earnings" | "eps") => void;
  periodType: Accessor<"annual" | "quarterly">;
  setPeriodType: (period: "annual" | "quarterly") => void;
  dynamicSubtitle: () => string;
  chartOptions: Accessor<ApexOptions>;
  series: Accessor<{ name: string; type: string; data: number[] }[]>;
}

export const FinancialPerformanceModal = (props: FinancialPerformanceModalProps) => {
  return (
    <Portal>
      <Show when={props.isOpen}>
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-sm transition-opacity duration-300 p-6"
          onClick={props.onClose}
        >
          <div 
            class="bg-white rounded-3xl p-8 w-[95vw] max-w-5xl h-[85vh] shadow-2xl relative flex flex-col border border-forest/10"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div class="flex items-center justify-between mb-6">
              <div>
                <h4 class="font-outfit font-bold text-forest text-2xl">Financial Performance</h4>
                <p class="text-sm text-earth/60">{props.dynamicSubtitle()} (Expanded View)</p>
              </div>
              
              <div class="flex items-center gap-3">
                {/* Expanded Metric Selector Pills (including EPS) */}
                <div class="flex items-center gap-2">
                  <button 
                    onClick={() => props.toggleMetric("revenue")}
                    class="px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all cursor-pointer border"
                    classList={{
                      "bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30 shadow-sm": props.activeMetrics().has("revenue"),
                      "bg-transparent text-earth border-forest/15 hover:border-forest/30": !props.activeMetrics().has("revenue")
                    }}
                  >
                    REVENUE
                  </button>
                  <button 
                    onClick={() => props.toggleMetric("earnings")}
                    class="px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all cursor-pointer border"
                    classList={{
                      "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 shadow-sm": props.activeMetrics().has("earnings"),
                      "bg-transparent text-earth border-forest/15 hover:border-forest/30": !props.activeMetrics().has("earnings")
                    }}
                  >
                    EARNINGS
                  </button>
                  <button 
                    onClick={() => props.toggleMetric("eps")}
                    class="px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all cursor-pointer border"
                    classList={{
                      "bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30 shadow-sm": props.activeMetrics().has("eps"),
                      "bg-transparent text-earth border-forest/15 hover:border-forest/30": !props.activeMetrics().has("eps")
                    }}
                  >
                    EPS
                  </button>
                </div>

                <div class="w-px h-6 bg-forest/10" />

                {/* Expanded Period Selector Toggle */}
                <div class="flex items-center bg-sage/10 p-1 rounded-xl border border-forest/5">
                  <button 
                    onClick={() => props.setPeriodType("annual")}
                    class={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all hover:cursor-pointer ${
                      props.periodType() === "annual" ? "bg-white text-forest shadow-sm" : "text-earth/60 hover:text-earth"
                    }`}
                  >
                    ANNUAL
                  </button>
                  <button 
                    onClick={() => props.setPeriodType("quarterly")}
                    class={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all hover:cursor-pointer ${
                      props.periodType() === "quarterly" ? "bg-white text-forest shadow-sm" : "text-earth/60 hover:text-earth"
                    }`}
                  >
                    QUARTERLY
                  </button>
                </div>
                
                <button 
                  onClick={props.onClose}
                  class="p-2 rounded-xl text-earth/40 hover:text-forest hover:bg-sage/15 border border-transparent hover:border-forest/10 transition-all cursor-pointer flex items-center justify-center"
                  title="Close"
                >
                  <CloseRoundedIcon style={{ "font-size": "20px" }} />
                </button>
              </div>
            </div>

            <div class="flex-1 min-h-0">
              <SolidApexCharts
                type="bar"
                options={props.chartOptions()}
                series={props.series()}
                height="100%"
              />
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );
};
