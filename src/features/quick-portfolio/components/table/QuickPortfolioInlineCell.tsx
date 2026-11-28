import { Show, type JSX } from "solid-js";

interface QuickPortfolioInlineCellProps {
  isEditing: boolean;
  editValue: string;
  onEditInput: (value: string) => void;
  onSave: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onStartEdit: () => void;
  displayClass: string;
  inputClass?: string;
  suffix?: string;
  children: JSX.Element;
}

export const QuickPortfolioInlineCell = (props: QuickPortfolioInlineCellProps) => {
  return (
    <Show
      when={props.isEditing}
      fallback={
        <td
          onClick={props.onStartEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              props.onStartEdit();
            }
          }}
          class={props.displayClass}
        >
          {props.children}
        </td>
      }
    >
      <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner">
        <div
          class={
            props.suffix
              ? "flex items-center justify-end gap-1.5"
              : "flex items-center justify-end"
          }
        >
          <input
            ref={(el) => {
              setTimeout(() => {
                el.focus();
                el.select();
              }, 50);
            }}
            type="text"
            inputmode="decimal"
            autocomplete="off"
            value={props.editValue}
            onInput={(e) => props.onEditInput(e.currentTarget.value.replace(/[^0-9.,]/g, ""))}
            onBlur={props.onSave}
            onKeyDown={props.onKeyDown}
            class={
              props.inputClass ??
              "w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
            }
          />
          <Show when={props.suffix}>
            <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider shrink-0">
              {props.suffix}
            </span>
          </Show>
        </div>
        <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">
          Edit
        </div>
      </td>
    </Show>
  );
};
