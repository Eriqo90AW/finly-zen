import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  type ChartType,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipModel,
} from "chart.js";
import { createEffect, For, onCleanup } from "solid-js";
import { cn } from "../../utils/cn";
import { formatRupiah } from "../../utils/format";

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
);

export const CHART_PALETTE = [
  "#1a4d2e",
  "#52c278",
  "#d47b5a",
  "#c29b38",
  "#2c5364",
  "#7d4354",
  "#2d7d46",
  "#9e6b43",
] as const;

export function formatCompactRupiah(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}Rp ${Math.round(abs / 1_000)}k`;
  return `${sign}Rp ${Math.round(abs)}`;
}

export function createShadcnExternalTooltip<T extends ChartType>(
  formatValue: (raw: number) => string = formatRupiah,
) {
  return (context: { chart: Chart<T>; tooltip: TooltipModel<T> }) => {
    const { chart, tooltip } = context;
    const parent = chart.canvas.parentElement;
    if (!parent) return;

    let tooltipEl = parent.querySelector<HTMLDivElement>("[data-shadcn-chart-tooltip]");
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.dataset.shadcnChartTooltip = "true";
      tooltipEl.className =
        "pointer-events-none absolute z-30 min-w-[140px] rounded-xl border border-forest/15 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xs transition-all duration-100";
      tooltipEl.style.opacity = "0";
      parent.appendChild(tooltipEl);
    }

    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = "0";
      return;
    }

    tooltipEl.replaceChildren();

    const titleText = tooltip.title?.filter(Boolean).join(" ") ?? "";
    if (titleText) {
      const titleEl = document.createElement("div");
      titleEl.className = "mb-1.5 font-outfit text-[11px] font-bold text-forest";
      titleEl.textContent = titleText;
      tooltipEl.appendChild(titleEl);
    }

    const listEl = document.createElement("div");
    listEl.className = "space-y-1";

    for (const dp of tooltip.dataPoints) {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between gap-4 font-outfit text-[11px]";

      const left = document.createElement("span");
      left.className = "flex items-center gap-1.5 text-earth";

      const dot = document.createElement("span");
      dot.className = "h-2 w-2 shrink-0 rounded-full";
      const dataset = dp.dataset as {
        backgroundColor?: unknown;
        borderColor?: unknown;
        label?: string;
      };
      const bg = dataset.backgroundColor;
      const border = dataset.borderColor;
      const color = Array.isArray(bg)
        ? String(bg[dp.dataIndex] ?? "#1a4d2e")
        : typeof bg === "string"
          ? bg
          : typeof border === "string"
            ? border
            : "#1a4d2e";
      dot.style.backgroundColor = color;

      const label = document.createElement("span");
      label.textContent = dataset.label || dp.label || "";

      left.appendChild(dot);
      left.appendChild(label);

      const val = document.createElement("span");
      val.className = "font-semibold text-forest tabular-nums";
      const numericVal =
        typeof dp.parsed === "number"
          ? dp.parsed
          : typeof dp.raw === "number"
            ? dp.raw
            : Number((dp.parsed as { y?: number; x?: number } | null)?.y ?? 0);
      val.textContent = formatValue(Number.isFinite(numericVal) ? numericVal : 0);

      row.appendChild(left);
      row.appendChild(val);
      listEl.appendChild(row);
    }

    tooltipEl.appendChild(listEl);

    const parentWidth = parent.clientWidth;
    const tooltipWidth = tooltipEl.offsetWidth || 160;
    const leftPx = Math.min(
      Math.max(8, tooltip.caretX - tooltipWidth / 2),
      Math.max(8, parentWidth - tooltipWidth - 8),
    );
    const topPx = Math.max(8, tooltip.caretY - (tooltipEl.offsetHeight || 60) - 12);

    tooltipEl.style.opacity = "1";
    tooltipEl.style.left = `${leftPx}px`;
    tooltipEl.style.top = `${topPx}px`;
  };
}

export interface ChartCanvasProps<T extends ChartType> {
  config: () => ChartConfiguration<T>;
  class?: string;
  ariaLabel?: string;
}

export function ChartCanvas<T extends ChartType>(props: ChartCanvasProps<T>) {
  let canvasRef: HTMLCanvasElement | undefined;

  createEffect(() => {
    const config = props.config();
    if (!canvasRef) return;
    const instance = new Chart(canvasRef, config);
    onCleanup(() => {
      instance.destroy();
    });
  });

  return (
    <div class={cn("relative h-full w-full", props.class)}>
      <canvas ref={canvasRef} aria-label={props.ariaLabel} role="img" />
    </div>
  );
}

export interface ChartLegendItem {
  label: string;
  color: string;
}

export function ChartLegend(props: { items: ChartLegendItem[]; class?: string }) {
  return (
    <div class={cn("flex flex-wrap items-center gap-3", props.class)}>
      <For each={props.items}>
        {(item) => (
          <div class="inline-flex items-center gap-1.5 font-outfit text-xs font-medium text-earth">
            <span
              class="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ "background-color": item.color }}
            />
            <span>{item.label}</span>
          </div>
        )}
      </For>
    </div>
  );
}
