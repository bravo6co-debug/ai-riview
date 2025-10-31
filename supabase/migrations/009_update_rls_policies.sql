-- Migration 009: Update RLS Policies for Multi-Tier System
-- RLS 정책 업데이트 (다단계 권한 시스템)

-- ============================================
-- Enable RLS on new tables
-- ============================================
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for api_usage_logs
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own usage logs" ON api_usage_logs;
DROP POLICY IF EXISTS "Super admins can view all usage logs" ON api_usage_logs;
DROP POLICY IF EXISTS "Sub admins can view their customers usage logs" ON api_usage_logs;
DROP POLICY IF EXISTS "Service role can manage usage logs" ON api_usage_logs;

-- Users can view their own usage logs
CREATE POLICY "Users can view own usage logs" ON api_usage_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- Super admins can view ALL usage logs
CREATE POLICY "Super admins can view all usage logs" ON api_usage_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND user_role = 'super_admin'
        )
    );

-- Sub-admins can view their customers' usage logs
CREATE POLICY "Sub admins can view their customers usage logs" ON api_usage_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = api_usage_logs.user_id
            AND users.parent_admin_id = auth.uid()
        )
    );

-- Service role can manage usage logs (for API routes)
CREATE POLICY "Service role can manage usage logs" ON api_usage_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- RLS Policies for usage_quotas
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own quotas" ON usage_quotas;
DROP POLICY IF EXISTS "Super admins can manage all quotas" ON usage_quotas;
DROP POLICY IF EXISTS "Sub admins can manage customers quotas" ON usage_quotas;
DROP POLICY IF EXISTS "Service role can manage quotas" ON usage_quotas;

-- Users can view their own quotas
CREATE POLICY "Users can view own quotas" ON usage_quotas
    FOR SELECT
    USING (user_id = auth.uid());

-- Super admins can manage all quotas
CREATE POLICY "Super admins can manage all quotas" ON usage_quotas
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND user_role = 'super_admin'
        )
    );

-- Sub-admins can manage their customers' quotas
CREATE POLICY "Sub admins can manage customers quotas" ON usage_quotas
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = usage_quotas.user_id
            AND users.parent_admin_id = auth.uid()
        )
    );

-- Service role can manage quotas (for API routes)
CREATE POLICY "Service role can manage quotas" ON usage_quotas
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Updated RLS Policies for users table
-- ============================================

-- Drop old conflicting policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Sub admins can view their customers" ON users;

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (id = auth.uid());

-- Super admins can view and manage ALL users
CREATE POLICY "Super admins can manage all users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.user_role = 'super_admin'
        )
    );

-- Sub-admins can view and manage their own customers
CREATE POLICY "Sub admins can manage their customers" ON users
    FOR ALL
    USING (
        parent_admin_id = auth.uid() OR  -- Can see their customers
        id = auth.uid()  -- Can see themselves
    )
    WITH CHECK (
        parent_admin_id = auth.uid() OR  -- Can modify their customers
        id = auth.uid()  -- Can modify themselves
    );

-- ============================================
-- Updated RLS Policies for reply_history table
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own reply history" ON reply_history;
DROP POLICY IF EXISTS "Super admins can view all reply history" ON reply_history;
DROP POLICY IF EXISTS "Sub admins can view their customers reply history" ON reply_history;

-- Users can view their own reply history
CREATE POLICY "Users can view own reply history" ON reply_history
    FOR SELECT
    USING (user_id = auth.uid());

-- Super admins can view all reply history
CREATE POLICY "Super admins can view all reply history" ON reply_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND user_role = 'super_admin'
        )
    );

-- Sub-admins can view their customers' reply history
CREATE POLICY "Sub admins can view customers reply history" ON reply_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = reply_history.user_id
            AND users.parent_admin_id = auth.uid()
        )
    );

-- Service role can manage reply history (for API routes)
CREATE POLICY "Service role can manage reply history" ON reply_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
