# 설치 및 설정 가이드

환경 변수가 설정되었습니다! 이제 다음 단계를 진행하세요.

## ✅ 완료된 작업

- [x] 프로젝트 구조 생성
- [x] Python 백엔드 코드 작성
- [x] Next.js 프론트엔드 코드 작성
- [x] 환경 변수 설정 (.env.local)

## 📋 다음 단계

### 1단계: Supabase 데이터베이스 설정 (5분)

1. [Supabase Dashboard](https://supabase.com/dashboard/project/abmznacsmekugtgagdnk)에 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. **New query** 버튼 클릭
4. 아래 SQL을 복사하여 붙여넣고 **Run** 클릭:

\`\`\`sql
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
INSERT INTO users (username, password_hash, is_admin)
VALUES (
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zzHEfq3.Zm7K',
    TRUE
);
\`\`\`

5. 성공 메시지 확인: "Success. No rows returned"

---

### 2단계: 의존성 설치 (3분)

#### Node.js 패키지 설치

\`\`\`bash
cd c:/Users/admin/onsajang/airiview
npm install
\`\`\`

#### Python 패키지 설치

\`\`\`bash
cd python
pip install -r requirements.txt
cd ..
\`\`\`

**예상 설치 시간**: 약 2-3분

---

### 3단계: 개발 서버 실행 (1분)

\`\`\`bash
npm run dev
\`\`\`

서버가 시작되면 브라우저에서 다음 주소로 접속:

**http://localhost:3000**

---

### 4단계: 로그인 테스트

1. 로그인 페이지로 자동 이동
2. 다음 정보로 로그인:
   - **아이디**: admin
   - **비밀번호**: admin123

---

### 5단계: 답글 생성 테스트

다음 테스트 리뷰를 사용해보세요:

#### 긍정 리뷰 테스트
\`\`\`
커피가 정말 맛있고 직원분들이 너무 친절하세요!
분위기도 좋고 인테리어도 예뻐서 자주 올 것 같아요.
\`\`\`

**예상 결과**: 긍정 감정 분석 + 따뜻한 감사 답글

#### 부정 리뷰 테스트
\`\`\`
음식이 별로였고 직원 태도가 불친절했어요.
가격도 비싸고 대기시간도 너무 길어서 실망했습니다.
\`\`\`

**예상 결과**: 부정 감정 분석 + 진심 어린 사과 답글

#### 중립 리뷰 테스트
\`\`\`
가격은 조금 비싸지만 맛은 괜찮았어요.
다음에 한 번 더 와볼 생각입니다.
\`\`\`

**예상 결과**: 중립 감정 분석 + 방문 감사 답글

---

## 🎯 설치 체크리스트

- [ ] Supabase SQL 실행 완료
- [ ] npm install 완료
- [ ] pip install 완료
- [ ] npm run dev 실행
- [ ] http://localhost:3000 접속 성공
- [ ] admin/admin123 로그인 성공
- [ ] 답글 생성 테스트 성공

---

## 🚨 문제 해결

### 문제 1: npm install 오류

\`\`\`bash
# package-lock.json 삭제 후 재설치
rm -f package-lock.json
npm install
\`\`\`

### 문제 2: Python 패키지 설치 오류

\`\`\`bash
# pip 업그레이드
python -m pip install --upgrade pip

# 가상환경 사용 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r python/requirements.txt
\`\`\`

### 문제 3: Supabase 연결 오류

1. `.env.local` 파일 확인
2. Supabase URL과 키가 정확한지 확인
3. Supabase 프로젝트가 활성화되어 있는지 확인

### 문제 4: OpenAI API 오류

1. API 키가 유효한지 확인
2. 크레딧 잔액 확인: https://platform.openai.com/usage
3. API 키에 사용 권한이 있는지 확인

### 문제 5: Port 3000이 이미 사용 중

\`\`\`bash
# 다른 포트로 실행
PORT=3001 npm run dev
\`\`\`

---

## 📊 설정 요약

| 항목 | 값 |
|-----|-----|
| **Supabase URL** | https://abmznacsmekugtgagdnk.supabase.co |
| **로컬 주소** | http://localhost:3000 |
| **관리자 아이디** | admin |
| **관리자 비밀번호** | admin123 |

---

## 🔐 보안 주의사항

### 프로덕션 배포 전 필수 작업

1. **JWT Secret 변경**
   - 현재 사용 중인 Legacy JWT Secret는 예시용
   - 프로덕션에서는 반드시 새로운 랜덤 문자열 생성

2. **관리자 비밀번호 변경**
   \`\`\`sql
   -- Supabase SQL Editor에서 실행
   UPDATE users
   SET password_hash = '$2b$12$NEW_HASH_HERE'
   WHERE username = 'admin';
   \`\`\`

3. **.env.local 파일 보안**
   - Git에 커밋하지 않기 (.gitignore에 추가됨)
   - 팀원과 공유하지 않기

---

## 📚 다음 문서

설치가 완료되면 다음 문서를 참고하세요:

- **사용 방법**: [README.md](./README.md)
- **배포 가이드**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **프로젝트 구조**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

---

## 🎉 설치 완료!

모든 단계가 완료되면 답글 생성 서비스를 사용할 수 있습니다.

문제가 발생하면 위의 문제 해결 섹션을 참고하거나 GitHub Issues에 문의하세요.

**Happy Coding! 🚀**
