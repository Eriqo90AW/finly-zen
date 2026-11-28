import { Tabs as KobalteTabs } from "@kobalte/core/tabs";
import { splitProps, type ComponentProps, type JSX } from "solid-js";
import { cn } from "../../utils/cn";

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  class?: string;
  children?: JSX.Element;
}

export function Tabs(props: TabsProps) {
  const [local, others] = splitProps(props, ["class"]);
  return <KobalteTabs class={cn("w-full", local.class)} {...others} />;
}

export function TabsList(props: ComponentProps<typeof KobalteTabs.List>) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <KobalteTabs.List
      class={cn(
        "inline-flex h-9 items-center justify-center rounded-xl bg-sage/60 p-1 text-earth border border-forest/10",
        local.class,
      )}
      {...others}
    />
  );
}

export function TabsTrigger(props: ComponentProps<typeof KobalteTabs.Trigger>) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <KobalteTabs.Trigger
      class={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1 font-outfit text-xs font-semibold text-earth transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-white data-[selected]:text-forest data-[selected]:shadow-xs",
        local.class,
      )}
      {...others}
    />
  );
}

export function TabsContent(props: ComponentProps<typeof KobalteTabs.Content>) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <KobalteTabs.Content
      class={cn("mt-4 focus-visible:outline-none", local.class)}
      {...others}
    />
  );
}
