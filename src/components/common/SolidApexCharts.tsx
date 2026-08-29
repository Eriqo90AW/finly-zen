import { createEffect, mergeProps, on, onCleanup, onMount } from "solid-js";
import { unwrap } from "solid-js/store";
import ApexCharts, { ApexOptions } from "apexcharts";

export interface SolidApexChartsProps {
  type?: string;
  series?: any[];
  width?: string | number;
  height?: string | number;
  options?: ApexOptions | Record<string, any>;
  ref?: (chart: ApexCharts | undefined) => void;
  [key: `on${string}`]: any;
}

export const SolidApexCharts = (props: SolidApexChartsProps) => {
  let rootEl: HTMLDivElement | undefined;
  let chart: ApexCharts | null = null;
  let isMounted = false;

  const merged = mergeProps(
    {
      height: "auto",
      width: "100%",
      series: [],
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

    const newOptions: Record<string, any> = {
      chart: {
        type: merged.type,
        height: merged.height,
        width: merged.width,
        events: {},
      },
      series: unwrap(merged.series) || [],
    };

    for (const key in props) {
      if (key.startsWith("on") && typeof (props as any)[key] === "function") {
        const eventKey = key.charAt(2).toLowerCase() + key.slice(3);
        newOptions.chart.events[eventKey] = (props as any)[key];
      }
    }

    const rawOptions = unwrap(merged.options) || {};
    const config = {
      ...rawOptions,
      ...newOptions,
      chart: {
        ...(rawOptions.chart || {}),
        ...(newOptions.chart || {}),
        events: {
          ...(rawOptions.chart?.events || {}),
          ...(newOptions.chart?.events || {}),
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
            chart.updateOptions(unwrap(options) || {});
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
