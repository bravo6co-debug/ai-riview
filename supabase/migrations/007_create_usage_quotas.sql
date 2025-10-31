-- Migration 007: Create Usage Quotas Table
-- 사용 한도 테이블 생성

-- Usage Quotas Table (for limiting customer usage)
CREATE TABLE IF NOT EXISTS usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    monthly_reply_limit INTEGER DEFAULT 1000, -- replies per month
    daily_reply_limit INTEGER DEFAULT 100, -- replies per day
    monthly_token_limit INTEGER DEFAULT 100000, -- tokens per month
    quota_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_quotas_user ON usage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_reset ON usage_quotas(quota_reset_date);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_usage_quotas_updated_at
    BEFORE UPDATE ON usage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE usage_quotas IS 'Defines usage limits per customer';
COMMENT ON COLUMN usage_quotas.monthly_reply_limit IS 'Maximum replies allowed per month';
COMMENT ON COLUMN usage_quotas.daily_reply_limit IS 'Maximum replies allowed per day';
COMMENT ON COLUMN usage_quotas.monthly_token_limit IS 'Maximum tokens allowed per month';
COMMENT ON COLUMN usage_quotas.quota_reset_date IS 'Date when monthly quota resets (usually 1st of month)';
