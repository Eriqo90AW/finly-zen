export type MarketSession = 'Pre-market' | 'Market Open' | 'After-hours' | 'Market Closed';

export interface MarketStatus {
  session: MarketSession;
  label: string;
  color: string;
  nextTransition: Date;
  timeRemaining: string;
}

export interface LocalMetric {
  label: string;
  value: string;
  rawValue: number | null | undefined;
  color: string;
  tooltipPosition?: "top" | "left" | "right" | "bottom";
}

export interface MetricCategory {
  title: string;
  icon: string;
  metrics: LocalMetric[];
}

