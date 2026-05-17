import { mergeProps } from "solid-js";
import type { TooltipProps } from "../../types";


export const Tooltip = (_props: TooltipProps) => {
  const props = mergeProps({ class: "relative group inline-block" }, _props);

  return (
    <div class={props.class}>
      {props.children}
      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-near-black text-white text-xs font-outfit rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl flex flex-col items-center">
        {props.content}
        {/* Arrow */}
        <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-near-black"></div>
      </div>
    </div>
  );
};
