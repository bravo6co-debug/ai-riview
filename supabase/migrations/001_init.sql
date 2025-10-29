-- 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- 답글 생성 이력
CREATE TABLE reply_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    review_content TEXT NOT NULL,
    generated_reply TEXT NOT NULL,
    sentiment VARCHAR(20),
    sentiment_strength DECIMAL(3,2),
    topics JSONB,
    keywords JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 감정 분석 캐시
CREATE TABLE sentiment_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    content_preview TEXT,
    sentiment VARCHAR(20) NOT NULL,
    sentiment_strength DECIMAL(3,2),
    topics JSONB,
    keywords JSONB,
    intent VARCHAR(50),
    reply_focus JSONB,
    reply_avoid JSONB,
    summary TEXT,
    analysis_model VARCHAR(100),
    hit_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_reply_history_user ON reply_history(user_id);
CREATE INDEX idx_reply_history_date ON reply_history(created_at DESC);
CREATE INDEX idx_sentiment_cache_hash ON sentiment_analysis_cache(content_hash);
CREATE INDEX idx_users_username ON users(username);

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_analysis_cache ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 데이터만 조회
CREATE POLICY "Users can view own reply history" ON reply_history
    FOR SELECT
    USING (user_id = auth.uid());

-- RLS 정책: 관리자는 모든 데이터 조회 가능
CREATE POLICY "Admins can view all data" ON reply_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- 초기 관리자 계정 생성 (비밀번호: admin123)
-- bcrypt 해시: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zzHEfq3.Zm7K
INSERT INTO users (username, password_hash, is_admin)
VALUES (
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zzHEfq3.Zm7K',
    TRUE
);
