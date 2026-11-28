export interface DCFSliderInputProps {
  label: string;
  value: number;
  fallbackValue: number;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  centerLabel: string;
  inputWidthClass?: string;
  onChange: (value: number) => void;
}

export const DCFSliderInput = (props: DCFSliderInputProps) => {
  return (
    <div class="space-y-2">
      <div class="flex justify-between items-center text-xs font-semibold text-forest">
        <span>{props.label}</span>
        <div class="flex items-center bg-forest/5 hover:bg-forest/10 focus-within:bg-white focus-within:ring-1 focus-within:ring-forest/20 rounded px-1.5 py-0.5 text-[11px] font-bold transition-all border border-transparent focus-within:border-forest/15">
          <input
            type="number"
            value={props.value}
            step={props.step}
            min={props.min}
            max={props.max}
            onInput={(e) => {
              const val = Number.parseFloat(e.currentTarget.value);
              if (!Number.isNaN(val)) props.onChange(val);
            }}
            onBlur={(e) => {
              const val = Number.parseFloat(e.currentTarget.value);
              props.onChange(
                Number.isNaN(val)
                  ? props.fallbackValue
                  : Math.max(props.min, Math.min(props.max, val)),
              );
            }}
            class={`${props.inputWidthClass ?? "w-8"} bg-transparent text-right border-none outline-none font-bold text-forest p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <span class="text-forest/60 select-none ml-0.5">%</span>
        </div>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onInput={(e) => props.onChange(Number(e.currentTarget.value))}
        class="dcf-slider"
      />
      <div class="flex justify-between text-[10px] text-earth/50">
        <span>{props.minLabel}</span>
        <span>{props.centerLabel}</span>
        <span>{props.maxLabel}</span>
      </div>
    </div>
  );
};
