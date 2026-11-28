import { Wallet } from "lucide-solid";
import { createMemo, For, Show } from "solid-js";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  SimpleSelect,
  type SelectOption,
} from "../../../components/ui";
import type { GardenGoal } from "../../../data/gardenData";
import type { Account } from "../../../types";
import { formatNumericInput, formatRupiah } from "../../../utils/format";

const QUICK_WATER_AMOUNTS = [50000, 100000, 500000, 1000000];

interface WaterGoalDialogProps {
  open: boolean;
  goal: GardenGoal | undefined;
  accounts: Account[];
  accountId: string;
  onAccountChange: (id: string) => void;
  amount: string;
  onAmountChange: (raw: string) => void;
  periodLabel: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: Event) => void;
}

export function WaterGoalDialog(props: WaterGoalDialogProps) {
  const accountOptions = createMemo<SelectOption[]>(() =>
    props.accounts.map((account) => ({
      value: account.id,
      label: account.name,
      subtitle: formatRupiah(account.balance ?? 0),
      color: account.color || "#2d7d46",
    })),
  );

  return (
    <Dialog
      open={props.open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !props.busy) props.onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Water {props.goal?.name}</DialogTitle>
          <DialogDescription>
            Choose an account and contribution amount. Account balances reflect your selected
            month and period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={props.onSubmit} class="space-y-4">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <Label>Account</Label>
              <Badge variant="outline" class="text-[10px]">
                {props.periodLabel}
              </Badge>
            </div>

            <SimpleSelect
              options={accountOptions()}
              value={props.accountId}
              onChange={props.onAccountChange}
              placeholder="Select an account"
              ariaLabel="Account"
              disabled={!props.accounts.length || props.busy}
              triggerClass="py-2.5"
              renderTriggerValue={(opt) => (
                <div class="flex min-w-0 items-center gap-2.5">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      "background-color": opt.color ? `${opt.color}18` : "rgba(26,77,46,0.08)",
                      color: opt.color || "#1a4d2e",
                    }}
                  >
                    <Wallet class="h-4 w-4" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-forest">
                      {opt.label}
                    </span>
                    <Show when={opt.subtitle}>
                      <span class="block truncate text-xs text-earth tabular-nums">
                        {opt.subtitle}
                      </span>
                    </Show>
                  </div>
                </div>
              )}
            />

            <Show when={!props.accounts.length}>
              <p class="text-xs text-earth">
                Create an account before watering this goal.
              </p>
            </Show>
          </div>

          <div class="space-y-2">
            <Label for="watering-amount">Amount</Label>
            <div class="relative">
              <span
                aria-hidden="true"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-outfit text-sm font-semibold text-earth"
              >
                Rp
              </span>
              <Input
                id="watering-amount"
                class="pl-10 tabular-nums"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                placeholder="0"
                value={formatNumericInput(props.amount)}
                onInput={(e) => {
                  const raw = e.currentTarget.value.replace(/\D/g, "");
                  props.onAmountChange(raw);
                  e.currentTarget.value = formatNumericInput(raw);
                }}
                required
              />
            </div>

            <div class="flex flex-wrap gap-1.5" aria-label="Quick pick amounts">
              <For each={QUICK_WATER_AMOUNTS}>
                {(value) => (
                  <Button
                    type="button"
                    size="sm"
                    variant={Number(props.amount) === value ? "default" : "outline"}
                    aria-pressed={Number(props.amount) === value}
                    onClick={() => props.onAmountChange(String(value))}
                    class="rounded-full text-xs"
                  >
                    {formatRupiah(value)}
                  </Button>
                )}
              </For>
            </div>
          </div>

          <Show when={props.error}>
            <p role="alert" class="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {props.error}
            </p>
          </Show>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={props.busy}
              onClick={props.onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={props.busy || !props.accounts.length}
            >
              {props.busy ? "Saving..." : "Water goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
