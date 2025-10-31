-- Migration 006: Create API Usage Tracking Table
-- API 사용량 추적 테이블 생성

-- API Usage Tracking Table
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_type VARCHAR(50) NOT NULL, -- 'openai_chat', 'sentiment_analysis'
    endpoint VARCHAR(100) NOT NULL, -- '/api/reply/generate'
    model_used VARCHAR(100), -- 'gpt-4o-mini'
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,6) DEFAULT 0, -- in USD
    request_size INTEGER, -- bytes
    response_size INTEGER, -- bytes
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INTEGER, -- milliseconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_type ON api_usage_logs(api_type);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_success ON api_usage_logs(success);

-- Add comments
COMMENT ON TABLE api_usage_logs IS 'Tracks all API calls and usage metrics for billing and analytics';
COMMENT ON COLUMN api_usage_logs.user_id IS 'User who made the API call';
COMMENT ON COLUMN api_usage_logs.api_type IS 'Type of API: openai_chat, sentiment_analysis';
COMMENT ON COLUMN api_usage_logs.endpoint IS 'API endpoint called';
COMMENT ON COLUMN api_usage_logs.model_used IS 'AI model used (e.g., gpt-4o-mini)';
COMMENT ON COLUMN api_usage_logs.prompt_tokens IS 'Number of input tokens';
COMMENT ON COLUMN api_usage_logs.completion_tokens IS 'Number of output tokens';
COMMENT ON COLUMN api_usage_logs.total_tokens IS 'Total tokens (prompt + completion)';
COMMENT ON COLUMN api_usage_logs.estimated_cost IS 'Estimated cost in USD based on token usage';
COMMENT ON COLUMN api_usage_logs.success IS 'Whether the API call was successful';
COMMENT ON COLUMN api_usage_logs.execution_time_ms IS 'API call duration in milliseconds';
