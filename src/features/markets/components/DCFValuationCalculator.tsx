import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import type { DCFValuationCalculatorProps } from "../../../types";
import { formatUSDCompact } from "../../../utils/format";
import { DCFResultsPanel } from "./dcf/DCFResultsPanel";
import { DCFSliderInput } from "./dcf/DCFSliderInput";
import {
  calculateDCFProjections,
  DCF_PRESETS,
  type Denomination,
  detectActivePreset,
  detectDenomination,
  extractActualFcf,
  formatBaseToText,
  getMarketCapPresetKey,
  getStoredPresetKey,
  type PresetKey,
} from "./dcf/dcfModel";

const PRESET_OPTIONS: { key: PresetKey; label: string }[] = [
  { key: "conservative", label: "Conservative" },
  { key: "standard", label: "Standard" },
  { key: "aggressive", label: "Aggressive" },
];

const DENOM_OPTIONS: { key: Denomination; label: string }[] = [
  { key: "raw", label: "$" },
  { key: "M", label: "M" },
  { key: "B", label: "B" },
];

export const DCFValuationCalculator = (props: DCFValuationCalculatorProps) => {
  const actualFcf = () => extractActualFcf(props.data);
  const recPresetKey = () =>
    getMarketCapPresetKey(
      props.data.valuation?.market_cap || props.data.fundamentals?.summaryDetail?.marketCap || 0,
    );
  const storedPresetKey = () => getStoredPresetKey(props.data.ticker, recPresetKey());

  const [fcfBase, setFcfBase] = createSignal(actualFcf());
  const [wacc, setWacc] = createSignal(DCF_PRESETS[storedPresetKey()].wacc);
  const [highGrowth, setHighGrowth] = createSignal(DCF_PRESETS[storedPresetKey()].highGrowth);
  const [transitionGrowth, setTransitionGrowth] = createSignal(
    DCF_PRESETS[storedPresetKey()].transitionGrowth,
  );
  const [terminalGrowth, setTerminalGrowth] = createSignal(
    DCF_PRESETS[storedPresetKey()].terminalGrowth,
  );

  const [denomination, setDenomination] = createSignal<Denomination>(
    detectDenomination(actualFcf()),
  );
  const [inputText, setInputText] = createSignal(formatBaseToText(actualFcf(), denomination()));

  // Sync inputs on stock changes
  createEffect(() => {
    const base = actualFcf();
    setFcfBase(base);

    const defaultDenom = detectDenomination(base);
    setDenomination(defaultDenom);
    setInputText(formatBaseToText(base, defaultDenom));

    const preset = DCF_PRESETS[getStoredPresetKey(props.data.ticker, recPresetKey())];
    setWacc(preset.wacc);
    setHighGrowth(preset.highGrowth);
    setTransitionGrowth(preset.transitionGrowth);
    setTerminalGrowth(preset.terminalGrowth);
  });

  // Sync text field when denomination changes explicitly
  createEffect(() => {
    setInputText(formatBaseToText(fcfBase(), denomination()));
  });

  const handleFcfInput = (value: string) => {
    setInputText(value);
    if (value === "") {
      setFcfBase(0);
      return;
    }
    const num = Number(value);
    if (!Number.isNaN(num)) {
      const denom = denomination();
      let rawVal = num;
      if (denom === "B") rawVal = num * 1_000_000_000;
      else if (denom === "M") rawVal = num * 1_000_000;
      setFcfBase(rawVal);
    }
  };

  const applyPreset = (key: PresetKey) => {
    const preset = DCF_PRESETS[key];
    setWacc(preset.wacc);
    setHighGrowth(preset.highGrowth);
    setTransitionGrowth(preset.transitionGrowth);
    setTerminalGrowth(preset.terminalGrowth);
    if (props.data.ticker) {
      localStorage.setItem(`dcf_preset_${props.data.ticker.toLowerCase()}`, key);
    }
  };

  const activePreset = () =>
    detectActivePreset(wacc(), highGrowth(), transitionGrowth(), terminalGrowth());

  const projections = createMemo(() =>
    calculateDCFProjections(props.data, {
      fcfBase: fcfBase(),
      wacc: wacc(),
      highGrowth: highGrowth(),
      transitionGrowth: transitionGrowth(),
      terminalGrowth: terminalGrowth(),
    }),
  );

  const betaDisplay = () =>
    (props.data.fundamentals?.summaryDetail?.beta || props.data.advanced_ratios.beta || 1.0).toFixed(
      2,
    );

  return (
    <div class="premium-card p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
      {/* Left Input Configuration Panel */}
      <div class="w-full lg:w-[35%] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-forest/10 pb-6 lg:pb-0 lg:pr-6">
        <div>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-forest/10 pb-4">
            <div>
              <h4 class="font-outfit font-bold text-forest text-base sm:text-lg">DCF Calculator</h4>
              <p class="text-[10px] text-earth/60">Valuation & projection playground</p>
            </div>
            <div class="flex flex-col gap-1 items-end">
              <div class="flex items-center bg-forest/5 p-0.5 rounded-md border border-forest/10 text-[8px] font-black shadow-sm">
                <For each={PRESET_OPTIONS}>
                  {(opt) => (
                    <button
                      type="button"
                      onClick={() => applyPreset(opt.key)}
                      class={`px-2 py-0.5 rounded transition-all cursor-pointer uppercase tracking-wider ${
                        activePreset() === opt.key
                          ? "bg-white text-forest shadow-sm"
                          : "text-earth/60 hover:text-forest"
                      }`}
                    >
                      {opt.label}
                    </button>
                  )}
                </For>
              </div>
              <div class="flex items-center gap-1.5 text-[9px] text-earth/50 font-bold select-none">
                <span>
                  Recommended: <span class="capitalize text-forest font-black">{recPresetKey()}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Negative FCF Warning Indicator */}
          <Show when={actualFcf() < 0}>
            <div class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-800 rounded-xl text-xs flex gap-2 items-start mb-4">
              <span class="material-icons text-base text-rose-600 mt-0.5">warning</span>
              <div>
                <p class="font-bold">Negative Free Cash Flow</p>
                <p class="mt-0.5 opacity-90 leading-relaxed">
                  {props.data.ticker.toUpperCase()} has a negative TTM FCF (
                  {formatUSDCompact(actualFcf())}). Modifying the Base FCF value is highly
                  recommended to forecast recovery.
                </p>
              </div>
            </div>
          </Show>

          {/* Input list */}
          <div class="space-y-4">
            {/* Base FCF input */}
            <div class="space-y-1.5">
              <div class="flex justify-between items-center text-xs">
                <span class="font-semibold text-forest">Base FCF</span>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-earth/50">
                    Act: {formatUSDCompact(actualFcf())}
                  </span>
                  <div class="flex items-center bg-sage/10 p-0.5 rounded-lg border border-forest/5 text-[9px] font-bold">
                    <For each={DENOM_OPTIONS}>
                      {(opt) => (
                        <button
                          type="button"
                          onClick={() => setDenomination(opt.key)}
                          class={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                            denomination() === opt.key
                              ? "bg-white text-forest shadow-sm"
                              : "text-earth/60 hover:text-earth"
                          }`}
                        >
                          {opt.label}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </div>
              <div class="relative rounded-lg border border-forest/15 bg-white shadow-sm flex items-center px-3 py-2 focus-within:ring-2 focus-within:ring-forest/20">
                <span class="text-earth text-sm mr-1.5 font-medium">$</span>
                <input
                  type="text"
                  value={inputText()}
                  onInput={(e) => handleFcfInput(e.currentTarget.value)}
                  class="w-full bg-transparent border-none outline-none text-forest font-bold text-sm"
                  placeholder="0.00"
                />
                <Show when={denomination() !== "raw"}>
                  <span class="text-earth/50 text-xs font-bold ml-1.5 select-none">
                    {denomination()}
                  </span>
                </Show>
              </div>
            </div>

            <DCFSliderInput
              label="Cost of Capital (WACC)"
              value={wacc()}
              fallbackValue={DCF_PRESETS[storedPresetKey()].wacc}
              min={2}
              max={25}
              step={0.01}
              minLabel="2%"
              maxLabel="25%"
              centerLabel={`Seed CAPM: ${betaDisplay()}β`}
              inputWidthClass="w-11"
              onChange={setWacc}
            />

            <DCFSliderInput
              label="High Growth (Y1–Y5)"
              value={highGrowth()}
              fallbackValue={DCF_PRESETS[storedPresetKey()].highGrowth}
              min={-10}
              max={50}
              step={0.1}
              minLabel="-10%"
              maxLabel="50%"
              centerLabel={`Recommended: ${DCF_PRESETS[recPresetKey()].highGrowth}%`}
              onChange={setHighGrowth}
            />

            <DCFSliderInput
              label="Transition Growth (Y6–Y10)"
              value={transitionGrowth()}
              fallbackValue={DCF_PRESETS[storedPresetKey()].transitionGrowth}
              min={-10}
              max={30}
              step={0.1}
              minLabel="-10%"
              maxLabel="30%"
              centerLabel={`Recommended: ${DCF_PRESETS[recPresetKey()].transitionGrowth}%`}
              onChange={setTransitionGrowth}
            />

            <DCFSliderInput
              label="Terminal Growth Rate"
              value={terminalGrowth()}
              fallbackValue={DCF_PRESETS[storedPresetKey()].terminalGrowth}
              min={0.5}
              max={5}
              step={0.1}
              minLabel="0.5%"
              maxLabel="5%"
              centerLabel={`Recommended: ${DCF_PRESETS[recPresetKey()].terminalGrowth.toFixed(1)}%`}
              onChange={setTerminalGrowth}
            />
          </div>
        </div>
      </div>

      {/* Right Output Results Panel */}
      <DCFResultsPanel
        projections={projections()}
        currentPrice={props.data.valuation?.active_price ?? props.data.valuation?.current_price}
      />
    </div>
  );
};
