import { splitProps, type ComponentProps } from "solid-js";
import { cn } from "../../utils/cn";

export function Card(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn(
        "rounded-2xl border border-forest/10 bg-white text-near-black shadow-[0_1px_2px_rgba(26,77,46,0.04),0_6px_24px_rgba(26,77,46,0.04)]",
        local.class,
      )}
      {...others}
    />
  );
}

export function CardHeader(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("flex flex-col gap-1.5 p-5 sm:p-6", local.class)}
      {...others}
    />
  );
}

export function CardTitle(props: ComponentProps<"h3">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <h3
      class={cn(
        "font-outfit text-base font-semibold leading-tight tracking-tight text-forest",
        local.class,
      )}
      {...others}
    />
  );
}

export function CardDescription(props: ComponentProps<"p">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <p
      class={cn("font-outfit text-xs text-earth/80 leading-relaxed", local.class)}
      {...others}
    />
  );
}

export function CardContent(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div class={cn("px-5 pb-5 sm:px-6 sm:pb-6", local.class)} {...others} />
  );
}

export function CardFooter(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("flex items-center px-5 pb-5 sm:px-6 sm:pb-6", local.class)}
      {...others}
    />
  );
}
