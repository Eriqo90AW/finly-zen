import { cva, type VariantProps } from "class-variance-authority";
import { splitProps, type ComponentProps } from "solid-js";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-outfit text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-forest text-white shadow-xs hover:bg-forest/90 active:scale-[0.99]",
        secondary: "bg-sage text-forest hover:bg-sage/80",
        outline: "border border-forest/15 bg-white text-forest hover:bg-sage/40",
        ghost: "text-earth hover:bg-sage/40 hover:text-forest",
        destructive: "bg-rose-600 text-white shadow-xs hover:bg-rose-700",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-xs",
        md: "h-9 px-4 py-2 text-sm",
        lg: "h-11 px-5 text-sm font-semibold",
        icon: "h-8 w-8 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ["variant", "size", "class", "type"]);
  return (
    <button
      type={local.type ?? "button"}
      class={cn(
        buttonVariants({ variant: local.variant, size: local.size }),
        local.class,
      )}
      {...others}
    />
  );
}
