import { mergeProps, createMemo, createSignal, onCleanup } from "solid-js";
import type { TooltipProps } from "../../types";

export const Tooltip = (_props: TooltipProps) => {
  const props = mergeProps({ position: "top" as const }, _props);
  const [show, setShow] = createSignal(false);
  const [hoverActive, setHoverActive] = createSignal(false);
  let timeoutId: number | undefined;

  const handleMouseEnter = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setHoverActive(true);
    timeoutId = window.setTimeout(() => {
      setShow(true);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    setHoverActive(false);
    setShow(false);
  };

  onCleanup(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  const positionClasses = createMemo(() => {
    switch (props.position) {
      case "bottom":
        return {
          container: "absolute top-full left-1/2 -translate-x-1/2 mt-2",
          arrow: "absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900/95"
        };
      case "left":
        return {
          container: "absolute right-full top-1/2 -translate-y-1/2 mr-2",
          arrow: "absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-neutral-900/95"
        };
      case "right":
        return {
          container: "absolute left-full top-1/2 -translate-y-1/2 ml-2",
          arrow: "absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900/95"
        };
      case "top":
      default:
        return {
          container: "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
          arrow: "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900/95"
        };
    }
  });

  return (
    <div 
      class={`relative ${props.class ?? "inline-block"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {props.children}
      
      {/* Darkening background overlay during delay */}
      <div 
        class={`absolute inset-0 pointer-events-none transition-opacity rounded-[inherit] z-10 ${props.overlayBgClass || "bg-forest"} ${
          hoverActive() 
            ? "duration-3000 ease-out opacity-20" 
            : "duration-150 opacity-0"
        }`}
      />

      <div 
        class={`
          ${positionClasses().container} 
          px-3.5 py-2.5 
          bg-neutral-900/95 backdrop-blur-md 
          text-white text-xs font-outfit rounded-xl 
          transition-all duration-200 ease-out
          pointer-events-none 
          w-64 max-w-[90vw] 
          z-50 shadow-2xl flex flex-col gap-1
          ${show() ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95"}
        `}
      >
        <div class="leading-relaxed font-normal text-white/90">
          {props.content}
        </div>
        {/* Arrow */}
        <div class={positionClasses().arrow}></div>
      </div>
    </div>
  );
};

