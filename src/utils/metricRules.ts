export type MetricSignal = "good" | "neutral" | "bad";

export interface MetricEvaluation {
  signal: MetricSignal;
  badgeText: string;
  tooltip: string;
  thresholdContext: string;
}

export type MetricRuleEvaluator = (value: number) => MetricEvaluation;

const makeResult = (
  signal: MetricSignal,
  badgeText: string,
  tooltip: string,
  thresholdContext: string,
): MetricEvaluation => ({
  signal,
  badgeText,
  tooltip,
  thresholdContext,
});

interface LowIsGoodRuleConfig {
  goodMax: number;
  neutralMax: number;
  thresholdContext: string;
  goodBadge?: string;
  neutralBadge?: string;
  badBadge?: string;
  goodTooltip: (v: string) => string;
  neutralTooltip: (v: string) => string;
  badTooltip: (v: string) => string;
}

const lowIsGoodRule = (cfg: LowIsGoodRuleConfig): MetricRuleEvaluator => (value) => {
  const v = value.toFixed(2);
  if (value < cfg.goodMax) {
    return makeResult("good", cfg.goodBadge ?? "Good", cfg.goodTooltip(v), cfg.thresholdContext);
  }
  if (value <= cfg.neutralMax) {
    return makeResult("neutral", cfg.neutralBadge ?? "Fair", cfg.neutralTooltip(v), cfg.thresholdContext);
  }
  return makeResult("bad", cfg.badBadge ?? "High", cfg.badTooltip(v), cfg.thresholdContext);
};

interface HighPctRuleConfig {
  goodMin: number;
  neutralMin: number;
  thresholdContext: string;
  goodTooltip: (pct: string) => string;
  neutralTooltip: (pct: string) => string;
  badTooltip: (pct: string) => string;
}

const highPctRule = (cfg: HighPctRuleConfig): MetricRuleEvaluator => (value) => {
  const pct = (value * 100).toFixed(2);
  if (value >= cfg.goodMin) {
    return makeResult("good", "Strong", cfg.goodTooltip(pct), cfg.thresholdContext);
  }
  if (value >= cfg.neutralMin) {
    return makeResult("neutral", "Normal", cfg.neutralTooltip(pct), cfg.thresholdContext);
  }
  return makeResult("bad", "Weak", cfg.badTooltip(pct), cfg.thresholdContext);
};

const netMarginRule = highPctRule({
  goodMin: 0.15,
  neutralMin: 0.05,
  thresholdContext: "Good: > 15% | Bad: < 5%",
  goodTooltip: (pct) => `Net Profit Margin of ${pct}% is exceptional (> 15%), displaying highly profitable operations.`,
  neutralTooltip: (pct) => `Net Profit Margin of ${pct}% is moderate.`,
  badTooltip: (pct) => `Net Profit Margin of ${pct}% is low (< 5%), yielding thin net profits.`,
});

