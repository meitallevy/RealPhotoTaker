-- Migration: add seller review columns to claims
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS seller_viewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_decision    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS seller_note        TEXT,
  ADD COLUMN IF NOT EXISTS seller_decided_at  TIMESTAMPTZ;

ALTER TABLE claims
  DROP CONSTRAINT IF EXISTS valid_seller_decision;

ALTER TABLE claims
  ADD CONSTRAINT valid_seller_decision
    CHECK (seller_decision IN ('APPROVED', 'REJECTED', 'MORE_INFO_REQUESTED'));
