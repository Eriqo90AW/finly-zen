import { createMemo, createSignal, createEffect, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { formatUSDCompact, formatUSD } from "../../utils/format";
import type { FinancialPerformanceChartProps } from "../../types";
import OpenInFullRoundedIcon from "@suid/icons-material/OpenInFullRounded";
import { FinancialPerformanceModal } from "./modals/FinancialPerformanceModal";

export const FinancialPerformanceChart = (props: FinancialPerformanceChartProps) => {
  const [periodType, setPeriodType] = createSignal<"annual" | "quarterly">(
    (localStorage.getItem("finly_performance_chart_period") as "annual" | "quarterly") || "annual"
  );
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [activeMetrics, setActiveMetrics] = createSignal<Set<"revenue" | "earnings" | "eps">>(
    new Set(["revenue", "earnings"])
  );

  const toggleMetric = (metric: "revenue" | "earnings" | "eps") => {
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
      return () => window.removeEventListener("keydown", handleKeyDown);
    } else {
      if (activeMetrics().has("eps")) {
        setActiveMetrics((prev) => {
          const next = new Set(prev);
          next.delete("eps");
          if (next.size === 0) {
            next.add("revenue");
          }
          return next;
        });
      }
    }
  });

  const financialData = createMemo(() => {
    return periodType() === "annual"
      ? props.data.segment_data.annual_financials
      : props.data.segment_data.quarterly_financials;
  });

  const series = createMemo(() => {
    const active = activeMetrics();
    const list: { name: string; type: string; data: number[] }[] = [];
    const shares = props.data.advanced_ratios.shares_outstanding || 1;

    if (active.has("revenue")) {
      list.push({
        name: "Revenue",
        type: "bar",
        data: financialData().map(f => f.revenue || 0)
      });
    }
    if (active.has("earnings")) {
      list.push({
        name: "Earnings",
        type: "bar",
        data: financialData().map(f => f.earnings || 0)
      });
    }
    if (active.has("eps")) {
      list.push({
        name: "EPS",
        type: active.has("revenue") || active.has("earnings") ? "line" : "bar",
        data: financialData().map(f => f.earnings / shares)
      });
    }
    return list;
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
          columnWidth: "45%",
          borderRadius: 6,
          borderRadiusApplication: "end"
        }
      },
      dataLabels: { enabled: false },
      stroke: {
        width: series().map(s => s.type === "line" ? 3 : 0),
        curve: "smooth"
      },
      colors: series().map(s => {
        if (s.name === "Revenue") return "#6366F1";
        if (s.name === "Earnings") return "#10B981";
        return "#A855F7";
      }),
      xaxis: {
        categories: financialData().map(f => "year" in f ? f.year.toString() : f.period),
        labels: { style: { colors: "#5C6B5E", fontSize: "12px" } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: (() => {
        const active = activeMetrics();
        const seriesList = series();

        if (!active.has("eps")) {
          return {
            labels: {
              style: { colors: "#5C6B5E", fontSize: "10px" },
              formatter: (val) => formatUSDCompact(val)
            }
          };
        }

        return seriesList.map((s, idx) => {
          const isEPS = s.name === "EPS";
          return {
            seriesName: s.name,
            opposite: isEPS,
            show: idx === 0 || isEPS,
            title: {
              text: s.name,
              style: { color: isEPS ? "#A855F7" : "#5C6B5E", fontFamily: "Outfit", fontWeight: "bold" }
            },
            labels: {
              style: { colors: isEPS ? "#A855F7" : "#5C6B5E", fontSize: "10px" },
              formatter: (val) => isEPS ? formatUSD(val, 2) : formatUSDCompact(val)
            }
          };
        });
      })(),
      grid: {
        borderColor: "rgba(26,77,46,0.15)",
        strokeDashArray: 4
      },
      legend: {
        show: false
      },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        x: { show: false },
        custom: function({ series: seriesValues, seriesIndex, dataPointIndex, w }) {
          const item = financialData()[dataPointIndex];
          const label = "year" in item ? item.year : item.period;
          const seriesList = series();

          let rowsHtml = "";

          seriesList.forEach((s, idx) => {
            const val = seriesValues[idx]?.[dataPointIndex] || 0;
            const isEPS = s.name === "EPS";
            const displayValue = isEPS ? formatUSD(val, 2) : formatUSDCompact(val);
            const dotColor = s.name === "Revenue" ? "#6366F1" : s.name === "Earnings" ? "#10B981" : "#A855F7";

            let growthInfo = "";
            if (dataPointIndex > 0) {
              const prevValue = seriesValues[idx]?.[dataPointIndex - 1];
              if (prevValue && prevValue !== 0) {
                const growth = ((val - prevValue) / Math.abs(prevValue) * 100).toFixed(1);
                growthInfo = `<span style="color: ${parseFloat(growth) >= 0 ? '#10B981' : '#F43F5E'};">(${parseFloat(growth) >= 0 ? '+' : ''}${growth}%)</span>`;
              }
            }

            let extraInfo = "";
            if (s.name === "Earnings") {
              const rev = item.revenue;
              const margin = rev !== 0 ? (item.earnings / rev * 100).toFixed(1) : "0";
              extraInfo = `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; padding-left: 16px; color: rgba(255,255,255,0.4);">
                  <span>Net Margin</span>
                  <span style="font-weight: 700; color: #10B981;">${margin}%</span>
                </div>
              `;
            }

            rowsHtml += `
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${dotColor}; display: inline-block; flex-shrink: 0;"></span>
                    ${s.name}
                  </span>
                  <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <span style="font-weight: 700; color: white;">${displayValue}</span>
                    ${growthInfo ? `<span style="font-size: 9px; font-weight: 500;">${growthInfo}</span>` : ''}
                  </div>
                </div>
                ${extraInfo}
              </div>
              ${idx < seriesList.length - 1 ? '<div style="height: 1px; background: rgba(255,255,255,0.1); margin: 6px 0;"></div>' : ''}
            `;
          });

          return `
            <div style="padding: 16px; background: rgba(28, 43, 32, 0.2); color: white; font-size: 12px; font-family: Outfit, sans-serif; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 8px; width: 240px; border: 1px solid rgba(255,255,255,0.1); box-sizing: border-box;">
              <div style="color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">${label} ${periodType() === "annual" ? 'Fiscal Year' : 'Period'}</div>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
                ${rowsHtml}
              </div>
            </div>
          `;
        }
      }
    };
  });


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
              onClick={() => toggleMetric("revenue")}
              class="px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all cursor-pointer border"
              classList={{
                "bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30 shadow-sm": activeMetrics().has("revenue"),
                "bg-transparent text-earth border-forest/15 hover:border-forest/30": !activeMetrics().has("revenue")
              }}
            >
              REVENUE
            </button>
            <button 
              onClick={() => toggleMetric("earnings")}
              class="px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all cursor-pointer border"
              classList={{
                "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 shadow-sm": activeMetrics().has("earnings"),
                "bg-transparent text-earth border-forest/15 hover:border-forest/30": !activeMetrics().has("earnings")
              }}
            >
              EARNINGS
            </button>
          </div>

          <div class="w-px h-6 bg-forest/10" />

          {/* Period Selector Toggle */}
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
          
          <button 
            onClick={() => setIsModalOpen(true)}
            class="p-2 rounded-xl text-earth/40 hover:text-forest hover:bg-sage/15 border border-transparent hover:border-forest/10 transition-all cursor-pointer flex items-center justify-center"
            title="Expand Chart"
          >
            <OpenInFullRoundedIcon style={{ "font-size": "18px" }} />
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
