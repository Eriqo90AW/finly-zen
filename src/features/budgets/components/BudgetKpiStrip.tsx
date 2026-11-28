import { CalendarClock, Gauge, ShieldAlert, Wallet } from "lucide-solid";
import { Show } from "solid-js";
import { Badge, Card, CardContent, Progress } from "../../../components/ui";
import { formatRupiah } from "../../../utils/format";
import type { BudgetOverviewMetrics } from "../model/budgetMetrics";

interface BudgetKpiStripProps {
  overview: BudgetOverviewMetrics;
  loading?: boolean;
}

export function BudgetKpiStrip(props: BudgetKpiStripProps) {
  const isOverBudget = () => props.overview.remaining < 0;
  const utilizationTone = () => {
    if (props.overview.utilizationPct > 100) return "destructive" as const;
    if (props.overview.utilizationPct >= 80) return "warning" as const;
    return "success" as const;
  };

  return (
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent class="p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-outfit text-xs font-semibold uppercase tracking-wider text-earth">
              Total Budgeted
            </span>
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-sage text-forest">
              <Wallet class="h-4 w-4" />
            </span>
          </div>
          <p class="mt-3 font-cormorant text-3xl font-bold text-forest tabular-nums">
            {props.loading ? "—" : formatRupiah(props.overview.totalBudgeted)}
          </p>
          <p class="mt-1.5 font-outfit text-xs text-earth">
            {props.overview.counts.all - props.overview.counts.unbudgeted} active category limits
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-outfit text-xs font-semibold uppercase tracking-wider text-earth">
              Period Spent
            </span>
            <Badge variant={utilizationTone() === "destructive" ? "destructive" : utilizationTone() === "warning" ? "warning" : "success"}>
              {props.overview.utilizationPct}% used
            </Badge>
          </div>
          <p class="mt-3 font-cormorant text-3xl font-bold text-forest tabular-nums">
            {props.loading ? "—" : formatRupiah(props.overview.totalSpent)}
          </p>
          <div class="mt-2.5">
            <Progress value={props.overview.utilizationPct} tone={utilizationTone()} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-outfit text-xs font-semibold uppercase tracking-wider text-earth">
              {isOverBudget() ? "Over Budget" : "Remaining"}
            </span>
            <span
              class={`flex h-8 w-8 items-center justify-center rounded-xl ${
                isOverBudget() ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              <ShieldAlert class="h-4 w-4" />
            </span>
          </div>
          <p
            class={`mt-3 font-cormorant text-3xl font-bold tabular-nums ${
              isOverBudget() ? "text-rose-600" : "text-forest"
            }`}
          >
            {props.loading
              ? "—"
              : formatRupiah(Math.abs(props.overview.remaining))}
          </p>
          <p class="mt-1.5 font-outfit text-xs text-earth">
            <Show
              when={props.overview.unbudgetedSpent > 0}
              fallback={
                props.overview.counts.exceeded > 0
                  ? `${props.overview.counts.exceeded} categories over limit`
                  : "All budgeted categories on track"
              }
            >
              +{formatRupiah(props.overview.unbudgetedSpent)} unbudgeted spend
            </Show>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-outfit text-xs font-semibold uppercase tracking-wider text-earth">
              Safe Daily Spend
            </span>
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-sage text-forest">
              <CalendarClock class="h-4 w-4" />
            </span>
          </div>
          <p class="mt-3 font-cormorant text-3xl font-bold text-forest tabular-nums">
            {props.loading ? "—" : formatRupiah(props.overview.safeDailySpend)}
          </p>
          <div class="mt-1.5 flex items-center gap-1.5 font-outfit text-xs text-earth">
            <Gauge class="h-3.5 w-3.5 text-mid-green" />
            <span>
              {props.overview.daysRemaining > 0
                ? `${props.overview.daysRemaining} days left in period`
                : "Period completed"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
