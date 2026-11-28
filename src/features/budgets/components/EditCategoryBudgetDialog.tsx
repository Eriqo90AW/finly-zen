import { For } from "solid-js";
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
import { formatNumericInput, formatRupiah } from "../../../utils/format";

const BUDGET_PRESETS = [500_000, 1_000_000, 2_000_000, 5_000_000];

interface EditCategoryBudgetDialogProps {
  category: string | null;
  amount: string;
  onAmountChange: (raw: string) => void;
  onClose: () => void;
  onSave: (e: Event) => void;
}

export function EditCategoryBudgetDialog(props: EditCategoryBudgetDialogProps) {
  return (
    <Dialog
      open={Boolean(props.category)}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit limit · {props.category}</DialogTitle>
          <DialogDescription>
            This recurring monthly limit applies to every period across all accounts. Enter 0 to
            mark the category as unbudgeted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={props.onSave} class="space-y-4">
          <div class="space-y-2">
            <Label for="category-budget-input">Monthly limit (Rp)</Label>
            <div class="relative">
              <span
                aria-hidden="true"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-outfit text-sm font-semibold text-earth"
              >
                Rp
              </span>
              <Input
                id="category-budget-input"
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
              />
            </div>

            <div class="flex flex-wrap gap-1.5">
              <For each={BUDGET_PRESETS}>
                {(preset) => (
                  <Button
                    type="button"
                    size="sm"
                    variant={Number(props.amount) === preset ? "default" : "outline"}
                    onClick={() => props.onAmountChange(String(preset))}
                    class="rounded-full text-xs"
                  >
                    {formatRupiah(preset)}
                  </Button>
                )}
              </For>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => props.onAmountChange("0")}
                class="rounded-full text-xs"
              >
                Clear
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit">Save limit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
