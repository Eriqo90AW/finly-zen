import type { ChartConfiguration } from "chart.js";
import { Show } from "solid-js";
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
import type { BudgetCategorySummary } from "../model/budgetMetrics";

interface BudgetComparisonChartProps {
  categories: BudgetCategorySummary[];
  periodRangeLabel: string;
  loading: boolean;
  unavailable: boolean;
}

export function BudgetComparisonChart(props: BudgetComparisonChartProps) {
  const chartConfig = (): ChartConfiguration<"bar"> => {
    const items = props.categories.slice(0, 10);
    return {
      type: "bar",
      data: {
        labels: items.map((c) => c.name),
        datasets: [
          {
            label: "Budgeted",
            data: items.map((c) => c.limit ?? 0),
            backgroundColor: "#cbe9d4",
            hoverBackgroundColor: "#b5dfc1",
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.78,
            categoryPercentage: 0.7,
          },
          {
            label: "Actual",
            data: items.map((c) => c.spent),
            backgroundColor: items.map((c) =>
              c.limit !== null && c.spent > c.limit ? "#d47b5a" : "#1a4d2e",
            ),
            hoverBackgroundColor: items.map((c) =>
              c.limit !== null && c.spent > c.limit ? "#c16443" : "#2d7d46",
            ),
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.78,
            categoryPercentage: 0.7,
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
            grid: {
              color: "rgba(26, 77, 46, 0.07)",
            },
            ticks: {
              color: "#5c6b5e",
              font: { family: "Outfit", size: 11 },
              callback: (val) => formatCompactRupiah(Number(val)),
            },
          },
        },
      },
    };
  };

  return (
    <Card>
      <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Budget vs Actual Spending</CardTitle>
          <CardDescription>
            {props.periodRangeLabel} · Exceeded categories highlight in terracotta.
          </CardDescription>
        </div>
        <ChartLegend
          items={[
            { label: "Budgeted", color: "#cbe9d4" },
            { label: "On Track", color: "#1a4d2e" },
            { label: "Exceeded", color: "#d47b5a" },
          ]}
        />
      </CardHeader>
      <CardContent>
        <Show
          when={!props.loading}
          fallback={
            <div class="flex h-[280px] items-center justify-center rounded-xl bg-surface-muted text-sm text-earth">
              {props.unavailable ? "Budget data unavailable." : "Loading budget chart..."}
            </div>
          }
        >
          <Show
            when={props.categories.length > 0}
            fallback={
              <div class="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-forest/15 bg-surface-muted/60 text-sm text-earth">
                No category budgets or expenses recorded in this period.
              </div>
            }
          >
            <div class="h-[290px] w-full">
              <ChartCanvas
                config={chartConfig}
                ariaLabel="Budget versus actual spending by category"
              />
            </div>
          </Show>
        </Show>
      </CardContent>
    </Card>
  );
}
