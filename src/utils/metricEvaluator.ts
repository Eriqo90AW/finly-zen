import {
  METRIC_RULES,
  type MetricEvaluation,
  type MetricSignal,
} from "./metricRules";

export type { MetricEvaluation, MetricSignal };

export function evaluateMetric(
  label: string,
  value: number | null | undefined,
): MetricEvaluation {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return {
      signal: "neutral",
      badgeText: "N/A",
      tooltip: `No data available for ${label}.`,
      thresholdContext: "Threshold: N/A",
    };
  }

  const rule = METRIC_RULES[label];
  if (rule) {
    return rule(value);
  }

  return {
    signal: "neutral",
    badgeText: "Info",
    tooltip: `${label}: ${value}. No standard evaluation threshold applied.`,
    thresholdContext: "Informational only",
  };
}
