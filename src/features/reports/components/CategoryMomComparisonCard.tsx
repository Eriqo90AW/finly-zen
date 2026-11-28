import type { ChartConfiguration } from "chart.js";
import { createMemo, Show } from "solid-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartCanvas,
  ChartLegend,
  createShadcnExternalTooltip,
  formatCompactRupiah,
} from "../../../components/ui";
import type { CategoryBreakdownItem } from "../model/reportsAnalytics";

interface CategoryMomComparisonCardProps {
  categories: CategoryBreakdownItem[];
  currentLabel: string;
  previousLabel: string;
  loading: boolean;
}

export function CategoryMomComparisonCard(props: CategoryMomComparisonCardProps) {
  const topSix = createMemo(() => props.categories.slice(0, 6));

  const chartConfig = (): ChartConfiguration<"bar"> => ({
    type: "bar",
    data: {
      labels: topSix().map((c) => c.name),
      datasets: [
        {
          label: props.previousLabel,
          data: topSix().map((c) => c.previous),
          backgroundColor: "#cbe9d4",
          hoverBackgroundColor: "#b5dfc1",
          borderRadius: 5,
          borderSkipped: false,
          barPercentage: 0.78,
          categoryPercentage: 0.72,
        },
        {
          label: props.currentLabel,
          data: topSix().map((c) => c.current),
          backgroundColor: topSix().map((c) =>
            c.previous > 0 && c.current > c.previous * 1.15 ? "#d47b5a" : "#1a4d2e",
          ),
          hoverBackgroundColor: topSix().map((c) =>
            c.previous > 0 && c.current > c.previous * 1.15 ? "#c16443" : "#2d7d46",
          ),
          borderRadius: 5,
          borderSkipped: false,
          barPercentage: 0.78,
          categoryPercentage: 0.72,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: createShadcnExternalTooltip<"bar">(),
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: "#5c6b5e",
            font: { family: "Outfit", size: 11, weight: 500 },
          },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: "rgba(26, 77, 46, 0.07)" },
          ticks: {
            color: "#5c6b5e",
            font: { family: "Outfit", size: 11 },
            callback: (val) => formatCompactRupiah(Number(val)),
          },
        },
      },
    },
  });

  return (
    <Card class="flex flex-col">
      <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Category Comparison (MoM)</CardTitle>
          <CardDescription>
            {props.currentLabel} vs {props.previousLabel} across your top 6 categories.
          </CardDescription>
        </div>
        <ChartLegend
          items={[
            { label: props.previousLabel, color: "#cbe9d4" },
            { label: props.currentLabel, color: "#1a4d2e" },
            { label: "+15% Spike", color: "#d47b5a" },
          ]}
        />
      </CardHeader>

      <CardContent class="flex-1">
        <Show
          when={!props.loading && topSix().length > 0}
          fallback={
            <div class="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-forest/15 bg-surface-muted/60 text-sm text-earth">
              {props.loading
                ? "Loading comparison..."
                : "Not enough category data to compare periods."}
            </div>
          }
        >
          <div class="h-[270px] w-full">
            <ChartCanvas
              config={chartConfig}
              ariaLabel="Category spending month over month comparison"
            />
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}
