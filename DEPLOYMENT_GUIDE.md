# 배포 가이드

네이버 플레이스 리뷰 답글 생성 서비스를 Vercel과 Supabase에 배포하는 완전한 가이드입니다.

## 사전 준비사항

### 필수 계정
- [Supabase](https://supabase.com) 계정
- [Vercel](https://vercel.com) 계정
- [OpenAI](https://platform.openai.com) API 키
- GitHub 계정 (Vercel 연동용)

---

## 1단계: Supabase 프로젝트 생성

### 1.1 프로젝트 생성

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. "New Project" 버튼 클릭
3. 프로젝트 정보 입력:
   - **Name**: naver-reply-service
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: Northeast Asia (Seoul)
4. "Create new project" 클릭

### 1.2 데이터베이스 스키마 생성

1. 좌측 메뉴에서 "SQL Editor" 선택
2. "New query" 버튼 클릭
3. \`supabase/migrations/001_init.sql\` 파일의 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭하여 실행

### 1.3 API 키 복사

1. 좌측 메뉴에서 "Settings" > "API" 선택
2. 다음 값들을 메모장에 복사:
   - **Project URL**: \`https://xxxxx.supabase.co\`
   - **anon public key**: \`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\`
   - **service_role key**: \`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\`

---

## 2단계: OpenAI API 키 생성

### 2.1 API 키 발급

1. [OpenAI Platform](https://platform.openai.com/api-keys)에 로그인
2. "Create new secret key" 버튼 클릭
3. Name: "naver-reply-service" 입력
4. 생성된 키 복사 (한 번만 표시됨!): \`sk-proj-xxxxx...\`

### 2.2 사용량 제한 설정 (권장)

1. [Usage limits](https://platform.openai.com/account/limits)로 이동
2. Monthly budget 설정 (예: $10)
3. Email alerts 활성화

---

## 3단계: GitHub 저장소 생성

### 3.1 저장소 생성

1. [GitHub](https://github.com)에 로그인
2. "New repository" 클릭
3. Repository name: "naver-reply-service"
4. Visibility: Private (권장)
5. "Create repository" 클릭

### 3.2 코드 푸시

\`\`\`bash
# Git 초기화
cd c:/Users/admin/onsajang/airiview
git init

# .gitignore 확인
git add .
git commit -m "Initial commit: 네이버 플레이스 답글 생성 서비스"

# 원격 저장소 연결
git remote add origin https://github.com/yourusername/naver-reply-service.git

# 푸시
git branch -M main
git push -u origin main
\`\`\`

---

## 4단계: Vercel 배포

### 4.1 프로젝트 Import

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. "Add New..." > "Project" 클릭
3. GitHub 저장소 연결:
   - "Import Git Repository" 선택
   - "naver-reply-service" 선택
   - "Import" 클릭

### 4.2 환경 변수 설정

**Environment Variables** 섹션에서 다음 변수들을 추가:

\`\`\`
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx...

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars-change-this-in-production

# App
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
\`\`\`

**중요**: JWT_SECRET은 최소 32자의 무작위 문자열로 설정하세요.

\`\`\`bash
# 안전한 비밀키 생성 (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

### 4.3 배포 설정

1. **Framework Preset**: Next.js (자동 감지)
2. **Build Command**: \`next build\` (기본값)
3. **Output Directory**: \`.next\` (기본값)
4. **Install Command**: 기본값 유지
5. "Deploy" 버튼 클릭

### 4.4 배포 완료 확인

1. 배포가 완료되면 "Visit" 버튼 클릭
2. 배포된 URL로 이동: \`https://your-project.vercel.app\`

---

## 5단계: 초기 설정 및 테스트

### 5.1 관리자 계정 확인

Supabase SQL Editor에서 관리자 계정이 생성되었는지 확인:

\`\`\`sql
SELECT * FROM users WHERE username = 'admin';
\`\`\`

만약 없다면:

\`\`\`sql
-- 비밀번호: admin123
INSERT INTO users (username, password_hash, is_admin)
VALUES (
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zzHEfq3.Zm7K',
  TRUE
);
\`\`\`

### 5.2 로그인 테스트

1. 배포된 사이트로 이동
2. 로그인 페이지에서 테스트:
   - **아이디**: admin
   - **비밀번호**: admin123
3. 로그인 성공 확인

### 5.3 답글 생성 테스트

1. 대시보드에서 테스트 리뷰 입력:
   \`\`\`
   커피가 정말 맛있고 직원분들이 친절하세요! 분위기도 좋아서 자주 올 것 같아요.
   \`\`\`
2. "답글 생성하기" 버튼 클릭
3. 답글이 생성되고 클립보드에 복사되는지 확인

---

## 6단계: 보안 설정

### 6.1 Supabase RLS (Row Level Security) 확인

Supabase SQL Editor에서 RLS가 활성화되었는지 확인:

\`\`\`sql
-- RLS 상태 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'reply_history', 'sentiment_analysis_cache');
\`\`\`

모든 테이블에서 \`rowsecurity = true\`인지 확인.

### 6.2 JWT Secret 변경

**프로덕션 환경에서는 반드시 강력한 JWT Secret을 사용하세요!**

Vercel 대시보드에서:
1. Settings > Environment Variables
2. JWT_SECRET 편집
3. 강력한 랜덤 문자열로 변경
4. Redeploy

### 6.3 비밀번호 변경

초기 관리자 비밀번호를 변경하세요:

\`\`\`sql
-- 새 비밀번호 해시 생성 (Python)
-- python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('NEW_PASSWORD'))"

UPDATE users
SET password_hash = '$2b$12$NEW_HASH_HERE'
WHERE username = 'admin';
\`\`\`

---

## 7단계: 모니터링 및 유지보수

### 7.1 Vercel 로그 확인

1. Vercel 대시보드 > 프로젝트 선택
2. "Deployments" 탭에서 최근 배포 확인
3. "Functions" 탭에서 API 호출 로그 확인

### 7.2 Supabase 사용량 모니터링

1. Supabase 대시보드 > "Reports"
2. Database size, API requests 확인
3. Free plan 한도:
   - 500MB 데이터베이스
   - 2GB 대역폭/월
   - 50,000 API requests/월

### 7.3 OpenAI 비용 모니터링

1. [OpenAI Usage](https://platform.openai.com/usage)에서 확인
2. 예상 비용:
   - 1000개 답글/월: ~$0.24
   - 5000개 답글/월: ~$1.20

---

## 8단계: 커스텀 도메인 설정 (선택)

### 8.1 Vercel에 도메인 추가

1. Vercel 대시보드 > 프로젝트 > "Settings" > "Domains"
2. "Add" 버튼 클릭
3. 도메인 입력: \`reply.yourdomain.com\`
4. DNS 설정 안내 따라하기

### 8.2 DNS 레코드 추가

도메인 제공업체에서:

\`\`\`
Type: CNAME
Name: reply
Value: cname.vercel-dns.com
\`\`\`

### 8.3 SSL 인증서

Vercel이 자동으로 Let's Encrypt SSL 인증서를 발급합니다 (무료).

---

## 트러블슈팅

### 문제 1: API 호출 시 500 오류

**원인**: 환경 변수 미설정

**해결**:
1. Vercel > Settings > Environment Variables 확인
2. 모든 필수 변수가 설정되었는지 확인
3. Redeploy

### 문제 2: Supabase 연결 오류

**원인**: RLS 정책 또는 API 키 오류

**해결**:
\`\`\`sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'reply_history';

-- 임시로 RLS 비활성화 (테스트용)
ALTER TABLE reply_history DISABLE ROW LEVEL SECURITY;
\`\`\`

### 문제 3: Python 모듈 Import 오류

**원인**: 파일 경로 문제

**해결**:
\`api/reply/generate.py\`에서 경로 확인:
\`\`\`python
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))
\`\`\`

### 문제 4: OpenAI API 요금 초과

**해결**:
1. [Usage limits](https://platform.openai.com/account/limits)에서 제한 설정
2. 캐싱 시스템이 정상 작동하는지 확인
3. Supabase에서 캐시 히트율 확인:
   \`\`\`sql
   SELECT
     COUNT(*) as total_cached,
     AVG(hit_count) as avg_hits
   FROM sentiment_analysis_cache;
   \`\`\`

---

## 비용 최적화 팁

### 1. 캐싱 최대 활용
- 동일한 리뷰는 캐시에서 조회 (95% 비용 절감)
- 캐시 테이블 정기 정리:
  \`\`\`sql
  DELETE FROM sentiment_analysis_cache
  WHERE hit_count = 0
  AND created_at < NOW() - INTERVAL '30 days';
  \`\`\`

### 2. AI 호출 최소화
- 간단한 리뷰는 룰 기반 분석만 사용
- \`needs_deep_analysis\` 조건 엄격하게 설정

### 3. Vercel Functions 최적화
- 불필요한 패키지 제거
- 함수 실행 시간 모니터링

---

## 다음 단계

- [ ] 관리자 대시보드 구현
- [ ] 사용자 계정 관리 기능
- [ ] 통계 및 리포트 기능
- [ ] CSV 일괄 업로드
- [ ] 브랜드별 톤앤매너 커스터마이징

---

**배포 완료! 🎉**

문제가 발생하면 [GitHub Issues](https://github.com/yourusername/naver-reply-service/issues)에서 문의하세요.
