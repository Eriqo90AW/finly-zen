-- ============================================================
-- TRADING JOURNAL + SETUPS — Full DDL for Supabase PostgreSQL
-- IntelBursa x Riko | IHSG Day Trading
-- ============================================================

-- 1. ENUM types (optional tapi rapi)
CREATE TYPE trade_direction AS ENUM ('LONG', 'SHORT');
CREATE TYPE pos_status_type AS ENUM ('OPEN', 'PARTIAL', 'CLOSED');
CREATE TYPE record_type AS ENUM ('SETUP', 'EXECUTED');
CREATE TYPE setup_status_type AS ENUM ('PLANNED', 'EXECUTED', 'SKIPPED', 'EXPIRED');
CREATE TYPE setup_quality_type AS ENUM ('A', 'B', 'C');
CREATE TYPE result_label_type AS ENUM ('CUAN', 'SL HIT', 'TP1', 'TP2', 'BREAKEVEN', 'OPEN');

-- 2. Main table
CREATE TABLE trading_journal (
  -- Identitas
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_date      DATE NOT NULL,
  ticker          VARCHAR(10) NOT NULL,
  direction       trade_direction DEFAULT 'LONG',
  pos_status      pos_status_type DEFAULT 'OPEN',

  -- Record type (SETUP vs EXECUTED)
  record_type     record_type NOT NULL DEFAULT 'EXECUTED',
  setup_quality   setup_quality_type,
  setup_status    setup_status_type,
  setup_type      VARCHAR(50),            -- 'Bandarmology Accumulation', 'Foreign Flow', etc

  -- Quantity
  lots            INT NOT NULL DEFAULT 0,
  lots_remaining  INT DEFAULT 0,
  lots_closed     INT DEFAULT 0,

  -- Price levels
  entry_zone_ideal  NUMERIC(12,2),       -- target ideal entry (for SETUP)
  entry_zone_max    NUMERIC(12,2),       -- max buy price (for SETUP)
  avg_entry_price   NUMERIC(12,2),       -- weighted avg entry (post-execution)
  avg_exit_price    NUMERIC(12,2),       -- weighted avg exit
  stop_loss         NUMERIC(12,2),
  tp1_price         NUMERIC(12,2),
  tp2_price         NUMERIC(12,2),
  trail_sl          NUMERIC(12,2),       -- trailing stop (for PARTIAL positions)

  -- Leg details (JSONB — multi-leg entries & partial exits)
  entry_details     JSONB,
  exit_details      JSONB,

  -- Fees (Stockbit: Buy 0.1933%, Sell 0.2933%)
  commission_buy    NUMERIC(15,2),
  commission_sell   NUMERIC(15,2),
  total_fee         NUMERIC(15,2),

  -- P&L
  gross_pnl         NUMERIC(15,2),
  net_pnl           NUMERIC(15,2),
  roi_pct           NUMERIC(8,2),

  -- Risk & Analysis
  planned_rr        NUMERIC(6,2),        -- planned R:R (for SETUP)
  risk_r            NUMERIC(6,2),        -- actual realized R:R
  risk_amount       NUMERIC(15,2),       -- |avg_entry - sl| x lots x 100
  analysis_raw      TEXT,                -- full analysis notes (bandarmology + ff)
  checklist         TEXT[],              -- confluences: {"VWAP Support","Volume Expansion","Net Foreign Buy"}

  -- Result
  result_label      result_label_type,

  -- Meta
  entry_session     VARCHAR(10),         -- 'Sesi 1', 'Sesi 2', 'Sesi 1 + Sesi 2'
  hold_days         INT,
  psychology_tags   TEXT[],              -- {"Disciplined","Averaged Correctly","FOMO"}
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX idx_tj_date        ON trading_journal (trade_date DESC);
CREATE INDEX idx_tj_ticker      ON trading_journal (ticker);
CREATE INDEX idx_tj_record_type ON trading_journal (record_type);
CREATE INDEX idx_tj_setup_status ON trading_journal (setup_status) WHERE record_type = 'SETUP';
CREATE INDEX idx_tj_pos_status  ON trading_journal (pos_status) WHERE record_type = 'EXECUTED';
CREATE INDEX idx_tj_result      ON trading_journal (result_label);
CREATE INDEX idx_tj_setup_quality ON trading_journal (setup_quality);
CREATE INDEX idx_tj_gin_entry   ON trading_journal USING GIN (entry_details);
CREATE INDEX idx_tj_gin_exit    ON trading_journal USING GIN (exit_details);
CREATE INDEX idx_tj_gin_checklist ON trading_journal USING GIN (checklist);

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trading_journal_updated_at
  BEFORE UPDATE ON trading_journal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Validation constraints
ALTER TABLE trading_journal ADD CONSTRAINT chk_sensible_prices
  CHECK (
    (avg_entry_price IS NULL OR avg_entry_price > 0)
    AND (stop_loss IS NULL OR stop_loss > 0)
    AND (tp1_price IS NULL OR tp1_price > 0)
  );

ALTER TABLE trading_journal ADD CONSTRAINT chk_setup_has_zone
  CHECK (
    record_type != 'SETUP'
    OR (entry_zone_ideal IS NOT NULL AND entry_zone_max IS NOT NULL)
  );

ALTER TABLE trading_journal ADD CONSTRAINT chk_executed_has_entry
  CHECK (
    record_type != 'EXECUTED'
    OR avg_entry_price IS NOT NULL
  );

ALTER TABLE trading_journal ADD CONSTRAINT chk_lots_consistency
  CHECK (
    lots = COALESCE(lots_closed, 0) + COALESCE(lots_remaining, 0)
    AND lots >= 0
    AND lots_closed >= 0
    AND lots_remaining >= 0
  );

-- ============================================================
-- END DDL
-- ============================================================
