-- Migration 008: Create Usage Summary Views
-- 사용량 요약 뷰 생성

-- Daily usage summary view
CREATE OR REPLACE VIEW daily_usage_summary AS
SELECT
    u.id as user_id,
    u.username,
    u.user_role,
    u.parent_admin_id,
    DATE(aul.created_at) as usage_date,
    COUNT(*) as total_requests,
    SUM(aul.total_tokens) as total_tokens,
    SUM(aul.estimated_cost) as total_cost,
    COUNT(*) FILTER (WHERE aul.success = TRUE) as successful_requests,
    COUNT(*) FILTER (WHERE aul.success = FALSE) as failed_requests
FROM users u
LEFT JOIN api_usage_logs aul ON u.id = aul.user_id
GROUP BY u.id, u.username, u.user_role, u.parent_admin_id, DATE(aul.created_at);

-- Monthly usage summary view
CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT
    u.id as user_id,
    u.username,
    u.user_role,
    u.parent_admin_id,
    DATE_TRUNC('month', aul.created_at) as usage_month,
    COUNT(*) as total_requests,
    SUM(aul.total_tokens) as total_tokens,
    SUM(aul.estimated_cost) as total_cost,
    COUNT(*) FILTER (WHERE aul.success = TRUE) as successful_requests,
    COUNT(*) FILTER (WHERE aul.success = FALSE) as failed_requests
FROM users u
LEFT JOIN api_usage_logs aul ON u.id = aul.user_id
GROUP BY u.id, u.username, u.user_role, u.parent_admin_id, DATE_TRUNC('month', aul.created_at);

-- Function to get current month usage for a user
CREATE OR REPLACE FUNCTION get_current_month_usage(p_user_id UUID)
RETURNS TABLE (
    requests BIGINT,
    tokens BIGINT,
    cost NUMERIC,
    quota_limit INTEGER,
    quota_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(COUNT(*), 0)::BIGINT as requests,
        COALESCE(SUM(aul.total_tokens), 0)::BIGINT as tokens,
        COALESCE(SUM(aul.estimated_cost), 0)::NUMERIC as cost,
        COALESCE(uq.monthly_reply_limit, 1000) as quota_limit,
        GREATEST(0, COALESCE(uq.monthly_reply_limit, 1000) - COALESCE(COUNT(*), 0))::INTEGER as quota_remaining
    FROM api_usage_logs aul
    LEFT JOIN usage_quotas uq ON uq.user_id = p_user_id
    WHERE aul.user_id = p_user_id
      AND DATE_TRUNC('month', aul.created_at) = DATE_TRUNC('month', NOW())
    GROUP BY uq.monthly_reply_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's usage for a user
CREATE OR REPLACE FUNCTION get_today_usage(p_user_id UUID)
RETURNS TABLE (
    requests BIGINT,
    quota_limit INTEGER,
    quota_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(COUNT(*), 0)::BIGINT as requests,
        COALESCE(uq.daily_reply_limit, 100) as quota_limit,
        GREATEST(0, COALESCE(uq.daily_reply_limit, 100) - COALESCE(COUNT(*), 0))::INTEGER as quota_remaining
    FROM api_usage_logs aul
    LEFT JOIN usage_quotas uq ON uq.user_id = p_user_id
    WHERE aul.user_id = p_user_id
      AND DATE(aul.created_at) = CURRENT_DATE
    GROUP BY uq.daily_reply_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON VIEW daily_usage_summary IS 'Daily aggregated usage statistics per user';
COMMENT ON VIEW monthly_usage_summary IS 'Monthly aggregated usage statistics per user';
COMMENT ON FUNCTION get_current_month_usage IS 'Get current month usage stats for a specific user';
COMMENT ON FUNCTION get_today_usage IS 'Get today usage stats for a specific user';
