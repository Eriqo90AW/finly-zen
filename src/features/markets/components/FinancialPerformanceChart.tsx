import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import OpenInFullRoundedIcon from "@suid/icons-material/OpenInFullRounded";
import type { FinancialPerformanceChartProps } from "../../../types";
import {
  buildPerformanceChartOptions,
  buildPerformanceSeries,
  type PerformanceMetric,
  type PerformancePeriod,
} from "./financialPerformanceChartConfig";
import { FinancialPerformanceModal } from "./modals/FinancialPerformanceModal";

export const FinancialPerformanceChart = (props: FinancialPerformanceChartProps) => {
  const [periodType, setPeriodType] = createSignal<PerformancePeriod>(
    (localStorage.getItem("finly_performance_chart_period") as PerformancePeriod) || "annual",
  );
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [activeMetrics, setActiveMetrics] = createSignal<Set<PerformanceMetric>>(
    new Set(["revenue", "earnings"]),
  );

  const toggleMetric = (metric: PerformanceMetric) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        if (next.size > 1) {
          next.delete(metric);
        }
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  createEffect(() => {
    localStorage.setItem("finly_performance_chart_period", periodType());
  });

  createEffect(() => {
    if (isModalOpen()) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsModalOpen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
    } else if (activeMetrics().has("eps")) {
      setActiveMetrics((prev) => {
        const next = new Set(prev);
        next.delete("eps");
        if (next.size === 0) {
          next.add("revenue");
        }
        return next;
      });
    }
  });

  const financialData = createMemo(() => {
    const segmentData = props.data.segment_data;
    if (!segmentData) return [];
    return periodType() === "annual"
      ? segmentData.annual_financials || []
      : segmentData.quarterly_financials || [];
  });

  const series = createMemo(() =>
    buildPerformanceSeries(
      financialData(),
      activeMetrics(),
      props.data.advanced_ratios?.shares_outstanding || 1,
    ),
  );

  const chartOptions = createMemo(() =>
    buildPerformanceChartOptions(financialData(), series(), activeMetrics(), periodType()),
  );

  const dynamicSubtitle = () => {
    const active = activeMetrics();
    const parts: string[] = [];
    if (active.has("revenue")) parts.push("Revenue");
    if (active.has("earnings")) parts.push("Net Earnings");
    if (active.has("eps")) parts.push("EPS");

    const metricStr = parts.join(" & ");
    const periodStr = periodType() === "annual" ? "Annual" : "Quarterly";
    return `${periodStr} ${metricStr}`;
  };

  return (
    <div class="col-span-7 premium-card p-6 min-h-[400px] flex flex-col">
      <div class="flex items-center justify-between mb-6 hover:cursor-default">
        <div>
          <h4 class="font-outfit font-bold text-forest text-lg">Financial Performance</h4>
          <p class="text-xs text-earth/60">{dynamicSubtitle()}</p>
        </div>

        <div class="flex items-center gap-3">
          {/* Metric Selector Pills */}
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleMetric("revenue")}
              class="px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all cursor-pointer border"
              classList={{
                "bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30 shadow-sm":
                  activeMetrics().has("revenue"),
                "bg-transparent text-earth border-forest/15 hover:border-forest/30":
                  !activeMetrics().has("revenue"),
              }}
            >
              REVENUE
            </button>
            <button
              type="button"
              onClick={() => toggleMetric("earnings")}
              class="px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all cursor-pointer border"
              classList={{
                "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 shadow-sm":
                  activeMetrics().has("earnings"),
                "bg-transparent text-earth border-forest/15 hover:border-forest/30":
                  !activeMetrics().has("earnings"),
              }}
            >
              EARNINGS
            </button>
          </div>

          <div class="w-px h-6 bg-forest/10" />

          {/* Period Selector Toggle */}
          <div class="flex items-center bg-sage/10 p-1 rounded-xl border border-forest/5">
            <button
              type="button"
              onClick={() => setPeriodType("annual")}
              class={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all hover:cursor-pointer ${
                periodType() === "annual"
                  ? "bg-white text-forest shadow-sm"
                  : "text-earth/60 hover:text-earth"
              }`}
            >
              ANNUAL
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("quarterly")}
              class={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all hover:cursor-pointer ${
                periodType() === "quarterly"
                  ? "bg-white text-forest shadow-sm"
                  : "text-earth/60 hover:text-earth"
              }`}
            >
              QUARTERLY
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            class="p-2 rounded-xl text-earth/40 hover:text-forest hover:bg-sage/15 border border-transparent hover:border-forest/10 transition-all cursor-pointer flex items-center justify-center"
            title="Expand Chart"
          >
            <OpenInFullRoundedIcon style={{ "font-size": "18px" }} />
          </button>
        </div>
      </div>

      <div class="flex-1">
        <SolidApexCharts type="bar" options={chartOptions()} series={series()} height="100%" />
      </div>

      <FinancialPerformanceModal
        isOpen={isModalOpen()}
        onClose={() => setIsModalOpen(false)}
        activeMetrics={activeMetrics}
        toggleMetric={toggleMetric}
        periodType={periodType}
        setPeriodType={setPeriodType}
        dynamicSubtitle={dynamicSubtitle}
        chartOptions={chartOptions}
        series={series}
      />
    </div>
  );
};
