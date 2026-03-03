-- Initial schema for PackageGuard (users, sellers, claims, evidence, audit_log, nonces, feature_flags)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'seller',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seller_id VARCHAR(50) UNIQUE NOT NULL,
    business_name VARCHAR(255),
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    notification_email BOOLEAN DEFAULT TRUE,
    notification_webhook BOOLEAN DEFAULT FALSE,
    country VARCHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sellers_seller_id ON sellers(seller_id);

CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id VARCHAR(50) UNIQUE NOT NULL,
    seller_id UUID REFERENCES sellers(id),
    order_id VARCHAR(255) NOT NULL,
    nonce VARCHAR(10) NOT NULL,
    nonce_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    buyer_notes TEXT,
    risk_score INTEGER,
    risk_factors JSONB,
    device_info JSONB,
    attestation_token TEXT,
    attestation_result JSONB,
    manifest_hash VARCHAR(100),
    signature TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_status CHECK (status IN ('PENDING', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_claims_claim_id ON claims(claim_id);
CREATE INDEX IF NOT EXISTS idx_claims_seller_id ON claims(seller_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at);

CREATE TABLE IF NOT EXISTS evidence_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id VARCHAR(50) UNIQUE NOT NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    step_id VARCHAR(50),
    sequence_number INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    resolution VARCHAR(20),
    captured_at TIMESTAMP WITH TIME ZONE,
    device_timezone VARCHAR(50),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    exif_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_claim_id ON evidence_items(claim_id);

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    actor_id UUID,
    actor_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS nonces (
    nonce VARCHAR(10) PRIMARY KEY,
    claim_id UUID REFERENCES claims(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    flag_value JSONB NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

