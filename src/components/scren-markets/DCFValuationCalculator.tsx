import { createMemo, createSignal, createEffect, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { formatUSD, formatUSDCompact } from "../../utils/format";
import type { DCFValuationCalculatorProps } from "../../types";

const PRESETS = {
  conservative: { wacc: 8.5, highGrowth: 10, transitionGrowth: 8.8, terminalGrowth: 3.0 },
  standard: { wacc: 9.3, highGrowth: 16, transitionGrowth: 13.6, terminalGrowth: 3.5 },
  aggressive: { wacc: 10.2, highGrowth: 24, transitionGrowth: 20.0, terminalGrowth: 4.0 }
};

const getMarketCapPresetKey = (marketCap: number): "conservative" | "standard" | "aggressive" => {
  if (marketCap >= 500_000_000_000) return "conservative";
  if (marketCap >= 10_000_000_000) return "standard";
  return "aggressive";
};

export const DCFValuationCalculator = (props: DCFValuationCalculatorProps) => {
  // Extract base FCF from stock data, prioritizing fundamentals object
  const actualFcf = () => {
    if (props.data.fundamentals?.financialData?.freeCashflow !== undefined && props.data.fundamentals?.financialData?.freeCashflow !== null) {
      return props.data.fundamentals.financialData.freeCashflow;
    }
    if (props.data.standardized_financials?.free_cash_flow_ttm !== undefined && props.data.standardized_financials?.free_cash_flow_ttm !== null) {
      return props.data.standardized_financials.free_cash_flow_ttm;
    }
    // Fallback: Use the latest annual earnings (net income) as a baseline if FCF is null/0
    const annuals = props.data.segment_data?.annual_financials || [];
    if (annuals.length > 0) {
      const sorted = [...annuals].sort((a, b) => b.year - a.year);
      return sorted[0].earnings ?? 0;
    }
    return 0;
  };

  const detectDenomination = (val: number): "raw" | "M" | "B" => {
    const absVal = Math.abs(val);
    if (absVal >= 1_000_000_000) return "B";
    if (absVal >= 1_000_000) return "M";
    return "raw";
  };

  const formatBaseToText = (val: number, denom: "raw" | "M" | "B") => {
    if (denom === "B") return (val / 1_000_000_000).toString();
    if (denom === "M") return (val / 1_000_000).toString();
    return val.toString();
  };
  
  // Input signals
  const [fcfBase, setFcfBase] = createSignal(actualFcf());

  const recPresetKey = () => getMarketCapPresetKey(props.data.valuation?.market_cap || props.data.fundamentals?.summaryDetail?.marketCap || 0);

  const getStoredPreset = (): "conservative" | "standard" | "aggressive" => {
    const ticker = props.data.ticker || "";
    const stored = ticker ? localStorage.getItem(`dcf_preset_${ticker.toLowerCase()}`) : null;
    if (stored === "conservative" || stored === "standard" || stored === "aggressive") {
      return stored;
    }
    return recPresetKey();
  };

  const [wacc, setWacc] = createSignal(PRESETS[getStoredPreset()].wacc);
  const [highGrowth, setHighGrowth] = createSignal(PRESETS[getStoredPreset()].highGrowth);
  const [transitionGrowth, setTransitionGrowth] = createSignal(PRESETS[getStoredPreset()].transitionGrowth);
  const [terminalGrowth, setTerminalGrowth] = createSignal(PRESETS[getStoredPreset()].terminalGrowth);

  const [denomination, setDenomination] = createSignal<"raw" | "M" | "B">(detectDenomination(actualFcf()));
  const [inputText, setInputText] = createSignal(formatBaseToText(actualFcf(), denomination()));

  // Sync inputs on stock changes
  createEffect(() => {
    const base = actualFcf();
    setFcfBase(base);

    // Auto-detect denomination magnitude
    const defaultDenom = detectDenomination(base);
    setDenomination(defaultDenom);
    setInputText(formatBaseToText(base, defaultDenom));

    const tickerKey = (props.data.ticker || "").toLowerCase();
    const stored = tickerKey ? localStorage.getItem(`dcf_preset_${tickerKey}`) : null;
    const presetKey = (stored === "conservative" || stored === "standard" || stored === "aggressive")
      ? stored
      : recPresetKey();

    const preset = PRESETS[presetKey];
    setWacc(preset.wacc);
    setHighGrowth(preset.highGrowth);
    setTransitionGrowth(preset.transitionGrowth);
    setTerminalGrowth(preset.terminalGrowth);
  });


  // Sync text field when denomination changes explicitly
  createEffect(() => {
    const denom = denomination();
    const val = fcfBase();
    setInputText(formatBaseToText(val, denom));
  });

  const handleFcfInput = (value: string) => {
    setInputText(value);
    if (value === "") {
      setFcfBase(0);
      return;
    }
    const num = Number(value);
    if (!isNaN(num)) {
      const denom = denomination();
      let rawVal = num;
      if (denom === "B") rawVal = num * 1_000_000_000;
      else if (denom === "M") rawVal = num * 1_000_000;
      setFcfBase(rawVal);
    }
  };

  const applyPreset = (key: "conservative" | "standard" | "aggressive") => {
    const preset = PRESETS[key];
    setWacc(preset.wacc);
    setHighGrowth(preset.highGrowth);
    setTransitionGrowth(preset.transitionGrowth);
    setTerminalGrowth(preset.terminalGrowth);
    const ticker = props.data.ticker;
    if (ticker) {
      localStorage.setItem(`dcf_preset_${ticker.toLowerCase()}`, key);
    }
  };

  const activePreset = () => {
    const w = wacc(), h = highGrowth(), tr = transitionGrowth(), te = terminalGrowth();
    if (w === 8.5 && h === 10 && tr === 8.8 && te === 3.0) return "conservative";
    if (w === 9.3 && h === 16 && tr === 13.6 && te === 3.5) return "standard";
    if (w === 10.2 && h === 24 && tr === 20.0 && te === 4.0) return "aggressive";
    return null;
  };

  const handleReset = () => {
    const base = actualFcf();
    setFcfBase(base);

    const defaultDenom = detectDenomination(base);
    setDenomination(defaultDenom);
    setInputText(formatBaseToText(base, defaultDenom));

    applyPreset(recPresetKey());
  };

  // Perform DCF mathematical modeling
  const projections = createMemo(() => {
    const base = fcfBase();
    const r = wacc() / 100;
    const gHigh = highGrowth() / 100;
    const gTrans = transitionGrowth() / 100;
    const gTerm = terminalGrowth() / 100;

    const years: { year: number; fcf: number; pv: number }[] = [];
    let currentFcf = base;

    for (let i = 1; i <= 10; i++) {
      const growth = i <= 5 ? gHigh : gTrans;
      currentFcf = currentFcf * (1 + growth);
      const pv = currentFcf / Math.pow(1 + r, i);
      years.push({ year: i, fcf: currentFcf, pv });
    }

    const sumPvFcf = years.reduce((sum, y) => sum + y.pv, 0);

    // Terminal Value using Gordon Growth Model: TV = FCF10 * (1 + gTerm) / (r - gTerm)
    const fcf10 = years[9].fcf;
    let terminalValue = 0;
    let pvTerminalValue = 0;

    if (r > gTerm) {
      terminalValue = (fcf10 * (1 + gTerm)) / (r - gTerm);
      pvTerminalValue = terminalValue / Math.pow(1 + r, 10);
    }

    const enterpriseValue = sumPvFcf + pvTerminalValue;

    const debt = props.data.fundamentals?.financialData?.totalDebt ?? props.data.standardized_financials?.total_debt ?? 0;
    const cash = props.data.fundamentals?.financialData?.totalCash ?? props.data.standardized_financials?.cash_and_equivalents ?? 0;
    const equityValue = enterpriseValue + cash - debt;

    const marketCap = props.data.fundamentals?.summaryDetail?.marketCap || props.data.valuation?.market_cap || 0;
    const currentPrice = props.data.valuation?.current_price || 1;
    const shares = props.data.fundamentals?.summaryDetail?.marketCap
      ? (marketCap / currentPrice)
      : (props.data.advanced_ratios?.shares_outstanding || 1);
    const intrinsicValue = Math.max(0, equityValue / shares);

    const upsidePercent = ((intrinsicValue - currentPrice) / currentPrice) * 100;

    return {
      years,
      sumPvFcf,
      terminalValue,
      pvTerminalValue,
      enterpriseValue,
      equityValue,
      intrinsicValue,
      upsidePercent,
      debt,
      cash,
      shares,
      currentPrice
    };
  });

  // Chart configuration
  const chartOptions = createMemo((): ApexOptions => {
    const dataProj = projections();
    return {
      chart: {
        type: "area",
        toolbar: { show: false },
        fontFamily: "Outfit",
        background: "transparent"
      },
      colors: ["var(--color-spring)", "var(--color-fin-blue)"],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.02,
          stops: [0, 100]
        }
      },
      stroke: {
        curve: "smooth",
        width: 2.5
      },
      dataLabels: { enabled: false },
      markers: { size: 0 },
      xaxis: {
        categories: dataProj.years.map(y => `Yr ${y.year}`),
        labels: { style: { colors: "#5C6B5E", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: "#5C6B5E", fontSize: "10px" },
          formatter: (val) => formatUSDCompact(val)
        }
      },
      grid: {
        borderColor: "rgba(26,77,46,0.15)",
        strokeDashArray: 4
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        fontFamily: "Outfit",
        labels: { colors: "#1A4D2E" }
      },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        x: { show: true },
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const item = dataProj.years[dataPointIndex];
          return `
            <div class="px-4 py-4 bg-[#1C2B20] text-white text-xs font-outfit rounded-xl shadow-2xl flex flex-col gap-2 w-[210px] !h-auto border border-white/10">
              <div class="text-white/40 text-[10px] uppercase tracking-wider font-bold font-outfit">Year ${item.year} Cash Flow</div>
              <div class="flex justify-between items-center">
                <span class="text-white/60">Projected FCF</span>
                <span class="font-bold text-[#52C278]">${formatUSDCompact(item.fcf)}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-white/60">Present Value (PV)</span>
                <span class="font-bold text-[#6366F1]">${formatUSDCompact(item.pv)}</span>
              </div>
            </div>
          `;
        }
      }
    };
  });

  const series = createMemo(() => {
    const dataProj = projections();
    return [
      {
        name: "Projected FCF",
        data: dataProj.years.map(y => y.fcf)
      },
      {
        name: "Present Value (PV)",
        data: dataProj.years.map(y => y.pv)
      }
    ];
  });

  const isUndervalued = () => projections().intrinsicValue > (props.data.valuation?.current_price || 0);
  const verdictColor = () => isUndervalued() ? "text-fin-green bg-fin-green/10 border-fin-green/20" : "text-fin-red bg-fin-red/10 border-fin-red/20";
  const verdictText = () => isUndervalued() ? "Undervalued" : "Overvalued";

  return (
    <div class="premium-card p-6 flex flex-col lg:flex-row gap-6">
      {/* Left Input Configuration Panel */}
      <div class="w-full lg:w-[35%] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-forest/10 pb-6 lg:pb-0 lg:pr-6">
        <div>
          <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-5 border-b border-forest/10 pb-4">
            <div>
              <h4 class="font-outfit font-bold text-forest text-lg">DCF Calculator</h4>
              <p class="text-[10px] text-earth/60">Valuation & projection playground</p>
            </div>
            <div class="flex flex-col gap-1 items-end">
              <div class="flex items-center bg-forest/5 p-0.5 rounded-md border border-forest/10 text-[8px] font-black shadow-sm">
                <button 
                  type="button"
                  onClick={() => applyPreset("conservative")}
                  class={`px-2 py-0.5 rounded transition-all cursor-pointer uppercase tracking-wider ${activePreset() === 'conservative' ? 'bg-white text-forest shadow-sm' : 'text-earth/60 hover:text-forest'}`}
                >
                  Conservative
                </button>
                <button 
                  type="button"
                  onClick={() => applyPreset("standard")}
                  class={`px-2 py-0.5 rounded transition-all cursor-pointer uppercase tracking-wider ${activePreset() === 'standard' ? 'bg-white text-forest shadow-sm' : 'text-earth/60 hover:text-forest'}`}
                >
                  Standard
                </button>
                <button 
                  type="button"
                  onClick={() => applyPreset("aggressive")}
                  class={`px-2 py-0.5 rounded transition-all cursor-pointer uppercase tracking-wider ${activePreset() === 'aggressive' ? 'bg-white text-forest shadow-sm' : 'text-earth/60 hover:text-forest'}`}
                >
                  Aggressive
                </button>
              </div>
              <div class="flex items-center gap-1.5 text-[9px] text-earth/50 font-bold select-none">
                <span>Recommended: <span class="capitalize text-forest font-black">{recPresetKey()}</span></span>
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
                  {props.data.ticker.toUpperCase()} has a negative TTM FCF ({formatUSDCompact(actualFcf())}). Modifying the Base FCF value is highly recommended to forecast recovery.
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
                  <span class="text-[10px] text-earth/50">Act: {formatUSDCompact(actualFcf())}</span>
                  <div class="flex items-center bg-sage/10 p-0.5 rounded-lg border border-forest/5 text-[9px] font-bold">
                    <button 
                      type="button"
                      onClick={() => setDenomination("raw")} 
                      class={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${denomination() === 'raw' ? 'bg-white text-forest shadow-sm' : 'text-earth/60 hover:text-earth'}`}
                    >
                      $
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDenomination("M")} 
                      class={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${denomination() === 'M' ? 'bg-white text-forest shadow-sm' : 'text-earth/60 hover:text-earth'}`}
                    >
                      M
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDenomination("B")} 
                      class={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${denomination() === 'B' ? 'bg-white text-forest shadow-sm' : 'text-earth/60 hover:text-earth'}`}
                    >
                      B
                    </button>
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
                <Show when={denomination() !== 'raw'}>
                  <span class="text-earth/50 text-xs font-bold ml-1.5 select-none">{denomination()}</span>
                </Show>
              </div>
            </div>

            {/* WACC slider */}
            <div class="space-y-2">
              <div class="flex justify-between items-center text-xs font-semibold text-forest">
                <span>Cost of Capital (WACC)</span>
                <div class="flex items-center bg-forest/5 hover:bg-forest/10 focus-within:bg-white focus-within:ring-1 focus-within:ring-forest/20 rounded px-1.5 py-0.5 text-[11px] font-bold transition-all border border-transparent focus-within:border-forest/15">
                  <input
                    type="number"
                    value={wacc()}
                    step="0.01"
                    min="2"
                    max="25"
                    onInput={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      if (!isNaN(val)) setWacc(val);
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      setWacc(isNaN(val) ? PRESETS[getStoredPreset()].wacc : Math.max(2, Math.min(25, val)));
                    }}
                    class="w-11 bg-transparent text-right border-none outline-none font-bold text-forest p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span class="text-forest/60 select-none ml-0.5">%</span>
                </div>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="0.01"
                value={wacc()}
                onInput={(e) => setWacc(Number(e.currentTarget.value))}
                class="dcf-slider"
              />
              <div class="flex justify-between text-[10px] text-earth/50">
                <span>2%</span>
                <span>Seed CAPM: {(props.data.fundamentals?.summaryDetail?.beta || props.data.advanced_ratios.beta || 1.0).toFixed(2)}β</span>
                <span>25%</span>
              </div>
            </div>

            {/* High Growth Slider */}
            <div class="space-y-2">
              <div class="flex justify-between items-center text-xs font-semibold text-forest">
                <span>High Growth (Y1–Y5)</span>
                <div class="flex items-center bg-forest/5 hover:bg-forest/10 focus-within:bg-white focus-within:ring-1 focus-within:ring-forest/20 rounded px-1.5 py-0.5 text-[11px] font-bold transition-all border border-transparent focus-within:border-forest/15">
                  <input
                    type="number"
                    value={highGrowth()}
                    step="0.1"
                    min="-10"
                    max="50"
                    onInput={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      if (!isNaN(val)) setHighGrowth(val);
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      setHighGrowth(isNaN(val) ? PRESETS[getStoredPreset()].highGrowth : Math.max(-10, Math.min(50, val)));
                    }}
                    class="w-8 bg-transparent text-right border-none outline-none font-bold text-forest p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span class="text-forest/60 select-none ml-0.5">%</span>
                </div>
              </div>
              <input
                type="range"
                min="-10"
                max="50"
                step="0.1"
                value={highGrowth()}
                onInput={(e) => setHighGrowth(Number(e.currentTarget.value))}
                class="dcf-slider"
              />
              <div class="flex justify-between text-[10px] text-earth/50">
                <span>-10%</span>
                <span>Recommended: {PRESETS[recPresetKey()].highGrowth}%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Transition Growth Slider */}
            <div class="space-y-2">
              <div class="flex justify-between items-center text-xs font-semibold text-forest">
                <span>Transition Growth (Y6–Y10)</span>
                <div class="flex items-center bg-forest/5 hover:bg-forest/10 focus-within:bg-white focus-within:ring-1 focus-within:ring-forest/20 rounded px-1.5 py-0.5 text-[11px] font-bold transition-all border border-transparent focus-within:border-forest/15">
                  <input
                    type="number"
                    value={transitionGrowth()}
                    step="0.1"
                    min="-10"
                    max="30"
                    onInput={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      if (!isNaN(val)) setTransitionGrowth(val);
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      setTransitionGrowth(isNaN(val) ? PRESETS[getStoredPreset()].transitionGrowth : Math.max(-10, Math.min(30, val)));
                    }}
                    class="w-8 bg-transparent text-right border-none outline-none font-bold text-forest p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span class="text-forest/60 select-none ml-0.5">%</span>
                </div>
              </div>
              <input
                type="range"
                min="-10"
                max="30"
                step="0.1"
                value={transitionGrowth()}
                onInput={(e) => setTransitionGrowth(Number(e.currentTarget.value))}
                class="dcf-slider"
              />
              <div class="flex justify-between text-[10px] text-earth/50">
                <span>-10%</span>
                <span>Recommended: {PRESETS[recPresetKey()].transitionGrowth}%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Terminal Growth Slider */}
            <div class="space-y-2">
              <div class="flex justify-between items-center text-xs font-semibold text-forest">
                <span>Terminal Growth Rate</span>
                <div class="flex items-center bg-forest/5 hover:bg-forest/10 focus-within:bg-white focus-within:ring-1 focus-within:ring-forest/20 rounded px-1.5 py-0.5 text-[11px] font-bold transition-all border border-transparent focus-within:border-forest/15">
                  <input
                    type="number"
                    value={terminalGrowth()}
                    step="0.1"
                    min="0.5"
                    max="5"
                    onInput={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      if (!isNaN(val)) setTerminalGrowth(val);
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      setTerminalGrowth(isNaN(val) ? PRESETS[getStoredPreset()].terminalGrowth : Math.max(0.5, Math.min(5, val)));
                    }}
                    class="w-8 bg-transparent text-right border-none outline-none font-bold text-forest p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span class="text-forest/60 select-none ml-0.5">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={terminalGrowth()}
                onInput={(e) => setTerminalGrowth(Number(e.currentTarget.value))}
                class="dcf-slider"
              />
              <div class="flex justify-between text-[10px] text-earth/50">
                <span>0.5%</span>
                <span>Recommended: {PRESETS[recPresetKey()].terminalGrowth.toFixed(1)}%</span>
                <span>5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Output Results Panel */}
      <div class="w-full lg:w-[65%] flex flex-col justify-between">
        {/* Results summary indicators */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Intrinsic Value */}
          <div class="fin-metric-card p-4 flex flex-col justify-between h-full bg-gradient-to-br from-white via-sage/10 to-sage/30">
            <span class="text-[10px] font-bold uppercase tracking-wider text-earth">Intrinsic Value</span>
            <div class="flex items-baseline gap-2 mt-2">
              <span class="text-2xl font-cormorant font-black text-forest">
                {formatUSD(projections().intrinsicValue)}
              </span>
              <span class="text-xs text-earth/60">per share</span>
            </div>
            <div class="mt-3 flex items-center justify-between border-t border-forest/5 pt-2 text-[11px]">
              <span class="text-earth">Current Price</span>
              <span class="font-bold text-forest">{formatUSD(props.data.valuation?.current_price)}</span>
            </div>
          </div>

          {/* Target Verdict */}
          <div class="fin-metric-card p-4 flex flex-col justify-between h-full">
            <span class="text-[10px] font-bold uppercase tracking-wider text-earth">Valuation Verdict</span>
            <div class="mt-2 flex items-center justify-between">
              <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${verdictColor()}`}>
                {verdictText()}
              </span>
              <span class={`text-lg font-outfit font-black ${isUndervalued() ? 'text-fin-green' : 'text-fin-red'}`}>
                {projections().upsidePercent >= 0 ? "+" : ""}{projections().upsidePercent.toFixed(1)}%
              </span>
            </div>
            <div class="mt-3 flex items-center justify-between border-t border-forest/5 pt-2 text-[11px]">
              <span class="text-earth">Model Signal</span>
              <span class="font-medium text-earth/80">
                {isUndervalued() ? "Intrinsic Price Premium" : "Discount to Intrinsic Price"}
              </span>
            </div>
          </div>
        </div>

        {/* Charts area */}
        <div class="h-[210px] mb-4">
          <SolidApexCharts
            type="area"
            options={chartOptions()}
            series={series()}
            height="100%"
          />
        </div>

        {/* Math Breakdowns */}
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
            <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">10Y PV of FCFs</div>
            <div class="text-xs font-bold text-forest mt-1">{formatUSDCompact(projections().sumPvFcf)}</div>
          </div>
          <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
            <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">PV of Terminal Value</div>
            <div class="text-xs font-bold text-forest mt-1">{formatUSDCompact(projections().pvTerminalValue)}</div>
          </div>
          <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
            <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">Enterprise Value</div>
            <div class="text-xs font-bold text-forest mt-1">{formatUSDCompact(projections().enterpriseValue)}</div>
          </div>
          <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
            <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">Cash & Equiv (+)</div>
            <div class="text-xs font-bold text-fin-green mt-1">+{formatUSDCompact(projections().cash)}</div>
          </div>
          <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
            <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">Total Debt (-)</div>
            <div class="text-xs font-bold text-fin-red mt-1">-{formatUSDCompact(projections().debt)}</div>
          </div>
          <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
            <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">Equity Value</div>
            <div class="text-xs font-bold text-forest mt-1">{formatUSDCompact(projections().equityValue)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