export const METRIC_RULES: Record<string, MetricRuleEvaluator> = {
  "P/E (TTM)": (value) => {
    const threshold = "Good: 25× - 40× | High: > 60×";
    const v = value.toFixed(2);
    if (value >= 25 && value <= 40) {
      return makeResult("good", "Good", `P/E (TTM) of ${v}× is in the ideal 25× to 40× range for growth tech stocks.`, threshold);
    }
    if (value < 25 || (value > 40 && value <= 60)) {
      const text = value < 25 ? "undervalued/value territory" : "premium tech valuation";
      return makeResult("neutral", "Fair", `P/E (TTM) of ${v}× is in a ${text}.`, threshold);
    }
    return makeResult("bad", "High", `P/E (TTM) of ${v}× is above 60×, showing an extremely high growth premium.`, threshold);
  },

  "P/E (Forward)": (value) => {
    const threshold = "Good: 20× - 30× | High: > 45×";
    const v = value.toFixed(2);
    if (value >= 20 && value <= 30) {
      return makeResult("good", "Good", `Forward P/E of ${v}× is in the ideal 20× to 30× range for growth tech stocks.`, threshold);
    }
    if (value < 20 || (value > 30 && value <= 45)) {
      const text = value < 20 ? "conservative forward valuation" : "elevated forward premium";
      return makeResult("neutral", "Fair", `Forward P/E of ${v}× represents a ${text}.`, threshold);
    }
    return makeResult("bad", "High", `Forward P/E of ${v}× is premium (> 45×), pricing in aggressive growth.`, threshold);
  },

  "PEG Ratio": lowIsGoodRule({
    goodMax: 1.5,
    neutralMax: 2.5,
    thresholdContext: "Good: < 1.5 | Bad: > 2.5",
    goodTooltip: (v) => `PEG Ratio of ${v} is under 1.5, suggesting the growth rate is reasonably priced for tech.`,
    neutralTooltip: (v) => `PEG Ratio of ${v} is within 1.5 to 2.5, indicating normal tech premium on growth.`,
    badTooltip: (v) => `PEG Ratio of ${v} exceeds 2.5, indicating very expensive growth.`,
  }),

  "P/S (TTM)": lowIsGoodRule({
    goodMax: 10.0,
    neutralMax: 20.0,
    thresholdContext: "Good: < 10.0× | Bad: > 20.0×",
    goodTooltip: (v) => `P/S ratio of ${v}× is healthy for high-growth tech (< 10.0×).`,
    neutralTooltip: (v) => `P/S ratio of ${v}× represents a standard premium tech valuation.`,
    badTooltip: (v) => `P/S ratio of ${v}× exceeds 20.0×, signaling heavy sales multiples.`,
  }),

  "P/B": lowIsGoodRule({
    goodMax: 8.0,
    neutralMax: 15.0,
    thresholdContext: "Good: < 8.0× | Bad: > 15.0×",
    goodTooltip: (v) => `Price to Book ratio of ${v}× is healthy for asset-light tech stocks (< 8.0×).`,
    neutralTooltip: (v) => `Price to Book ratio of ${v}× is typical for established tech companies.`,
    badTooltip: (v) => `Price to Book ratio of ${v}× is premium (> 15.0×), reflecting heavy intangible asset reliance.`,
  }),

  "EV / Revenue": lowIsGoodRule({
    goodMax: 10.0,
    neutralMax: 20.0,
    thresholdContext: "Good: < 10.0× | Bad: > 20.0×",
    goodTooltip: (v) => `EV/Revenue of ${v}× is healthy for high-growth tech (< 10.0×).`,
    neutralTooltip: (v) => `EV/Revenue of ${v}× represents normal tech premium.`,
    badTooltip: (v) => `EV/Revenue of ${v}× is expensive, pricing in significant market share growth.`,
  }),

  "EV / EBITDA": lowIsGoodRule({
    goodMax: 25.0,
    neutralMax: 40.0,
    thresholdContext: "Good: < 25.0× | Bad: > 40.0×",
    goodTooltip: (v) => `EV/EBITDA of ${v}× is healthy for growth stocks (< 25.0×).`,
    neutralTooltip: (v) => `EV/EBITDA of ${v}× is standard for scaled tech platforms.`,
    badTooltip: (v) => `EV/EBITDA of ${v}× is high, indicating heavy cash flow multipliers.`,
  }),

  "Gross Margin": highPctRule({
    goodMin: 0.4,
    neutralMin: 0.2,
    thresholdContext: "Good: > 40% | Bad: < 20%",
    goodTooltip: (pct) => `Gross Margin of ${pct}% is excellent (> 40%), showing strong pricing power.`,
    neutralTooltip: (pct) => `Gross Margin of ${pct}% is standard.`,
    badTooltip: (pct) => `Gross Margin of ${pct}% is thin (< 20%), indicating competitive pressure.`,
  }),

  "Operating Margin": highPctRule({
    goodMin: 0.2,
    neutralMin: 0.1,
    thresholdContext: "Good: > 20% | Bad: < 10%",
    goodTooltip: (pct) => `Operating Margin of ${pct}% is high (> 20%), indicating highly efficient operational model.`,
    neutralTooltip: (pct) => `Operating Margin of ${pct}% is in a healthy baseline range.`,
    badTooltip: (pct) => `Operating Margin of ${pct}% is weak (< 10%), suggesting high operational overhead.`,
  }),

  "Net Margin": netMarginRule,
  "Profit Margin": netMarginRule,

  ROE: highPctRule({
    goodMin: 0.15,
    neutralMin: 0.08,
    thresholdContext: "Good: > 15% | Bad: < 8%",
    goodTooltip: (pct) => `Return on Equity of ${pct}% is strong (> 15%), demonstrating efficient generation of returns on shareholder capital.`,
    neutralTooltip: (pct) => `Return on Equity of ${pct}% is adequate.`,
    badTooltip: (pct) => `Return on Equity of ${pct}% is low (< 8%), indicating suboptimal return on shareholder equity.`,
  }),

  ROA: highPctRule({
    goodMin: 0.08,
    neutralMin: 0.03,
    thresholdContext: "Good: > 8% | Bad: < 3%",
    goodTooltip: (pct) => `Return on Assets of ${pct}% is strong (> 8%), demonstrating efficient asset deployment.`,
    neutralTooltip: (pct) => `Return on Assets of ${pct}% is in a standard range.`,
    badTooltip: (pct) => `Return on Assets of ${pct}% is low (< 3%), implying inefficient use of resources/assets.`,
  }),

  "Current Ratio": (value) => {
    const threshold = "Good: 1.5 to 3.0 | Bad: < 1.0 or > 5.0";
    const v = value.toFixed(2);
    if (value >= 1.5 && value <= 3.0) {
      return makeResult("good", "Good", `Current Ratio of ${v} is optimal (1.5 - 3.0), showing strong short-term liquidity.`, threshold);
    }
    if (value < 1.0 || value > 5.0) {
      const problem = value < 1.0 ? "insufficient liquidity" : "excessive idle cash/inventory";
      return makeResult("bad", "Risky", `Current Ratio of ${v} is outside healthy limits, pointing to ${problem}.`, threshold);
    }
    return makeResult("neutral", "Fair", `Current Ratio of ${v} is acceptable, though not fully optimal.`, threshold);
  },

  "Debt / Equity": lowIsGoodRule({
    goodMax: 0.5,
    neutralMax: 1.5,
    goodBadge: "Low",
    neutralBadge: "Moderate",
    badBadge: "High",
    thresholdContext: "Good: < 0.5 | Bad: > 1.5",
    goodTooltip: (v) => `Debt/Equity of ${v} is very low (< 0.5), signifying a highly conservative balance sheet.`,
    neutralTooltip: (v) => `Debt/Equity of ${v} is standard/moderate.`,
    badTooltip: (v) => `Debt/Equity of ${v} is high (> 1.5), indicating high financial leverage and debt servicing risk.`,
  }),

  Beta: (value) => {
    const threshold = "Stable: 0.8 to 1.2 | High: > 1.8 | Low: < 0.5";
    const v = value.toFixed(2);
    if (value >= 0.8 && value <= 1.2) {
      return makeResult("good", "Stable", `Beta of ${v} aligns closely with market volatility (0.8 - 1.2), offering balanced risk.`, threshold);
    }
    if (value < 0.5 || value > 1.8) {
      const description = value < 0.5 ? "highly non-reactive" : "extremely volatile";
      return makeResult("bad", value < 0.5 ? "Low Vol" : "High Vol", `Beta of ${v} is ${description} compared to the wider market.`, threshold);
    }
    return makeResult("neutral", "Moderate", `Beta of ${v} indicates moderate price volatility.`, threshold);
  },

  "Short % of Float": (value) => {
    const threshold = "Good: < 5% | Bad: > 15%";
    const pct = value * 100;
    const pctText = pct.toFixed(2);
    if (pct < 5.0) {
      return makeResult("good", "Low", `Short interest of ${pctText}% is low, indicating low short seller interest.`, threshold);
    }
    if (pct <= 15.0) {
      return makeResult("neutral", "Moderate", `Short interest of ${pctText}% is moderate.`, threshold);
    }
    return makeResult("bad", "High", `Short interest of ${pctText}% is high, showing substantial bearish sentiment or high squeeze potential.`, threshold);
  },

  "Dividend Yield": (value) => {
    const threshold = "Ideal: 2% - 5% | Very High: > 8%";
    const pct = value * 100;
    const pctText = pct.toFixed(2);
    if (pct >= 2.0 && pct <= 5.0) {
      return makeResult("good", "Ideal", `Dividend Yield of ${pctText}% is within the ideal range (2% - 5%), offering healthy income and safety.`, threshold);
    }
    if (pct > 8.0) {
      return makeResult("bad", "Risky", `Dividend Yield of ${pctText}% is high (> 8%), which may indicate a dividend cut risk (dividend trap).`, threshold);
    }
    return makeResult("neutral", "Low", `Dividend Yield of ${pctText}% is low, indicating potential focus on capital appreciation instead.`, threshold);
  },
};
