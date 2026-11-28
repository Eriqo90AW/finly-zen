import type { ChartConfiguration } from "chart.js";
import { createMemo, For, Show } from "solid-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartCanvas,
  createShadcnExternalTooltip,
  formatCompactRupiah,
} from "../../../components/ui";
import { formatRupiah } from "../../../utils/format";
import type {
  CategoryBreakdownItem,
  RecurringSplitSummary,
} from "../model/reportsAnalytics";

interface CategoryBreakdownCardProps {
  categories: CategoryBreakdownItem[];
  recurringSplit: RecurringSplitSummary;
  loading: boolean;
}

export function CategoryBreakdownCard(props: CategoryBreakdownCardProps) {
  const activeCategories = createMemo(() =>
    props.categories.filter((c) => c.current > 0),
  );
  const totalSpend = createMemo(() =>
    activeCategories().reduce((sum, c) => sum + c.current, 0),
  );

  const donutConfig = (): ChartConfiguration<"doughnut"> => ({
    type: "doughnut",
    data: {
      labels: activeCategories().map((c) => c.name),
      datasets: [
        {
          label: "Spent",
          data: activeCategories().map((c) => c.current),
          backgroundColor: activeCategories().map((c) => c.color),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: createShadcnExternalTooltip<"doughnut">(),
        },
      },
    },
  });

  return (
    <Card class="flex flex-col">
      <CardHeader>
        <CardTitle>Spending Breakdown</CardTitle>
        <CardDescription>
          Share of current-period expenses by category plus fixed vs discretionary mix.
        </CardDescription>
      </CardHeader>

      <CardContent class="flex flex-1 flex-col gap-5">
        <Show
          when={!props.loading && activeCategories().length > 0}
          fallback={
            <div class="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-forest/15 bg-surface-muted/60 text-sm text-earth">
              {props.loading ? "Loading categories..." : "No expenses recorded in this period."}
            </div>
          }
        >
          <div class="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
            <div class="relative mx-auto h-[210px] w-[210px]">
              <ChartCanvas
                config={donutConfig}
                ariaLabel="Category spending breakdown doughnut chart"
              />
              <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span class="font-outfit text-[10px] font-bold uppercase tracking-widest text-earth">
                  Total Spend
                </span>
                <span class="font-cormorant text-xl font-bold text-forest tabular-nums">
                  {formatCompactRupiah(totalSpend())}
                </span>
              </div>
            </div>

            <div class="max-h-[210px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar-thin">
              <For each={activeCategories().slice(0, 7)}>
                {(item) => (
                  <div class="flex items-center justify-between gap-2 font-outfit text-xs">
                    <span class="flex min-w-0 items-center gap-2">
                      <span
                        class="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ "background-color": item.color }}
                      />
                      <span class="truncate font-medium text-forest">{item.name}</span>
                    </span>
                    <span class="shrink-0 tabular-nums text-earth">
                      <strong class="font-semibold text-forest">{item.sharePct}%</strong>
                      <span class="ml-1.5 text-[11px]">{formatCompactRupiah(item.current)}</span>
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div class="mt-auto space-y-2 rounded-xl border border-forest/10 bg-surface-muted/60 p-3.5">
            <div class="flex items-center justify-between font-outfit text-xs">
              <span class="font-semibold text-forest">Fixed / Recurring vs Discretionary</span>
              <span class="text-earth tabular-nums">
                {props.recurringSplit.recurringPct}% / {props.recurringSplit.discretionaryPct}%
              </span>
            </div>
            <div class="flex h-2 w-full overflow-hidden rounded-full bg-sage">
              <div
                class="h-full bg-forest transition-all duration-500"
                style={{ width: `${props.recurringSplit.recurringPct}%` }}
              />
              <div
                class="h-full bg-spring transition-all duration-500"
                style={{ width: `${props.recurringSplit.discretionaryPct}%` }}
              />
            </div>
            <div class="flex justify-between font-outfit text-[11px] text-earth tabular-nums">
              <span>Fixed: {formatRupiah(props.recurringSplit.recurring)}</span>
              <span>Discretionary: {formatRupiah(props.recurringSplit.discretionary)}</span>
            </div>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}
