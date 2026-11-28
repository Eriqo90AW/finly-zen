import { Dialog as KobalteDialog } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import { Show, splitProps, type ComponentProps, type JSX } from "solid-js";
import { cn } from "../../utils/cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: JSX.Element;
}

export function Dialog(props: DialogProps) {
  return (
    <KobalteDialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.children}
    </KobalteDialog>
  );
}

export interface DialogContentProps {
  class?: string;
  showClose?: boolean;
  children?: JSX.Element;
}

export function DialogContent(props: DialogContentProps) {
  const [local, others] = splitProps(props, ["class", "showClose", "children"]);
  return (
    <KobalteDialog.Portal>
      <KobalteDialog.Overlay class="fixed inset-0 z-[60] bg-near-black/40 backdrop-blur-[2px]" />
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <KobalteDialog.Content
          class={cn(
            "pointer-events-auto relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-forest/15 bg-white p-6 shadow-2xl focus:outline-none",
            local.class,
          )}
          {...others}
        >
          {local.children}
          <Show when={local.showClose !== false}>
            <KobalteDialog.CloseButton
              class="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-earth/70 transition-colors hover:bg-sage/60 hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 cursor-pointer"
              aria-label="Close dialog"
            >
              <X class="h-4 w-4" />
            </KobalteDialog.CloseButton>
          </Show>
        </KobalteDialog.Content>
      </div>
    </KobalteDialog.Portal>
  );
}

export function DialogHeader(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("flex flex-col gap-1.5 pr-8 text-left mb-4", local.class)}
      {...others}
    />
  );
}

export function DialogTitle(props: ComponentProps<typeof KobalteDialog.Title>) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <KobalteDialog.Title
      class={cn(
        "font-outfit text-lg font-bold leading-none tracking-tight text-forest",
        local.class,
      )}
      {...others}
    />
  );
}

export function DialogDescription(
  props: ComponentProps<typeof KobalteDialog.Description>,
) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <KobalteDialog.Description
      class={cn("font-outfit text-xs text-earth leading-relaxed", local.class)}
      {...others}
    />
  );
}

export function DialogFooter(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn(
        "mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        local.class,
      )}
      {...others}
    />
  );
}
