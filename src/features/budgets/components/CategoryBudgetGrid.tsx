import { Pencil } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../../components/ui";
import { formatRupiah } from "../../../utils/format";
import {
  filterBudgetCategories,
  getBudgetStatus,
  type BudgetCategorySummary,
  type BudgetFilterTab,
  type BudgetOverviewMetrics,
} from "../model/budgetMetrics";

interface CategoryBudgetGridProps {
  categories: BudgetCategorySummary[];
  overview: BudgetOverviewMetrics;
  onEdit: (name: string, limit: number | null) => void;
}

export function CategoryBudgetGrid(props: CategoryBudgetGridProps) {
  const [activeTab, setActiveTab] = createSignal<BudgetFilterTab>("all");

  const filtered = createMemo(() =>
    filterBudgetCategories(props.categories, activeTab()),
  );

  return (
    <Card>
      <CardHeader class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Category Limits</CardTitle>
          <CardDescription>
            Recurring monthly targets across your expense categories. Click any limit to adjust.
          </CardDescription>
        </div>

        <Tabs
          value={activeTab()}
          onChange={(v) => setActiveTab(v as BudgetFilterTab)}
          class="w-auto"
        >
          <TabsList class="flex-wrap h-auto">
            <TabsTrigger value="all">
              All ({props.overview.counts.all})
            </TabsTrigger>
            <TabsTrigger value="at_risk">
              At Risk ({props.overview.counts.atRisk})
            </TabsTrigger>
            <TabsTrigger value="healthy">
              Healthy ({props.overview.counts.healthy})
            </TabsTrigger>
            <TabsTrigger value="unbudgeted">
              Unbudgeted ({props.overview.counts.unbudgeted})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        <Show
          when={filtered().length > 0}
          fallback={
            <div class="rounded-xl border border-dashed border-forest/15 bg-surface-muted/60 py-10 text-center font-outfit text-sm text-earth">
              No categories match this filter for the selected period.
            </div>
          }
        >
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <For each={filtered()}>
              {(cat) => {
                const status = () => getBudgetStatus(cat);
                const pct = () =>
                  cat.limit && cat.limit > 0
                    ? Math.round((cat.spent / cat.limit) * 100)
                    : 0;
                const badgeVariant = () => {
                  const s = status();
                  if (s === "exceeded") return "destructive" as const;
                  if (s === "caution") return "warning" as const;
                  if (s === "healthy") return "success" as const;
                  return "outline" as const;
                };
                const progressTone = () => {
                  const s = status();
                  if (s === "exceeded") return "destructive" as const;
                  if (s === "caution") return "warning" as const;
                  if (s === "healthy") return "success" as const;
                  return "default" as const;
                };
                const statusLabel = () => {
                  const s = status();
                  if (s === "exceeded") return "Exceeded";
                  if (s === "caution") return "Caution";
                  if (s === "healthy") return "Healthy";
                  return "Unbudgeted";
                };

                return (
                  <article class="flex flex-col justify-between gap-4 rounded-xl border border-forest/10 bg-surface-muted/40 p-4 transition-colors hover:border-forest/20 hover:bg-white">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <h4 class="truncate font-outfit text-sm font-bold text-forest">
                            {cat.name}
                          </h4>
                          <Badge variant={badgeVariant()}>{statusLabel()}</Badge>
                        </div>
                        <p class="mt-2 font-outfit text-lg font-bold text-forest tabular-nums">
                          {formatRupiah(cat.spent)}
                          <span class="ml-1 text-xs font-normal text-earth">
                            / {cat.limit === null ? "No limit" : formatRupiah(cat.limit)}
                          </span>
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit budget for ${cat.name}`}
                        onClick={() => props.onEdit(cat.name, cat.limit)}
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div class="space-y-2">
                      <Progress
                        value={cat.limit ? Math.min(100, pct()) : 0}
                        tone={progressTone()}
                      />
                      <div class="flex items-center justify-between font-outfit text-xs text-earth tabular-nums">
                        <span>{cat.limit !== null ? `${pct()}% used` : "Set a monthly cap"}</span>
                        <Show when={cat.limit !== null}>
                          <span
                            class={
                              cat.spent > (cat.limit ?? 0)
                                ? "font-semibold text-rose-600"
                                : "font-medium text-forest"
                            }
                          >
                            {cat.spent > (cat.limit ?? 0)
                              ? `${formatRupiah(cat.spent - (cat.limit ?? 0))} over`
                              : `${formatRupiah((cat.limit ?? 0) - cat.spent)} left`}
                          </span>
                        </Show>
                      </div>
                    </div>
                  </article>
                );
              }}
            </For>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}
