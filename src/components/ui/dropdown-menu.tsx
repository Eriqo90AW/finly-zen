import {
  DropdownMenu as KobalteDropdownMenu,
  type DropdownMenuRadioItemProps,
} from "@kobalte/core/dropdown-menu";
import { type ComponentProps, type JSX, splitProps } from "solid-js";
import { cn } from "../../utils/cn";

export function DropdownMenu(
  props: ComponentProps<typeof KobalteDropdownMenu>,
) {
  const [local, others] = splitProps(props, ["modal", "gutter"]);
  return (
    <KobalteDropdownMenu
      modal={local.modal ?? false}
      gutter={local.gutter ?? 6}
      {...others}
    />
  );
}

export function DropdownMenuTrigger(
  props: ComponentProps<typeof KobalteDropdownMenu.Trigger>,
) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <KobalteDropdownMenu.Trigger
      class={cn("group", local.class)}
      {...others}
    />
  );
}

export function DropdownMenuContent(
  props: ComponentProps<typeof KobalteDropdownMenu.Content>,
) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <KobalteDropdownMenu.Portal>
      <KobalteDropdownMenu.Content
        class={cn(
          "z-[70] min-w-[12rem] overflow-hidden rounded-xl border border-forest/10 bg-white/95 backdrop-blur-md p-1 shadow-xl focus:outline-none",
          local.class,
        )}
        {...others}
      />
    </KobalteDropdownMenu.Portal>
  );
}

export const DropdownMenuRadioGroup = KobalteDropdownMenu.RadioGroup;

export function DropdownMenuRadioItem<TValue = string>(
  props: DropdownMenuRadioItemProps<"div", TValue> & {
    class?: string;
    classList?: Record<string, boolean | undefined>;
    children?: JSX.Element;
  },
) {
  const [local, others] = splitProps(props, ["class", "closeOnSelect"]);
  return (
    <KobalteDropdownMenu.RadioItem
      closeOnSelect={local.closeOnSelect ?? true}
      class={cn(
        "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
}

export function DropdownMenuCheckboxItem(
  props: ComponentProps<typeof KobalteDropdownMenu.CheckboxItem>,
) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <KobalteDropdownMenu.CheckboxItem
      class={cn(
        "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
}

export const DropdownMenuItemIndicator = KobalteDropdownMenu.ItemIndicator;
