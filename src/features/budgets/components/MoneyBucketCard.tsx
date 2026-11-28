import { Pencil, ShieldCheck, Trash2 } from "lucide-solid";
import { For, Show } from "solid-js";
import { Badge, Button, Card, CardContent, Progress } from "../../../components/ui";
import type { MoneyBucketRecord } from "../../../data/moneyFrameworkData";
import { formatRupiah } from "../../../utils/format";
import {
  computeBucketProjection,
  type EmergencyBaselinePeriod,
} from "../model/budgetMetrics";

interface MoneyBucketCardProps {
  bucket: MoneyBucketRecord;
  currentBalance: number;
  target: number | null;
  assignedAccountNames: string[];
  baselinePeriods: EmergencyBaselinePeriod[];
  onEdit: () => void;
  onRemove: () => void;
}

export function MoneyBucketCard(props: MoneyBucketCardProps) {
  const pct = () => {
    const t = props.target;
    if (!t || t <= 0) return 0;
    return Math.max(0, Math.min(100, (props.currentBalance / t) * 100));
  };

  const projection = () =>
    computeBucketProjection(
      props.target,
      props.currentBalance,
      Number(props.bucket.contribution),
    );

  const avgMonthlyBaseline = () =>
    props.target !== null ? props.target / 6 : 0;

  return (
    <Card class="flex flex-col justify-between transition-shadow hover:shadow-md">
      <CardContent class="flex flex-1 flex-col gap-4 p-5">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <h4 class="truncate font-outfit text-base font-bold text-forest">
                {props.bucket.name}
              </h4>
              <Show when={props.bucket.is_emergency}>
                <Badge variant="success">
                  <ShieldCheck class="h-3 w-3" />
                  6x Emergency
                </Badge>
              </Show>
            </div>
            <p class="font-outfit text-xs text-earth">
              Planned: {formatRupiah(Number(props.bucket.contribution))} / month
            </p>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit bucket ${props.bucket.name}`}
              onClick={props.onEdit}
            >
              <Pencil class="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove bucket ${props.bucket.name}`}
              class="hover:bg-rose-50 hover:text-rose-600"
              onClick={props.onRemove}
            >
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-outfit text-xl font-bold text-forest tabular-nums">
              {formatRupiah(props.currentBalance)}
            </span>
            <span class="font-outfit text-xs text-earth tabular-nums">
              / {props.target === null ? "Insufficient data" : formatRupiah(props.target)}
            </span>
          </div>
          <Progress
            value={pct()}
            tone={projection().status === "complete" ? "success" : "default"}
          />
          <div class="flex items-center justify-between gap-2 text-xs">
            <span class="font-outfit font-semibold text-forest tabular-nums">
              {Math.round(pct())}% funded
            </span>
            <Badge
              variant={
                projection().status === "complete"
                  ? "success"
                  : projection().status === "tracking"
                    ? "secondary"
                    : "outline"
              }
            >
              {projection().label}
            </Badge>
          </div>
        </div>

        <div class="mt-auto space-y-2 border-t border-forest/10 pt-3">
          <div class="flex flex-wrap items-center gap-1.5">
            <Show
              when={props.assignedAccountNames.length > 0}
              fallback={
                <span class="font-outfit text-xs text-earth/70">No accounts assigned</span>
              }
            >
              <For each={props.assignedAccountNames}>
                {(name) => <Badge variant="outline">{name}</Badge>}
              </For>
            </Show>
          </div>

          <Show when={props.bucket.is_emergency}>
            <p class="font-outfit text-[11px] leading-relaxed text-earth/80">
              {props.baselinePeriods.length
                ? `6× avg spending (${props.baselinePeriods.map((p) => p.label).join(", ")}): ${formatRupiah(avgMonthlyBaseline())}/period`
                : "Needs completed periods with spending history to estimate target."}
            </p>
          </Show>
        </div>
      </CardContent>
    </Card>
  );
}
