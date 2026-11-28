import { Store } from "lucide-solid";
import { For, Show } from "solid-js";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from "../../../components/ui";
import { formatRupiah } from "../../../utils/format";
import type { MerchantSummary } from "../model/reportsAnalytics";

interface TopMerchantsCardProps {
  merchants: MerchantSummary[];
  loading: boolean;
}

export function TopMerchantsCard(props: TopMerchantsCardProps) {
  const maxSpend = () => props.merchants[0]?.total || 1;

  return (
    <Card class="flex flex-col">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Store class="h-4 w-4 text-mid-green" />
          Top Merchants &amp; Payees
        </CardTitle>
        <CardDescription>
          Highest expense destinations ranked by total spend this period.
        </CardDescription>
      </CardHeader>

      <CardContent class="flex-1">
        <Show
          when={!props.loading && props.merchants.length > 0}
          fallback={
            <div class="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-forest/15 bg-surface-muted/60 text-sm text-earth">
              {props.loading ? "Loading top merchants..." : "No merchant expenses in this period."}
            </div>
          }
        >
          <div class="space-y-4">
            <For each={props.merchants}>
              {(m) => (
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2 font-outfit text-xs">
                    <div class="flex min-w-0 items-center gap-2">
                      <span class="truncate font-semibold text-forest">{m.name}</span>
                      <Badge variant="outline" class="shrink-0 text-[10px]">
                        {m.category}
                      </Badge>
                    </div>
                    <div class="shrink-0 text-right tabular-nums">
                      <span class="font-bold text-forest">{formatRupiah(m.total)}</span>
                      <span class="ml-1.5 text-[11px] text-earth">
                        ({m.count}×)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={Math.round((m.total / maxSpend()) * 100)}
                    tone="default"
                    class="h-1.5"
                  />
                </div>
              )}
            </For>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}
