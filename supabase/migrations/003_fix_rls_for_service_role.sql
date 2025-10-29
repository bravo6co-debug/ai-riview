-- Service Role은 RLS를 우회해야 함
-- users 테이블 RLS 정책 추가

-- 기존 정책 제거 (있다면)
DROP POLICY IF EXISTS "Service role can manage users" ON users;

-- Service role은 모든 작업 가능
CREATE POLICY "Service role can manage users" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 인증된 사용자는 자신의 정보만 조회 가능
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());
