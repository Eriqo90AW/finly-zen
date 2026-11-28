import { ArrowDownRight, ArrowUpRight, Percent, PiggyBank, TrendingDown, TrendingUp } from "lucide-solid";
import { Show } from "solid-js";
import { Badge, Card, CardContent } from "../../../components/ui";
import { formatRupiah } from "../../../utils/format";
import type { ReportsKpiMetrics } from "../model/reportsAnalytics";

interface ReportsKpiStripProps {
  kpis: ReportsKpiMetrics;
  loading?: boolean;
}

function DeltaBadge(props: {
  value: number | null;
  suffix?: string;
  invertGood?: boolean;
}) {
  return (
    <Show
      when={props.value !== null}
      fallback={<Badge variant="outline">No prior</Badge>}
    >
      {(() => {
        const val = props.value ?? 0;
        const isUp = val > 0;
        const isFlat = val === 0;
        const isGood = props.invertGood ? val <= 0 : val >= 0;
        const variant = isFlat ? "outline" : isGood ? "success" : "destructive";
        return (
          <Badge variant={variant}>
            {isUp ? (
              <ArrowUpRight class="h-3 w-3" />
            ) : val < 0 ? (
              <ArrowDownRight class="h-3 w-3" />
            ) : null}
            {val > 0 ? `+${val}` : val}
            {props.suffix ?? "%"}
          </Badge>
        );
      })()}
    </Show>
  );
}

export function ReportsKpiStrip(props: ReportsKpiStripProps) {
  return (
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent class="p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-outfit text-xs font-semibold uppercase tracking-wider text-earth">
              Period Income
            </span>
            <DeltaBadge value={props.kpis.incomeDeltaPct} />
          </div>
          <p class="mt-3 font-cormorant text-3xl font-bold text-forest tabular-nums">
            {props.loading ? "—" : formatRupiah(props.kpis.income)}
          </p>
          <p class="mt-1.5 flex items-center gap-1 font-outfit text-xs text-earth">
            <TrendingUp class="h-3.5 w-3.5 text-mid-green" />
            vs previous period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-outfit text-xs font-semibold uppercase tracking-wider text-earth">
              Period Expenses
            </span>
            <DeltaBadge value={props.kpis.expenseDeltaPct} invertGood />
          </div>
          <p class="mt-3 font-cormorant text-3xl font-bold text-forest tabular-nums">
            {props.loading ? "—" : formatRupiah(props.kpis.expense)}
          </p>
          <p class="mt-1.5 flex items-center gap-1 font-outfit text-xs text-earth">
            <TrendingDown class="h-3.5 w-3.5 text-terracotta" />
            excludes internal transfers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-outfit text-xs font-semibold uppercase tracking-wider text-earth">
              Net Cashflow
            </span>
            <DeltaBadge value={props.kpis.netDeltaPct} />
          </div>
          <p
            class={`mt-3 font-cormorant text-3xl font-bold tabular-nums ${
              props.kpis.netSavings < 0 ? "text-rose-600" : "text-forest"
            }`}
          >
            {props.loading ? "—" : formatRupiah(props.kpis.netSavings)}
          </p>
          <p class="mt-1.5 flex items-center gap-1 font-outfit text-xs text-earth">
            <PiggyBank class="h-3.5 w-3.5 text-mid-green" />
            income minus expenses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-outfit text-xs font-semibold uppercase tracking-wider text-earth">
              Savings Rate
            </span>
            <DeltaBadge value={props.kpis.savingsRateDeltaPts} suffix=" pts" />
          </div>
          <p class="mt-3 font-cormorant text-3xl font-bold text-forest tabular-nums">
            {props.loading ? "—" : `${props.kpis.savingsRate}%`}
          </p>
          <p class="mt-1.5 flex items-center gap-1 font-outfit text-xs text-earth">
            <Percent class="h-3.5 w-3.5 text-mid-green" />
            share of income retained
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
