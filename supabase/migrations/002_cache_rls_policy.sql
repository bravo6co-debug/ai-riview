-- sentiment_analysis_cache RLS 정책 추가
-- 서비스 역할은 모든 작업 가능 (API에서 사용)
CREATE POLICY "Service role can manage cache" ON sentiment_analysis_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 인증된 사용자는 조회만 가능
CREATE POLICY "Authenticated users can view cache" ON sentiment_analysis_cache
    FOR SELECT
    TO authenticated
    USING (true);
