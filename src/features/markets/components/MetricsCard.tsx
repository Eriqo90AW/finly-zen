import { createMemo, createSignal, For } from "solid-js";
import { Tooltip } from "../../../components/modules/Tooltip";
import type { LocalMetric, MetricsCardProps } from "../../../types";
import { evaluateMetric } from "../../../utils/metricEvaluator";
import { buildMetricCategories, getMetricSignalPresentation } from "./metricsCardData";
import { FundamentalsCompareModal } from "./modals/FundamentalsCompareModal";

const MetricRowItem = (props: { metric: LocalMetric }) => {
  const evalResult = createMemo(() => evaluateMetric(props.metric.label, props.metric.rawValue));
  const presentation = createMemo(() =>
    getMetricSignalPresentation(props.metric.value, evalResult().signal),
  );

  const tooltipContent = (
    <div class="space-y-1.5 text-left">
      <div class="flex items-center gap-1.5 font-bold text-white text-xs border-b border-white/10 pb-1">
        <span>{presentation().icon}</span>
        <span>{props.metric.label} Verdict</span>
      </div>
      <p class="text-[11px] text-white/90 leading-relaxed font-outfit">{evalResult().tooltip}</p>
      <div class="text-[10px] text-white/60 font-semibold pt-0.5">
        {evalResult().thresholdContext}
      </div>
    </div>
  );

  return (
    <Tooltip
      class="w-full block rounded-xl"
      position={props.metric.tooltipPosition || "bottom"}
      content={tooltipContent}
      overlayBgClass={presentation().overlayClass}
    >
      <div
        class={`flex justify-between items-center p-3 rounded-xl border transition-all group cursor-pointer ${presentation().rowClass}`}
      >
        <div class="flex items-center gap-2">
          <div
            class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]"
            style={{ "background-color": props.metric.color }}
          />
          <span class="text-xs text-earth font-medium opacity-80 group-hover:opacity-100 transition-opacity">
            {props.metric.label}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-base font-outfit font-bold text-forest group-hover:scale-102 transition-transform origin-right">
            {props.metric.value}
          </span>
          <span
            class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${presentation().badgeClass}`}
          >
            {evalResult().badgeText}
          </span>
        </div>
      </div>
    </Tooltip>
  );
};

export const MetricsCard = (props: MetricsCardProps) => {
  const [isCompareOpen, setIsCompareOpen] = createSignal(false);
  const categories = createMemo(() => buildMetricCategories(props.data));

  return (
    <div class="premium-card h-full flex flex-col overflow-hidden bg-gradient-to-b from-white to-sage/5 border-forest/10 hover:cursor-default">
      <div class="p-5 border-b border-forest/5 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="material-icons text-forest text-xl">assessment</span>
            <h4 class="font-outfit font-bold text-forest text-lg">Key Metrics</h4>
          </div>

          <button
            type="button"
            onClick={() => setIsCompareOpen(true)}
            class="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black tracking-wider text-forest bg-forest/5 hover:bg-forest/10 border border-forest/10 rounded-lg transition-all cursor-pointer uppercase shadow-sm"
          >
            <span class="material-icons text-xs">compare_arrows</span>
            <span>Compare</span>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        <For each={categories()}>
          {(category) => (
            <div class="space-y-3">
              <div class="flex items-center gap-2 opacity-60">
                <span class="material-icons text-sm">{category.icon}</span>
                <h5 class="text-[10px] font-bold uppercase tracking-[0.15em] text-earth">
                  {category.title}
                </h5>
              </div>

              <div class="grid gap-2">
                <For each={category.metrics}>
                  {(metric) => <MetricRowItem metric={metric} />}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>

      <FundamentalsCompareModal
        isOpen={isCompareOpen()}
        onClose={() => setIsCompareOpen(false)}
        baseCompany={props.data}
      />
    </div>
  );
};
