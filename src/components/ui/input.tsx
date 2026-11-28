import { splitProps, type ComponentProps } from "solid-js";
import { cn } from "../../utils/cn";

export function Input(props: ComponentProps<"input">) {
  const [local, others] = splitProps(props, ["class", "type"]);
  return (
    <input
      type={local.type ?? "text"}
      class={cn(
        "flex h-10 w-full rounded-xl border border-forest/15 bg-white px-3 py-2 font-outfit text-sm text-forest placeholder:text-earth/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 focus-visible:border-forest/40 disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
}

export function Label(props: ComponentProps<"label">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <label
      class={cn(
        "font-outfit text-xs font-semibold text-earth leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class,
      )}
      {...others}
    />
  );
}
