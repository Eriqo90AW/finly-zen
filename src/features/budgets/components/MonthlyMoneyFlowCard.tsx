import { AlertTriangle, ArrowRight } from "lucide-solid";
import { For, Show } from "solid-js";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui";
import type { MoneyBucketRecord } from "../../../data/moneyFrameworkData";
import { formatRupiah } from "../../../utils/format";

interface MonthlyMoneyFlowCardProps {
  income: number;
  expense: number;
  planned: number;
  remainder: number;
  buckets: MoneyBucketRecord[];
}

export function MonthlyMoneyFlowCard(props: MonthlyMoneyFlowCardProps) {
  const denominator = () =>
    Math.max(props.income, props.expense + props.planned, 1);

  const expensePct = () => Math.min(100, (props.expense / denominator()) * 100);
  const plannedPct = () =>
    Math.min(100 - expensePct(), (props.planned / denominator()) * 100);
  const unallocatedPct = () =>
    props.remainder > 0
      ? Math.max(0, 100 - expensePct() - plannedPct())
      : 0;

  return (
    <Card>
      <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Monthly Money Flow</CardTitle>
          <CardDescription>
            How recorded period income flows into spending, planned buckets, and unallocated cash.
          </CardDescription>
        </div>
        <Badge variant={props.remainder < 0 ? "destructive" : "success"}>
          {props.remainder < 0
            ? `Shortfall ${formatRupiah(-props.remainder)}`
            : `${formatRupiah(props.remainder)} unallocated`}
        </Badge>
      </CardHeader>

      <CardContent class="space-y-5">
        {/* Stacked proportional flow bar */}
        <div class="space-y-2">
          <div class="flex h-3 w-full overflow-hidden rounded-full bg-sage/60">
            <div
              class="h-full bg-terracotta transition-all duration-500"
              style={{ width: `${expensePct()}%` }}
              title={`Spending: ${formatRupiah(props.expense)}`}
            />
            <div
              class="h-full bg-forest transition-all duration-500"
              style={{ width: `${plannedPct()}%` }}
              title={`Planned buckets: ${formatRupiah(props.planned)}`}
            />
            <Show when={unallocatedPct() > 0}>
              <div
                class="h-full bg-spring transition-all duration-500"
                style={{ width: `${unallocatedPct()}%` }}
                title={`Unallocated: ${formatRupiah(props.remainder)}`}
              />
            </Show>
          </div>
          <div class="flex flex-wrap items-center gap-4 text-[11px] font-outfit text-earth">
            <span class="inline-flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-terracotta" />
              Spending
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-forest" />
              Planned Buckets
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-spring" />
              Unallocated
            </span>
          </div>
        </div>

        {/* 4-column structured breakdown */}
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-forest/10 bg-surface-muted/60 p-4">
            <p class="font-outfit text-[11px] font-semibold uppercase tracking-wider text-earth">
              1. Period Income
            </p>
            <p class="mt-1.5 font-outfit text-lg font-bold text-forest tabular-nums">
              {formatRupiah(props.income)}
            </p>
          </div>

          <div class="rounded-xl border border-forest/10 bg-surface-muted/60 p-4">
            <div class="flex items-center gap-1 font-outfit text-[11px] font-semibold uppercase tracking-wider text-earth">
              <ArrowRight class="h-3 w-3 text-earth/60" />
              <span>2. Spending</span>
            </div>
            <p class="mt-1.5 font-outfit text-lg font-bold text-terracotta-dark tabular-nums">
              {formatRupiah(props.expense)}
            </p>
          </div>

          <div class="rounded-xl border border-forest/10 bg-surface-muted/60 p-4">
            <div class="flex items-center gap-1 font-outfit text-[11px] font-semibold uppercase tracking-wider text-earth">
              <ArrowRight class="h-3 w-3 text-earth/60" />
              <span>3. Planned Buckets</span>
            </div>
            <p class="mt-1.5 font-outfit text-lg font-bold text-forest tabular-nums">
              {formatRupiah(props.planned)}
            </p>
            <Show when={props.buckets.length > 0}>
              <div class="mt-2 space-y-1 border-t border-forest/10 pt-2">
                <For each={props.buckets}>
                  {(b) => (
                    <div class="flex items-center justify-between gap-2 font-outfit text-[11px] text-earth">
                      <span class="truncate">{b.name}</span>
                      <span class="font-medium text-forest tabular-nums">
                        {formatRupiah(Number(b.contribution))}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div
            class={`rounded-xl border p-4 ${
              props.remainder < 0
                ? "border-rose-200 bg-rose-50/70"
                : "border-emerald-200 bg-emerald-50/50"
            }`}
          >
            <div class="flex items-center gap-1 font-outfit text-[11px] font-semibold uppercase tracking-wider text-earth">
              <ArrowRight class="h-3 w-3 text-earth/60" />
              <span>4. Unallocated</span>
            </div>
            <p
              class={`mt-1.5 font-outfit text-lg font-bold tabular-nums ${
                props.remainder < 0 ? "text-rose-700" : "text-emerald-800"
              }`}
            >
              {formatRupiah(props.remainder)}
            </p>
          </div>
        </div>

        <Show when={props.remainder < 0}>
          <div
            role="alert"
            class="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-outfit text-xs font-medium text-rose-800"
          >
            <AlertTriangle class="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              Income after spending and planned bucket contributions is short by{" "}
              <strong>{formatRupiah(-props.remainder)}</strong>.
            </span>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}
