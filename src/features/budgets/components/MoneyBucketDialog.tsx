import { Check } from "lucide-solid";
import { For, Show } from "solid-js";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "../../../components/ui";
import type {
  MoneyBucketAccountLink,
  SaveMoneyBucketInput,
} from "../../../data/moneyFrameworkData";
import type { Account } from "../../../types";

interface MoneyBucketDialogProps {
  draft: SaveMoneyBucketInput | null;
  accounts: Account[];
  links: MoneyBucketAccountLink[];
  saving: boolean;
  onPatch: (patch: Partial<SaveMoneyBucketInput>) => void;
  onClose: () => void;
  onSave: (e: Event) => void;
}

export function MoneyBucketDialog(props: MoneyBucketDialogProps) {
  return (
    <Dialog
      open={Boolean(props.draft)}
      onOpenChange={(isOpen) => {
        if (!isOpen && !props.saving) props.onClose();
      }}
    >
      <DialogContent class="max-w-lg">
        <Show when={props.draft}>
          {(d) => (
            <>
              <DialogHeader>
                <DialogTitle>{d().id ? "Edit money bucket" : "New money bucket"}</DialogTitle>
                <DialogDescription>
                  Assign accounts to track balances against a target and planned monthly
                  contribution.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={props.onSave} class="space-y-4">
                <div class="space-y-1.5">
                  <Label for="bucket-name">Bucket name</Label>
                  <Input
                    id="bucket-name"
                    placeholder="e.g. Emergency Fund, Investment Reserve"
                    required
                    value={d().name}
                    onInput={(e) => props.onPatch({ name: e.currentTarget.value })}
                  />
                </div>

                <label class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-forest/15 bg-surface-muted/60 px-3 py-2.5 text-sm text-forest">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-forest rounded"
                    checked={d().is_emergency}
                    onChange={(e) =>
                      props.onPatch({ is_emergency: e.currentTarget.checked })
                    }
                  />
                  <span class="font-outfit text-xs font-medium">
                    Auto-calculate as Emergency Fund (6× average monthly spending)
                  </span>
                </label>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Show when={!d().is_emergency}>
                    <div class="space-y-1.5">
                      <Label for="bucket-target">Target balance (Rp)</Label>
                      <Input
                        id="bucket-target"
                        type="number"
                        min="0"
                        required
                        value={d().target}
                        onInput={(e) =>
                          props.onPatch({ target: Number(e.currentTarget.value) })
                        }
                      />
                    </div>
                  </Show>

                  <div class={`space-y-1.5 ${d().is_emergency ? "sm:col-span-2" : ""}`}>
                    <Label for="bucket-contribution">Planned contribution / month (Rp)</Label>
                    <Input
                      id="bucket-contribution"
                      type="number"
                      min="0"
                      required
                      value={d().contribution}
                      onInput={(e) =>
                        props.onPatch({ contribution: Number(e.currentTarget.value) })
                      }
                    />
                  </div>
                </div>

                <fieldset class="space-y-2">
                  <legend class="font-outfit text-xs font-semibold text-earth">
                    Assigned Accounts
                  </legend>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <For each={props.accounts}>
                      {(acc) => {
                        const occupied = () =>
                          props.links.some(
                            (l) => l.account_id === acc.id && l.bucket_id !== d().id,
                          );
                        const selected = () => d().accounts.includes(acc.id);
                        return (
                          <button
                            type="button"
                            disabled={occupied()}
                            onClick={() => {
                              const next = selected()
                                ? d().accounts.filter((id) => id !== acc.id)
                                : [...d().accounts, acc.id];
                              props.onPatch({ accounts: next });
                            }}
                            class={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left font-outfit text-xs transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                              selected()
                                ? "border-forest bg-sage/60 font-semibold text-forest"
                                : "border-forest/15 bg-white text-earth hover:bg-sage/20"
                            }`}
                          >
                            <span class="flex min-w-0 items-center gap-2">
                              <span
                                class="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  "background-color": acc.color || "#1a4d2e",
                                }}
                              />
                              <span class="truncate">
                                {acc.name}
                                {occupied() ? " (assigned)" : ""}
                              </span>
                            </span>
                            <Show when={selected()}>
                              <Check class="h-3.5 w-3.5 shrink-0 text-forest" />
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </fieldset>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={props.saving}
                    onClick={props.onClose}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={props.saving}>
                    {props.saving ? "Saving..." : "Save bucket"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </Show>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteBucketDialogProps {
  bucketName: string | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteBucketDialog(props: DeleteBucketDialogProps) {
  return (
    <Dialog
      open={Boolean(props.bucketName)}
      onOpenChange={(isOpen) => {
        if (!isOpen && !props.deleting) props.onClose();
      }}
    >
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove bucket?</DialogTitle>
          <DialogDescription>
            Remove "{props.bucketName}" from your Money Framework. Your assigned accounts and
            transactions will stay intact.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={props.deleting}
            onClick={props.onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={props.deleting}
            onClick={props.onConfirm}
          >
            {props.deleting ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
