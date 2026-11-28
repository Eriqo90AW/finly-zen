import { Show } from "solid-js";
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

interface CreateGoalDialogProps {
  open: boolean;
  name: string;
  onNameChange: (value: string) => void;
  emoji: string;
  onEmojiChange: (value: string) => void;
  target: string;
  onTargetChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: Event) => void;
}

export function CreateGoalDialog(props: CreateGoalDialogProps) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !props.busy) props.onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plant a new seed</DialogTitle>
          <DialogDescription>
            Set a target amount and deadline to track this savings goal in your garden.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={props.onSubmit} class="space-y-4">
          <div class="space-y-1.5">
            <Label for="goal-name">Goal name</Label>
            <Input
              id="goal-name"
              placeholder="e.g. Japan Trip"
              value={props.name}
              onInput={(e) => props.onNameChange(e.currentTarget.value)}
              required
            />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="space-y-1.5">
              <Label for="goal-emoji">Emoji</Label>
              <Input
                id="goal-emoji"
                value={props.emoji}
                onInput={(e) => props.onEmojiChange(e.currentTarget.value)}
              />
            </div>
            <div class="col-span-2 space-y-1.5">
              <Label for="goal-target">Target amount (Rp)</Label>
              <Input
                id="goal-target"
                type="number"
                min="0.01"
                step="any"
                placeholder="10000000"
                value={props.target}
                onInput={(e) => props.onTargetChange(e.currentTarget.value)}
                required
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="goal-date">Target date</Label>
            <Input
              id="goal-date"
              type="date"
              value={props.date}
              onInput={(e) => props.onDateChange(e.currentTarget.value)}
              required
            />
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
            <Button type="submit" disabled={props.busy}>
              {props.busy ? "Saving..." : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
