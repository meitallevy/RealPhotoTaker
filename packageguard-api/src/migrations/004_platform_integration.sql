-- Migration 004: Pluggable platform integration (Shopify, Wix, WooCommerce, etc.)
-- Extends sellers and claims tables to support unlimited e-commerce platforms
-- without requiring further schema migrations when new platforms are added.

-- ── sellers ────────────────────────────────────────────────────────────────
-- platform_type: VARCHAR (not enum) so new platforms never need a migration.
--   'jwt'     – original Android / email-password sellers (default)
--   'shopify' – Shopify OAuth sellers
--   'wix'     – future
--   etc.
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS platform_type        VARCHAR(50)  NOT NULL DEFAULT 'jwt',
  ADD COLUMN IF NOT EXISTS platform_identifier  VARCHAR(255) DEFAULT NULL,  -- e.g. shop domain
  ADD COLUMN IF NOT EXISTS platform_access_token TEXT        DEFAULT NULL,  -- encrypted OAuth token
  ADD COLUMN IF NOT EXISTS platform_metadata    JSONB        DEFAULT NULL,  -- flexible per-platform data
  ADD COLUMN IF NOT EXISTS platform_installed_at TIMESTAMPTZ DEFAULT NULL;

-- Make users.password_hash nullable: platform OAuth sellers get a synthetic users row
-- but have no password. (sellers has no password_hash column; it lives on users.)
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

-- Fast lookup for OAuth callback: "which seller owns this Shopify store?"
CREATE INDEX IF NOT EXISTS idx_sellers_platform
  ON sellers (platform_type, platform_identifier)
  WHERE platform_identifier IS NOT NULL;

-- ── claims ──────────────────────────────────────────────────────────────────
-- Optional link to a platform-native order (e.g. Shopify order ID).
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS platform_order_id   VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS platform_metadata   JSONB        DEFAULT NULL;

-- ── platform_configs ────────────────────────────────────────────────────────
-- Optional per-seller key/value store for platform-specific configuration.
-- Keeps the sellers row lean while supporting unlimited config keys.
CREATE TABLE IF NOT EXISTS platform_configs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID         NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  platform_type  VARCHAR(50)  NOT NULL,
  config_key     VARCHAR(100) NOT NULL,
  config_value   JSONB,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id, platform_type, config_key)
);

CREATE INDEX IF NOT EXISTS idx_platform_configs_seller
  ON platform_configs (seller_id, platform_type);

-- ── back-fill existing sellers ──────────────────────────────────────────────
-- All rows created before this migration are JWT sellers.
UPDATE sellers SET platform_type = 'jwt' WHERE platform_type IS NULL OR platform_type = '';
