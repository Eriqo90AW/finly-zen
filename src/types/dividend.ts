export type DividendStatus = 'paid' | 'projected' | 'upcoming';
export type DividendFrequency = 'final' | 'interim' | 'annual' | 'other';

export interface DividendEntry {
  ticker: string;
  company_name: string;
  currency: string;
  amount: number;
  cum_date: string;
  ex_date: string;
  record_date: string;
  payment_date: string;
  frequency: DividendFrequency;
  year: number;
  status: DividendStatus;
}

export interface CalendarDay {
  date: Date;
  dividends: DividendEntry[];
  isCurrentMonth: boolean;
  isToday: boolean;
}
