export type TradeDirection = 'LONG' | 'SHORT';
export type PosStatusType = 'OPEN' | 'PARTIAL' | 'CLOSED';
export type RecordType = 'SETUP' | 'EXECUTED';
export type SetupStatusType = 'PLANNED' | 'EXECUTED' | 'SKIPPED' | 'EXPIRED';
export type SetupQualityType = 'A' | 'B' | 'C';
export type ResultLabelType = 'CUAN' | 'SL HIT' | 'TP1' | 'TP2' | 'BREAKEVEN' | 'OPEN';

export interface EntryLeg {
  lot: number;
  price: number;
  time?: string;
  reason?: string;
}

export interface ExitLeg {
  lot: number;
  price: number;
  type: string; // 'TP1' | 'TP2' | 'SL' | 'TP full' etc.
  time?: string;
}

export interface TradingJournalRow {
  id: string;
  trade_date: string;
  ticker: string;
  direction: TradeDirection;
  pos_status: PosStatusType;
  record_type: RecordType;
  setup_quality: SetupQualityType | null;
  setup_status: SetupStatusType | null;
  setup_type: string | null;
  lots: number;
  lots_remaining: number | null;
  lots_closed: number | null;
  entry_zone_ideal: number | null;
  entry_zone_max: number | null;
  avg_entry_price: number | null;
  avg_exit_price: number | null;
  stop_loss: number | null;
  tp1_price: number | null;
  tp2_price: number | null;
  trail_sl: number | null;
  entry_details: EntryLeg[] | null;
  exit_details: ExitLeg[] | null;
  commission_buy: number | null;
  commission_sell: number | null;
  total_fee: number | null;
  gross_pnl: number | null;
  net_pnl: number | null;
  roi_pct: number | null;
  planned_rr: number | null;
  risk_r: number | null;
  risk_amount: number | null;
  analysis_raw: string | null;
  checklist: string[] | null;
  result_label: ResultLabelType | null;
  entry_session: string | null;
  hold_days: number | null;
  psychology_tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      trading_journal: {
        Row: TradingJournalRow;
        Insert: Omit<TradingJournalRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TradingJournalRow>;
      };
    };
  };
}
