import type { ApexOptions } from "apexcharts";
import type { StockData } from "../../../../types";
import { formatUSDCompact } from "../../../../utils/format";

export type PresetKey = "conservative" | "standard" | "aggressive";
export type Denomination = "raw" | "M" | "B";

export interface DCFPreset {
  wacc: number;
  highGrowth: number;
  transitionGrowth: number;
  terminalGrowth: number;
}

export const DCF_PRESETS: Record<PresetKey, DCFPreset> = {
  conservative: { wacc: 8.5, highGrowth: 10, transitionGrowth: 8.8, terminalGrowth: 3.0 },
  standard: { wacc: 9.3, highGrowth: 16, transitionGrowth: 13.6, terminalGrowth: 3.5 },
  aggressive: { wacc: 10.2, highGrowth: 24, transitionGrowth: 20.0, terminalGrowth: 4.0 },
};

export interface DCFProjectionYear {
  year: number;
  fcf: number;
  pv: number;
}

export interface DCFProjectionResult {
  years: DCFProjectionYear[];
  sumPvFcf: number;
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  intrinsicValue: number;
  upsidePercent: number;
  debt: number;
  cash: number;
  shares: number;
  currentPrice: number;
}

export interface DCFInputs {
  fcfBase: number;
  wacc: number;
  highGrowth: number;
  transitionGrowth: number;
  terminalGrowth: number;
}

export const getMarketCapPresetKey = (marketCap: number): PresetKey => {
  if (marketCap >= 500_000_000_000) return "conservative";
  if (marketCap >= 10_000_000_000) return "standard";
  return "aggressive";
};

export const extractActualFcf = (data: StockData): number => {
  const finFcf = data.fundamentals?.financialData?.freeCashflow;
  if (finFcf !== undefined && finFcf !== null) return finFcf;

  const stdFcf = data.standardized_financials?.free_cash_flow_ttm;
  if (stdFcf !== undefined && stdFcf !== null) return stdFcf;

  const annuals = data.segment_data?.annual_financials || [];
  if (annuals.length > 0) {
    const sorted = [...annuals].sort((a, b) => b.year - a.year);
    return sorted[0].earnings ?? 0;
  }
  return 0;
};

export const detectDenomination = (val: number): Denomination => {
  const absVal = Math.abs(val);
  if (absVal >= 1_000_000_000) return "B";
  if (absVal >= 1_000_000) return "M";
  return "raw";
};

export const formatBaseToText = (val: number, denom: Denomination): string => {
  if (denom === "B") return (val / 1_000_000_000).toString();
  if (denom === "M") return (val / 1_000_000).toString();
  return val.toString();
};

export const getStoredPresetKey = (ticker: string | undefined, fallback: PresetKey): PresetKey => {
  const stored = ticker ? localStorage.getItem(`dcf_preset_${ticker.toLowerCase()}`) : null;
  if (stored === "conservative" || stored === "standard" || stored === "aggressive") {
    return stored;
  }
  return fallback;
};

export const detectActivePreset = (
  wacc: number,
  highGrowth: number,
  transitionGrowth: number,
  terminalGrowth: number,
): PresetKey | null => {
  if (wacc === 8.5 && highGrowth === 10 && transitionGrowth === 8.8 && terminalGrowth === 3.0) {
    return "conservative";
  }
  if (wacc === 9.3 && highGrowth === 16 && transitionGrowth === 13.6 && terminalGrowth === 3.5) {
    return "standard";
  }
  if (wacc === 10.2 && highGrowth === 24 && transitionGrowth === 20.0 && terminalGrowth === 4.0) {
    return "aggressive";
  }
  return null;
};

export const calculateDCFProjections = (
  data: StockData,
  inputs: DCFInputs,
): DCFProjectionResult => {
  const r = inputs.wacc / 100;
  const gHigh = inputs.highGrowth / 100;
  const gTrans = inputs.transitionGrowth / 100;
  const gTerm = inputs.terminalGrowth / 100;

  const years: DCFProjectionYear[] = [];
  let currentFcf = inputs.fcfBase;

  for (let i = 1; i <= 10; i++) {
    const growth = i <= 5 ? gHigh : gTrans;
    currentFcf = currentFcf * (1 + growth);
    const pv = currentFcf / (1 + r) ** i;
    years.push({ year: i, fcf: currentFcf, pv });
  }

  const sumPvFcf = years.reduce((sum, y) => sum + y.pv, 0);

  const fcf10 = years[9].fcf;
  let terminalValue = 0;
  let pvTerminalValue = 0;

  if (r > gTerm) {
    terminalValue = (fcf10 * (1 + gTerm)) / (r - gTerm);
    pvTerminalValue = terminalValue / (1 + r) ** 10;
  }

  const enterpriseValue = sumPvFcf + pvTerminalValue;
  const debt = data.fundamentals?.financialData?.totalDebt ?? data.standardized_financials?.total_debt ?? 0;
  const cash = data.fundamentals?.financialData?.totalCash ?? data.standardized_financials?.cash_and_equivalents ?? 0;
  const equityValue = enterpriseValue + cash - debt;

  const marketCap = data.fundamentals?.summaryDetail?.marketCap || data.valuation?.market_cap || 0;
  const currentPrice = data.valuation?.active_price || data.valuation?.current_price || 1;
  const shares = data.fundamentals?.summaryDetail?.marketCap
    ? marketCap / currentPrice
    : data.advanced_ratios?.shares_outstanding || 1;
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
    currentPrice,
  };
};

export const buildDCFChartOptions = (dataProj: DCFProjectionResult): ApexOptions => ({
  chart: {
    type: "area",
    toolbar: { show: false },
    fontFamily: "Outfit",
    background: "transparent",
  },
  colors: ["var(--color-spring)", "var(--color-fin-blue)"],
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.02,
      stops: [0, 100],
    },
  },
  stroke: {
    curve: "smooth",
    width: 2.5,
  },
  dataLabels: { enabled: false },
  markers: { size: 0 },
  xaxis: {
    categories: dataProj.years.map((y) => `Yr ${y.year}`),
    labels: { style: { colors: "#5C6B5E", fontSize: "11px" } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: "#5C6B5E", fontSize: "10px" },
      formatter: (val) => formatUSDCompact(val),
    },
  },
  grid: {
    borderColor: "rgba(26,77,46,0.15)",
    strokeDashArray: 4,
  },
  legend: {
    show: true,
    position: "top",
    horizontalAlign: "right",
    fontFamily: "Outfit",
    labels: { colors: "#1A4D2E" },
  },
  tooltip: {
    theme: "dark",
    shared: true,
    intersect: false,
    x: { show: true },
    custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
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
    },
  },
});
