import { createMemo } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { formatUSD, formatUSDCompact } from "../../../../utils/format";
import { buildDCFChartOptions, type DCFProjectionResult } from "./dcfModel";

export interface DCFResultsPanelProps {
  projections: DCFProjectionResult;
  currentPrice: number | undefined;
}

export const DCFResultsPanel = (props: DCFResultsPanelProps) => {
  const chartOptions = createMemo(() => buildDCFChartOptions(props.projections));

  const series = createMemo(() => [
    {
      name: "Projected FCF",
      data: props.projections.years.map((y) => y.fcf),
    },
    {
      name: "Present Value (PV)",
      data: props.projections.years.map((y) => y.pv),
    },
  ]);

  const isUndervalued = () => props.projections.intrinsicValue > (props.currentPrice || 0);
  const verdictColor = () =>
    isUndervalued()
      ? "text-fin-green bg-fin-green/10 border-fin-green/20"
      : "text-fin-red bg-fin-red/10 border-fin-red/20";
  const verdictText = () => (isUndervalued() ? "Undervalued" : "Overvalued");

  return (
    <div class="w-full lg:w-[65%] flex flex-col justify-between">
      {/* Results summary indicators */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Intrinsic Value */}
        <div class="fin-metric-card p-4 flex flex-col justify-between h-full bg-gradient-to-br from-white via-sage/10 to-sage/30">
          <span class="text-[10px] font-bold uppercase tracking-wider text-earth">
            Intrinsic Value
          </span>
          <div class="flex items-baseline gap-2 mt-2">
            <span class="text-2xl font-cormorant font-black text-forest">
              {formatUSD(props.projections.intrinsicValue)}
            </span>
            <span class="text-xs text-earth/60">per share</span>
          </div>
          <div class="mt-3 flex items-center justify-between border-t border-forest/5 pt-2 text-[11px]">
            <span class="text-earth">Current Price</span>
            <span class="font-bold text-forest">{formatUSD(props.currentPrice)}</span>
          </div>
        </div>

        {/* Target Verdict */}
        <div class="fin-metric-card p-4 flex flex-col justify-between h-full">
          <span class="text-[10px] font-bold uppercase tracking-wider text-earth">
            Valuation Verdict
          </span>
          <div class="mt-2 flex items-center justify-between">
            <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${verdictColor()}`}>
              {verdictText()}
            </span>
            <span
              class={`text-lg font-outfit font-black ${isUndervalued() ? "text-fin-green" : "text-fin-red"}`}
            >
              {props.projections.upsidePercent >= 0 ? "+" : ""}
              {props.projections.upsidePercent.toFixed(1)}%
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
        <SolidApexCharts type="area" options={chartOptions()} series={series()} height="100%" />
      </div>

      {/* Math Breakdowns */}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
          <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">
            10Y PV of FCFs
          </div>
          <div class="text-xs font-bold text-forest mt-1">
            {formatUSDCompact(props.projections.sumPvFcf)}
          </div>
        </div>
        <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
          <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">
            PV of Terminal Value
          </div>
          <div class="text-xs font-bold text-forest mt-1">
            {formatUSDCompact(props.projections.pvTerminalValue)}
          </div>
        </div>
        <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
          <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">
            Enterprise Value
          </div>
          <div class="text-xs font-bold text-forest mt-1">
            {formatUSDCompact(props.projections.enterpriseValue)}
          </div>
        </div>
        <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
          <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">
            Cash & Equiv (+)
          </div>
          <div class="text-xs font-bold text-fin-green mt-1">
            +{formatUSDCompact(props.projections.cash)}
          </div>
        </div>
        <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
          <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">
            Total Debt (-)
          </div>
          <div class="text-xs font-bold text-fin-red mt-1">
            -{formatUSDCompact(props.projections.debt)}
          </div>
        </div>
        <div class="p-3 bg-white/40 border border-forest/5 rounded-xl text-center">
          <div class="text-[9px] text-earth/60 font-bold uppercase tracking-wide">Equity Value</div>
          <div class="text-xs font-bold text-forest mt-1">
            {formatUSDCompact(props.projections.equityValue)}
          </div>
        </div>
      </div>
    </div>
  );
};
