import { Landmark } from "lucide-solid";
import { For, Show } from "solid-js";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui";
import { formatRupiah } from "../../../utils/format";
import type { AccountFlowSummary } from "../model/reportsAnalytics";

interface AccountFlowCardProps {
  flows: AccountFlowSummary[];
  loading: boolean;
}

export function AccountFlowCard(props: AccountFlowCardProps) {
  const maxVolume = () =>
    Math.max(
      1,
      ...props.flows.map((f) => Math.max(f.inflow, f.outflow)),
    );

  return (
    <Card class="flex flex-col">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Landmark class="h-4 w-4 text-mid-green" />
          Account Cashflow
        </CardTitle>
        <CardDescription>
          Period inflow, outflow, and net movement per account (excluding transfers).
        </CardDescription>
      </CardHeader>

      <CardContent class="flex-1">
        <Show
          when={!props.loading && props.flows.length > 0}
          fallback={
            <div class="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-forest/15 bg-surface-muted/60 text-sm text-earth">
              {props.loading ? "Loading account flows..." : "No accounts available."}
            </div>
          }
        >
          <div class="space-y-3">
            <For each={props.flows}>
              {(acc) => (
                <div class="rounded-xl border border-forest/10 bg-surface-muted/40 p-3.5 space-y-2.5">
                  <div class="flex items-center justify-between gap-2">
                    <span class="flex min-w-0 items-center gap-2 font-outfit text-sm font-semibold text-forest">
                      <span
                        class="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ "background-color": acc.color }}
                      />
                      <span class="truncate">{acc.name}</span>
                    </span>
                    <Badge variant={acc.net >= 0 ? "success" : "destructive"}>
                      {acc.net >= 0 ? "+" : ""}
                      {formatRupiah(acc.net)}
                    </Badge>
                  </div>

                  <div class="grid grid-cols-2 gap-3 font-outfit text-xs">
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-earth">
                        <span>Inflow</span>
                        <span class="font-semibold text-forest tabular-nums">
                          {formatRupiah(acc.inflow)}
                        </span>
                      </div>
                      <div class="h-1.5 w-full overflow-hidden rounded-full bg-sage/70">
                        <div
                          class="h-full rounded-full bg-spring transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (acc.inflow / maxVolume()) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-earth">
                        <span>Outflow</span>
                        <span class="font-semibold text-terracotta-dark tabular-nums">
                          {formatRupiah(acc.outflow)}
                        </span>
                      </div>
                      <div class="h-1.5 w-full overflow-hidden rounded-full bg-sage/70">
                        <div
                          class="h-full rounded-full bg-terracotta transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (acc.outflow / maxVolume()) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}
