import { createMemo, Show } from "solid-js";
import { Tooltip } from "../../../../components/modules/Tooltip";
import type { StockData } from "../../../../types";
import { evaluateMetric } from "../../../../utils/metricEvaluator";
import type { MetricDefinition } from "./fundamentalsCompareData";

export interface CompareMetricCellProps {
  company: StockData;
  metricDef: MetricDefinition;
  isWinner: boolean;
}

export const CompareMetricCell = (props: CompareMetricCellProps) => {
  const metricValue = createMemo(() => props.metricDef.getValue(props.company));
  const evalResult = createMemo(() => evaluateMetric(props.metricDef.label, metricValue().rawValue));

  const isUnavailable = () =>
    metricValue().formatted === "N/A" || metricValue().rawValue == null;

  const cellBg = createMemo(() => {
    if (isUnavailable()) return "bg-white/40 border-forest/5 hover:border-forest/20";
    switch (evalResult().signal) {
      case "good":
        return "bg-emerald-500/15 border-emerald-500/20";
      case "bad":
        return "bg-rose-500/15 border-rose-500/20";
      default:
        return "bg-amber-500/15 border-amber-500/20";
    }
  });

  const signalIcon = createMemo(() => {
    if (isUnavailable()) return "-";
    switch (evalResult().signal) {
      case "good":
        return "✅";
      case "bad":
        return "🔴";
      default:
        return "⚠️";
    }
  });

  const tooltipOverlayColor = createMemo(() => {
    if (isUnavailable()) return "bg-neutral-500";
    switch (evalResult().signal) {
      case "good":
        return "bg-emerald-500";
      case "bad":
        return "bg-rose-500";
      default:
        return "bg-amber-500";
    }
  });

  const tooltipContent = (
    <div class="space-y-1.5 text-left">
      <div class="flex items-center gap-1.5 font-bold text-white text-xs border-b border-white/10 pb-1">
        <span>{signalIcon()}</span>
        <span>{props.metricDef.label} Verdict</span>
      </div>
      <p class="text-[11px] text-white/90 leading-relaxed font-outfit">{evalResult().tooltip}</p>
      <div class="text-[10px] text-white/60 font-semibold pt-0.5">
        {evalResult().thresholdContext}
      </div>
      <Show when={props.isWinner}>
        <div class="text-[10px] text-amber-400 font-bold border-t border-white/10 pt-1 flex items-center gap-1">
          <span class="material-icons text-[12px]">emoji_events</span>
          <span>This is the best value in this row!</span>
        </div>
      </Show>
    </div>
  );

  return (
    <Tooltip
      class="w-full block rounded-xl"
      position="bottom"
      content={tooltipContent}
      overlayBgClass={tooltipOverlayColor()}
    >
      <div
        class={`flex flex-col items-center justify-center py-1 px-2 rounded-lg border transition-all ${cellBg()}`}
      >
        <div class="flex items-center gap-1 justify-center">
          <span class="text-xs font-outfit font-black text-forest">{metricValue().formatted}</span>
          <Show when={props.isWinner}>
            <span class="text-amber-400 material-icons !text-[14px]">emoji_events</span>
          </Show>
        </div>
      </div>
    </Tooltip>
  );
};
