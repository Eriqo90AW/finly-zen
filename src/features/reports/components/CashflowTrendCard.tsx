import type { ChartConfiguration } from "chart.js";
import { createSignal, Show } from "solid-js";
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../../components/ui";
import type { MonthlyCashflowPoint } from "../model/reportsAnalytics";

interface CashflowTrendCardProps {
  series: MonthlyCashflowPoint[];
  loading: boolean;
}

export function CashflowTrendCard(props: CashflowTrendCardProps) {
  const [view, setView] = createSignal<"grouped" | "net">("grouped");

  const hasData = () =>
    props.series.some((p) => p.income > 0 || p.expense > 0);

  const barConfig = (): ChartConfiguration<"bar"> => ({
    type: "bar",
    data: {
      labels: props.series.map((p) => p.label),
      datasets: [
        {
          label: "Income",
          data: props.series.map((p) => p.income),
          backgroundColor: "#52c278",
          hoverBackgroundColor: "#2d7d46",
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.78,
          categoryPercentage: 0.68,
        },
        {
          label: "Expenses",
          data: props.series.map((p) => p.expense),
          backgroundColor: "#1a4d2e",
          hoverBackgroundColor: "#2c5364",
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.78,
          categoryPercentage: 0.68,
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

  const netConfig = (): ChartConfiguration<"line"> => ({
    type: "line",
    data: {
      labels: props.series.map((p) => p.label),
      datasets: [
        {
          label: "Net Cashflow",
          data: props.series.map((p) => p.net),
          borderColor: "#1a4d2e",
          backgroundColor: "rgba(82, 194, 120, 0.16)",
          pointBackgroundColor: props.series.map((p) =>
            p.net < 0 ? "#d47b5a" : "#1a4d2e",
          ),
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
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
          external: createShadcnExternalTooltip<"line">(),
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
    <Card>
      <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Cashflow Overview</CardTitle>
          <CardDescription>
            Trailing {props.series.length}-period income, expenses, and net savings trajectory.
          </CardDescription>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <ChartLegend
            items={
              view() === "grouped"
                ? [
                    { label: "Income", color: "#52c278" },
                    { label: "Expenses", color: "#1a4d2e" },
                  ]
                : [{ label: "Net Savings", color: "#1a4d2e" }]
            }
          />
          <Tabs
            value={view()}
            onChange={(v) => setView(v as "grouped" | "net")}
            class="w-auto"
          >
            <TabsList>
              <TabsTrigger value="grouped">Income vs Expense</TabsTrigger>
              <TabsTrigger value="net">Net Savings</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        <Show
          when={!props.loading}
          fallback={
            <div class="flex h-[300px] items-center justify-center rounded-xl bg-surface-muted text-sm text-earth">
              Loading cashflow chart...
            </div>
          }
        >
          <Show
            when={hasData()}
            fallback={
              <div class="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-forest/15 bg-surface-muted/60 text-sm text-earth">
                No transactions found across these periods.
              </div>
            }
          >
            <div class="h-[310px] w-full">
              <Show
                when={view() === "grouped"}
                fallback={
                  <ChartCanvas
                    config={netConfig}
                    ariaLabel="Net cashflow trend over time"
                  />
                }
              >
                <ChartCanvas
                  config={barConfig}
                  ariaLabel="Income versus expenses over time"
                />
              </Show>
            </div>
          </Show>
        </Show>
      </CardContent>
    </Card>
  );
}
