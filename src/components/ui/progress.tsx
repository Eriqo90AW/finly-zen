import { splitProps, type ComponentProps } from "solid-js";
import { cn } from "../../utils/cn";

export type ProgressTone = "default" | "success" | "warning" | "destructive";

interface ProgressProps extends ComponentProps<"div"> {
  value: number;
  max?: number;
  tone?: ProgressTone;
  indicatorClass?: string;
  indicatorColor?: string;
}

const toneClasses: Record<ProgressTone, string> = {
  default: "bg-forest",
  success: "bg-mid-green",
  warning: "bg-amber-500",
  destructive: "bg-rose-500",
};

export function Progress(props: ProgressProps) {
  const [local, others] = splitProps(props, [
    "value",
    "max",
    "tone",
    "class",
    "indicatorClass",
    "indicatorColor",
  ]);

  const percentage = () => {
    const max = local.max ?? 100;
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, (local.value / max) * 100));
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percentage())}
      aria-valuemin={0}
      aria-valuemax={100}
      class={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-sage/70",
        local.class,
      )}
      {...others}
    >
      <div
        class={cn(
          "h-full rounded-full transition-all duration-500 ease-out",
          toneClasses[local.tone ?? "default"],
          local.indicatorClass,
        )}
        style={{
          width: `${percentage()}%`,
          ...(local.indicatorColor
            ? { "background-color": local.indicatorColor }
            : {}),
        }}
      />
    </div>
  );
}
