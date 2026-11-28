import { Select as KobalteSelect } from "@kobalte/core/select";
import { Check, ChevronDown } from "lucide-solid";
import { Show, type JSX } from "solid-js";
import { cn } from "../../utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
  color?: string;
  disabled?: boolean;
}

export interface SimpleSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  class?: string;
  triggerClass?: string;
  contentClass?: string;
  sameWidth?: boolean;
  placement?: "bottom-start" | "bottom-end" | "bottom" | "top-start" | "top-end" | "top";
  renderTriggerValue?: (option: SelectOption) => JSX.Element;
}

export function SimpleSelect(props: SimpleSelectProps) {
  const selectedOption = () =>
    props.options.find((opt) => opt.value === props.value) ?? null;

  return (
    <KobalteSelect<SelectOption>
      value={selectedOption()}
      onChange={(next) => {
        if (next) props.onChange(next.value);
      }}
      options={props.options}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      placeholder={props.placeholder ?? "Select..."}
      disabled={props.disabled}
      sameWidth={props.sameWidth}
      placement={props.placement}
      disallowEmptySelection
      itemComponent={(itemProps) => (
        <KobalteSelect.Item
          item={itemProps.item}
          class="relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 font-outfit text-sm text-forest outline-none transition-colors data-[highlighted]:bg-sage/70 data-[selected]:bg-sage/50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        >
          <div class="flex min-w-0 items-center gap-2.5">
            <Show when={itemProps.item.rawValue.color}>
              <span
                class="h-2.5 w-2.5 shrink-0 rounded-full border border-forest/15"
                style={{ "background-color": itemProps.item.rawValue.color }}
              />
            </Show>
            <div class="min-w-0">
              <KobalteSelect.ItemLabel class="block truncate font-semibold text-forest">
                {itemProps.item.rawValue.label}
              </KobalteSelect.ItemLabel>
              <Show when={itemProps.item.rawValue.subtitle}>
                <span class="block truncate text-xs text-earth tabular-nums">
                  {itemProps.item.rawValue.subtitle}
                </span>
              </Show>
            </div>
          </div>
          <KobalteSelect.ItemIndicator class="shrink-0 text-forest">
            <Check class="h-4 w-4" />
          </KobalteSelect.ItemIndicator>
        </KobalteSelect.Item>
      )}
    >
      <KobalteSelect.Trigger
        aria-label={props.ariaLabel}
        class={cn(
          "group inline-flex w-full items-center justify-between gap-2 rounded-xl border border-forest/15 bg-white px-3 py-2 font-outfit text-sm text-forest transition-colors hover:bg-sage/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          props.triggerClass,
          props.class,
        )}
      >
        <KobalteSelect.Value<SelectOption> class="min-w-0 flex-1 text-left">
          {(state) => {
            const opt = state.selectedOption();
            if (props.renderTriggerValue) {
              return props.renderTriggerValue(opt);
            }
            return (
              <span class="flex min-w-0 items-center gap-2">
                <Show when={opt.color}>
                  <span
                    class="h-2.5 w-2.5 shrink-0 rounded-full border border-forest/15"
                    style={{ "background-color": opt.color }}
                  />
                </Show>
                <span class="truncate font-medium text-forest">{opt.label}</span>
              </span>
            );
          }}
        </KobalteSelect.Value>
        <KobalteSelect.Icon class="shrink-0 text-earth/70 transition-transform duration-150 group-data-[expanded]:rotate-180">
          <ChevronDown class="h-4 w-4" />
        </KobalteSelect.Icon>
      </KobalteSelect.Trigger>

      <KobalteSelect.Portal>
        <KobalteSelect.Content
          class={cn(
            "z-[70] min-w-[12rem] overflow-hidden rounded-xl border border-forest/15 bg-white p-1 shadow-xl",
            props.contentClass,
          )}
        >
          <KobalteSelect.Listbox class="max-h-60 overflow-y-auto custom-scrollbar-thin space-y-0.5 focus:outline-none" />
        </KobalteSelect.Content>
      </KobalteSelect.Portal>
    </KobalteSelect>
  );
}
