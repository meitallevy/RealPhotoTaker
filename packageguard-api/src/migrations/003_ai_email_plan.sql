-- Migration 003: AI image analysis columns + seller plan/tier foundation

-- AI analysis result per evidence item
ALTER TABLE evidence_items
  ADD COLUMN IF NOT EXISTS ai_verdict       VARCHAR(20)  DEFAULT NULL
    CHECK (ai_verdict IN ('REAL', 'AI_GENERATED', 'SCREEN_CAPTURE', 'UNCERTAIN')),
  ADD COLUMN IF NOT EXISTS ai_confidence    DECIMAL(4,3) DEFAULT NULL,  -- 0.000 – 1.000
  ADD COLUMN IF NOT EXISTS ai_details       TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at   TIMESTAMPTZ  DEFAULT NULL;

-- Plan / tier per seller (foundation for future billing)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS plan               VARCHAR(20) NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'small', 'pro', 'business', 'ultra')),
  ADD COLUMN IF NOT EXISTS plan_started_at    TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS plan_daily_limit   INT         DEFAULT 5,
  ADD COLUMN IF NOT EXISTS plan_monthly_limit INT         DEFAULT 30,
  ADD COLUMN IF NOT EXISTS plan_total_limit   INT         DEFAULT 100;

-- Helpful index for fast daily/monthly count queries
CREATE INDEX IF NOT EXISTS idx_claims_seller_created
  ON claims (seller_id, created_at DESC);
