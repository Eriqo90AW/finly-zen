import { createEffect, mergeProps, on, onCleanup, onMount } from "solid-js";
import { unwrap } from "solid-js/store";
import ApexCharts, { type ApexOptions } from "apexcharts";

type ApexEventHandler = (...args: never[]) => unknown;
type ApexChartType = NonNullable<ApexOptions["chart"]>["type"];

export interface SolidApexChartsProps {
  type?: string;
  series?: ApexOptions["series"];
  width?: string | number;
  height?: string | number;
  options?: ApexOptions | Record<string, unknown>;
  ref?: (chart: ApexCharts | undefined) => void;
  [key: `on${string}`]: ApexEventHandler | undefined;
}

export const SolidApexCharts = (props: SolidApexChartsProps) => {
  let rootEl: HTMLDivElement | undefined;
  let chart: ApexCharts | null = null;
  let isMounted = false;

  const merged = mergeProps(
    {
      height: "auto",
      width: "100%",
      series: [] as NonNullable<ApexOptions["series"]>,
      type: "line",
    },
    props,
  );

  const init = async () => {
    if (!rootEl || !isMounted || !document.body.contains(rootEl)) {
      return;
    }

    if (chart) {
      try {
        chart.destroy();
      } catch {
        // safe destroy
      }
      chart = null;
    }

    const chartEvents: Record<string, ApexEventHandler> = {};
    const propRecord = props as Record<string, unknown>;
    for (const key in propRecord) {
      const value = propRecord[key];
      if (key.startsWith("on") && typeof value === "function") {
        const eventKey = key.charAt(2).toLowerCase() + key.slice(3);
        chartEvents[eventKey] = value as ApexEventHandler;
      }
    }

    const rawOptions = (unwrap(merged.options) || {}) as ApexOptions;
    const config: ApexOptions = {
      ...rawOptions,
      series: unwrap(merged.series) || [],
      chart: {
        ...(rawOptions.chart || {}),
        type: merged.type as ApexChartType,
        height: merged.height,
        width: merged.width,
        events: {
          ...(rawOptions.chart?.events || {}),
          ...chartEvents,
        },
      },
    };

    if (!rootEl || !isMounted || !document.body.contains(rootEl)) {
      return;
    }

    try {
      chart = new ApexCharts(rootEl, config);
      props.ref?.(chart);
      await chart.render();
    } catch {
      chart = null;
    }
  };

  onMount(() => {
    isMounted = true;
    init();
  });

  createEffect(
    on(
      () => merged.series,
      (series) => {
        if (chart && isMounted) {
          try {
            chart.updateSeries(unwrap(series) || []);
          } catch {
            // safe update
          }
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => merged.options,
      (options) => {
        if (chart && isMounted) {
          try {
            chart.updateOptions((unwrap(options) || {}) as ApexOptions);
          } catch {
            // safe update
          }
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => [merged.type, merged.height, merged.width],
      () => {
        if (isMounted) {
          init();
        }
      },
      { defer: true },
    ),
  );

  onCleanup(() => {
    isMounted = false;
    if (chart) {
      try {
        chart.destroy();
      } catch {
        // safe destroy
      }
      chart = null;
      props.ref?.(undefined);
    }
  });

  return <div ref={rootEl} class="solid-apexcharts-container w-full h-full" />;
};

export default SolidApexCharts;
