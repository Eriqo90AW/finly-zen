export type MetricSignal = 'good' | 'neutral' | 'bad';

export interface MetricEvaluation {
  signal: MetricSignal;
  badgeText: string;
  tooltip: string;
  thresholdContext: string;
}

export function evaluateMetric(label: string, value: number | null | undefined): MetricEvaluation {
  if (value === null || value === undefined || isNaN(value)) {
    return {
      signal: 'neutral',
      badgeText: 'N/A',
      tooltip: `No data available for ${label}.`,
      thresholdContext: 'Threshold: N/A'
    };
  }

  // Define clean evaluation configurations for metrics
  switch (label) {
    case "P/E (TTM)": {
      if (value >= 25 && value <= 40) {
        return {
          signal: 'good',
          badgeText: 'Good',
          tooltip: `P/E (TTM) of ${value.toFixed(2)}× is in the ideal 25× to 40× range for growth tech stocks.`,
          thresholdContext: 'Good: 25× - 40× | High: > 60×'
        };
      } else if (value < 25 || (value > 40 && value <= 60)) {
        const text = value < 25 ? 'undervalued/value territory' : 'premium tech valuation';
        return {
          signal: 'neutral',
          badgeText: 'Fair',
          tooltip: `P/E (TTM) of ${value.toFixed(2)}× is in a ${text}.`,
          thresholdContext: 'Good: 25× - 40× | High: > 60×'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `P/E (TTM) of ${value.toFixed(2)}× is above 60×, showing an extremely high growth premium.`,
          thresholdContext: 'Good: 25× - 40× | High: > 60×'
        };
      }
    }

    case "P/E (Forward)": {
      if (value >= 20 && value <= 30) {
        return {
          signal: 'good',
          badgeText: 'Good',
          tooltip: `Forward P/E of ${value.toFixed(2)}× is in the ideal 20× to 30× range for growth tech stocks.`,
          thresholdContext: 'Good: 20× - 30× | High: > 45×'
        };
      } else if (value < 20 || (value > 30 && value <= 45)) {
        const text = value < 20 ? 'conservative forward valuation' : 'elevated forward premium';
        return {
          signal: 'neutral',
          badgeText: 'Fair',
          tooltip: `Forward P/E of ${value.toFixed(2)}× represents a ${text}.`,
          thresholdContext: 'Good: 20× - 30× | High: > 45×'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `Forward P/E of ${value.toFixed(2)}× is premium (> 45×), pricing in aggressive growth.`,
          thresholdContext: 'Good: 20× - 30× | High: > 45×'
        };
      }
    }

    case "PEG Ratio": {
      if (value < 1.5) {
        return {
          signal: 'good',
          badgeText: 'Good',
          tooltip: `PEG Ratio of ${value.toFixed(2)} is under 1.5, suggesting the growth rate is reasonably priced for tech.`,
          thresholdContext: 'Good: < 1.5 | Bad: > 2.5'
        };
      } else if (value <= 2.5) {
        return {
          signal: 'neutral',
          badgeText: 'Fair',
          tooltip: `PEG Ratio of ${value.toFixed(2)} is within 1.5 to 2.5, indicating normal tech premium on growth.`,
          thresholdContext: 'Good: < 1.5 | Bad: > 2.5'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `PEG Ratio of ${value.toFixed(2)} exceeds 2.5, indicating very expensive growth.`,
          thresholdContext: 'Good: < 1.5 | Bad: > 2.5'
        };
      }
    }

    case "P/S (TTM)": {
      if (value < 10.0) {
        return {
          signal: 'good',
          badgeText: 'Good',
          tooltip: `P/S ratio of ${value.toFixed(2)}× is healthy for high-growth tech (< 10.0×).`,
          thresholdContext: 'Good: < 10.0× | Bad: > 20.0×'
        };
      } else if (value <= 20.0) {
        return {
          signal: 'neutral',
          badgeText: 'Fair',
          tooltip: `P/S ratio of ${value.toFixed(2)}× represents a standard premium tech valuation.`,
          thresholdContext: 'Good: < 10.0× | Bad: > 20.0×'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `P/S ratio of ${value.toFixed(2)}× exceeds 20.0×, signaling heavy sales multiples.`,
          thresholdContext: 'Good: < 10.0× | Bad: > 20.0×'
        };
      }
    }

    case "P/B": {
      if (value < 8.0) {
        return {
          signal: 'good',
          badgeText: 'Good',
          tooltip: `Price to Book ratio of ${value.toFixed(2)}× is healthy for asset-light tech stocks (< 8.0×).`,
          thresholdContext: 'Good: < 8.0× | Bad: > 15.0×'
        };
      } else if (value <= 15.0) {
        return {
          signal: 'neutral',
          badgeText: 'Fair',
          tooltip: `Price to Book ratio of ${value.toFixed(2)}× is typical for established tech companies.`,
          thresholdContext: 'Good: < 8.0× | Bad: > 15.0×'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `Price to Book ratio of ${value.toFixed(2)}× is premium (> 15.0×), reflecting heavy intangible asset reliance.`,
          thresholdContext: 'Good: < 8.0× | Bad: > 15.0×'
        };
      }
    }

    case "EV / Revenue": {
      if (value < 10.0) {
        return {
          signal: 'good',
          badgeText: 'Good',
          tooltip: `EV/Revenue of ${value.toFixed(2)}× is healthy for high-growth tech (< 10.0×).`,
          thresholdContext: 'Good: < 10.0× | Bad: > 20.0×'
        };
      } else if (value <= 20.0) {
        return {
          signal: 'neutral',
          badgeText: 'Fair',
          tooltip: `EV/Revenue of ${value.toFixed(2)}× represents normal tech premium.`,
          thresholdContext: 'Good: < 10.0× | Bad: > 20.0×'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `EV/Revenue of ${value.toFixed(2)}× is expensive, pricing in significant market share growth.`,
          thresholdContext: 'Good: < 10.0× | Bad: > 20.0×'
        };
      }
    }

    case "EV / EBITDA": {
      if (value < 25.0) {
        return {
          signal: 'good',
          badgeText: 'Good',
          tooltip: `EV/EBITDA of ${value.toFixed(2)}× is healthy for growth stocks (< 25.0×).`,
          thresholdContext: 'Good: < 25.0× | Bad: > 40.0×'
        };
      } else if (value <= 40.0) {
        return {
          signal: 'neutral',
          badgeText: 'Fair',
          tooltip: `EV/EBITDA of ${value.toFixed(2)}× is standard for scaled tech platforms.`,
          thresholdContext: 'Good: < 25.0× | Bad: > 40.0×'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `EV/EBITDA of ${value.toFixed(2)}× is high, indicating heavy cash flow multipliers.`,
          thresholdContext: 'Good: < 25.0× | Bad: > 40.0×'
        };
      }
    }

    case "Gross Margin": {
      const pct = value * 100;
      if (value >= 0.40) {
        return {
          signal: 'good',
          badgeText: 'Strong',
          tooltip: `Gross Margin of ${pct.toFixed(2)}% is excellent (> 40%), showing strong pricing power.`,
          thresholdContext: 'Good: > 40% | Bad: < 20%'
        };
      } else if (value >= 0.20) {
        return {
          signal: 'neutral',
          badgeText: 'Normal',
          tooltip: `Gross Margin of ${pct.toFixed(2)}% is standard.`,
          thresholdContext: 'Good: > 40% | Bad: < 20%'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'Weak',
          tooltip: `Gross Margin of ${pct.toFixed(2)}% is thin (< 20%), indicating competitive pressure.`,
          thresholdContext: 'Good: > 40% | Bad: < 20%'
        };
      }
    }

    case "Operating Margin": {
      const pct = value * 100;
      if (value >= 0.20) {
        return {
          signal: 'good',
          badgeText: 'Strong',
          tooltip: `Operating Margin of ${pct.toFixed(2)}% is high (> 20%), indicating highly efficient operational model.`,
          thresholdContext: 'Good: > 20% | Bad: < 10%'
        };
      } else if (value >= 0.10) {
        return {
          signal: 'neutral',
          badgeText: 'Normal',
          tooltip: `Operating Margin of ${pct.toFixed(2)}% is in a healthy baseline range.`,
          thresholdContext: 'Good: > 20% | Bad: < 10%'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'Weak',
          tooltip: `Operating Margin of ${pct.toFixed(2)}% is weak (< 10%), suggesting high operational overhead.`,
          thresholdContext: 'Good: > 20% | Bad: < 10%'
        };
      }
    }

    case "Net Margin":
    case "Profit Margin": {
      const pct = value * 100;
      if (value >= 0.15) {
        return {
          signal: 'good',
          badgeText: 'Strong',
          tooltip: `Net Profit Margin of ${pct.toFixed(2)}% is exceptional (> 15%), displaying highly profitable operations.`,
          thresholdContext: 'Good: > 15% | Bad: < 5%'
        };
      } else if (value >= 0.05) {
        return {
          signal: 'neutral',
          badgeText: 'Normal',
          tooltip: `Net Profit Margin of ${pct.toFixed(2)}% is moderate.`,
          thresholdContext: 'Good: > 15% | Bad: < 5%'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'Weak',
          tooltip: `Net Profit Margin of ${pct.toFixed(2)}% is low (< 5%), yielding thin net profits.`,
          thresholdContext: 'Good: > 15% | Bad: < 5%'
        };
      }
    }

    case "ROE": {
      const pct = value * 100;
      if (value >= 0.15) {
        return {
          signal: 'good',
          badgeText: 'Strong',
          tooltip: `Return on Equity of ${pct.toFixed(2)}% is strong (> 15%), demonstrating efficient generation of returns on shareholder capital.`,
          thresholdContext: 'Good: > 15% | Bad: < 8%'
        };
      } else if (value >= 0.08) {
        return {
          signal: 'neutral',
          badgeText: 'Normal',
          tooltip: `Return on Equity of ${pct.toFixed(2)}% is adequate.`,
          thresholdContext: 'Good: > 15% | Bad: < 8%'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'Weak',
          tooltip: `Return on Equity of ${pct.toFixed(2)}% is low (< 8%), indicating suboptimal return on shareholder equity.`,
          thresholdContext: 'Good: > 15% | Bad: < 8%'
        };
      }
    }

    case "ROA": {
      const pct = value * 100;
      if (value >= 0.08) {
        return {
          signal: 'good',
          badgeText: 'Strong',
          tooltip: `Return on Assets of ${pct.toFixed(2)}% is strong (> 8%), demonstrating efficient asset deployment.`,
          thresholdContext: 'Good: > 8% | Bad: < 3%'
        };
      } else if (value >= 0.03) {
        return {
          signal: 'neutral',
          badgeText: 'Normal',
          tooltip: `Return on Assets of ${pct.toFixed(2)}% is in a standard range.`,
          thresholdContext: 'Good: > 8% | Bad: < 3%'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'Weak',
          tooltip: `Return on Assets of ${pct.toFixed(2)}% is low (< 3%), implying inefficient use of resources/assets.`,
          thresholdContext: 'Good: > 8% | Bad: < 3%'
        };
      }
    }

    case "Current Ratio": {
      if (value >= 1.5 && value <= 3.0) {
        return {
          signal: 'good',
          badgeText: 'Good',
          tooltip: `Current Ratio of ${value.toFixed(2)} is optimal (1.5 - 3.0), showing strong short-term liquidity.`,
          thresholdContext: 'Good: 1.5 to 3.0 | Bad: < 1.0 or > 5.0'
        };
      } else if (value < 1.0 || value > 5.0) {
        const problem = value < 1.0 ? 'insufficient liquidity' : 'excessive idle cash/inventory';
        return {
          signal: 'bad',
          badgeText: 'Risky',
          tooltip: `Current Ratio of ${value.toFixed(2)} is outside healthy limits, pointing to ${problem}.`,
          thresholdContext: 'Good: 1.5 to 3.0 | Bad: < 1.0 or > 5.0'
        };
      } else {
        return {
          signal: 'neutral',
          badgeText: 'Fair',
          tooltip: `Current Ratio of ${value.toFixed(2)} is acceptable, though not fully optimal.`,
          thresholdContext: 'Good: 1.5 to 3.0 | Bad: < 1.0 or > 5.0'
        };
      }
    }

    case "Debt / Equity": {
      if (value < 0.5) {
        return {
          signal: 'good',
          badgeText: 'Low',
          tooltip: `Debt/Equity of ${value.toFixed(2)} is very low (< 0.5), signifying a highly conservative balance sheet.`,
          thresholdContext: 'Good: < 0.5 | Bad: > 1.5'
        };
      } else if (value <= 1.5) {
        return {
          signal: 'neutral',
          badgeText: 'Moderate',
          tooltip: `Debt/Equity of ${value.toFixed(2)} is standard/moderate.`,
          thresholdContext: 'Good: < 0.5 | Bad: > 1.5'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `Debt/Equity of ${value.toFixed(2)} is high (> 1.5), indicating high financial leverage and debt servicing risk.`,
          thresholdContext: 'Good: < 0.5 | Bad: > 1.5'
        };
      }
    }

    case "Beta": {
      if (value >= 0.8 && value <= 1.2) {
        return {
          signal: 'good',
          badgeText: 'Stable',
          tooltip: `Beta of ${value.toFixed(2)} aligns closely with market volatility (0.8 - 1.2), offering balanced risk.`,
          thresholdContext: 'Stable: 0.8 to 1.2 | High: > 1.8 | Low: < 0.5'
        };
      } else if (value < 0.5 || value > 1.8) {
        const description = value < 0.5 ? 'highly non-reactive' : 'extremely volatile';
        return {
          signal: 'bad',
          badgeText: value < 0.5 ? 'Low Vol' : 'High Vol',
          tooltip: `Beta of ${value.toFixed(2)} is ${description} compared to the wider market.`,
          thresholdContext: 'Stable: 0.8 to 1.2 | High: > 1.8 | Low: < 0.5'
        };
      } else {
        return {
          signal: 'neutral',
          badgeText: 'Moderate',
          tooltip: `Beta of ${value.toFixed(2)} indicates moderate price volatility.`,
          thresholdContext: 'Stable: 0.8 to 1.2 | High: > 1.8 | Low: < 0.5'
        };
      }
    }

    case "Short % of Float": {
      const pct = value * 100;
      if (pct < 5.0) {
        return {
          signal: 'good',
          badgeText: 'Low',
          tooltip: `Short interest of ${pct.toFixed(2)}% is low, indicating low short seller interest.`,
          thresholdContext: 'Good: < 5% | Bad: > 15%'
        };
      } else if (pct <= 15.0) {
        return {
          signal: 'neutral',
          badgeText: 'Moderate',
          tooltip: `Short interest of ${pct.toFixed(2)}% is moderate.`,
          thresholdContext: 'Good: < 5% | Bad: > 15%'
        };
      } else {
        return {
          signal: 'bad',
          badgeText: 'High',
          tooltip: `Short interest of ${pct.toFixed(2)}% is high, showing substantial bearish sentiment or high squeeze potential.`,
          thresholdContext: 'Good: < 5% | Bad: > 15%'
        };
      }
    }

    case "Dividend Yield": {
      const pct = value * 100;
      if (pct >= 2.0 && pct <= 5.0) {
        return {
          signal: 'good',
          badgeText: 'Ideal',
          tooltip: `Dividend Yield of ${pct.toFixed(2)}% is within the ideal range (2% - 5%), offering healthy income and safety.`,
          thresholdContext: 'Ideal: 2% - 5% | Very High: > 8%'
        };
      } else if (pct > 8.0) {
        return {
          signal: 'bad',
          badgeText: 'Risky',
          tooltip: `Dividend Yield of ${pct.toFixed(2)}% is high (> 8%), which may indicate a dividend cut risk (dividend trap).`,
          thresholdContext: 'Ideal: 2% - 5% | Very High: > 8%'
        };
      } else {
        return {
          signal: 'neutral',
          badgeText: 'Low',
          tooltip: `Dividend Yield of ${pct.toFixed(2)}% is low, indicating potential focus on capital appreciation instead.`,
          thresholdContext: 'Ideal: 2% - 5% | Very High: > 8%'
        };
      }
    }

    default: {
      return {
        signal: 'neutral',
        badgeText: 'Info',
        tooltip: `${label}: ${value}. No standard evaluation threshold applied.`,
        thresholdContext: 'Informational only'
      };
    }
  }
}
