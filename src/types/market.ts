export type MarketSession = 'Pre-market' | 'Market Open' | 'After-hours' | 'Market Closed';

export interface MarketStatus {
  session: MarketSession;
  label: string;
  color: string;
  nextTransition: Date;
  timeRemaining: string;
}
