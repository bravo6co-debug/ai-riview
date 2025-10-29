# 빠른 시작 가이드

5분 안에 개발 환경을 설정하고 서비스를 실행하세요!

## 1단계: 의존성 설치 (2분)

### Node.js 패키지 설치

\`\`\`bash
npm install
\`\`\`

### Python 패키지 설치

\`\`\`bash
cd python
pip install -r requirements.txt
cd ..
\`\`\`

## 2단계: 환경 변수 설정 (2분)

\`.env.local\` 파일을 생성하세요:

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

그리고 다음 값들을 입력하세요:

\`\`\`env
# Supabase (https://supabase.com에서 프로젝트 생성 후)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (https://platform.openai.com/api-keys에서 생성)
OPENAI_API_KEY=sk-proj-your-api-key

# JWT Secret (32자 이상의 랜덤 문자열)
JWT_SECRET=your-super-secret-key-change-this

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### JWT Secret 생성하기

\`\`\`bash
# Node.js로 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 또는 Python으로
python -c "import secrets; print(secrets.token_hex(32))"
\`\`\`

## 3단계: Supabase 데이터베이스 설정 (1분)

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. 새 프로젝트 생성
3. SQL Editor 열기
4. \`supabase/migrations/001_init.sql\` 파일 내용 복사
5. 실행 (Run)

## 4단계: 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 5단계: 로그인

- **아이디**: admin
- **비밀번호**: admin123

## 테스트 리뷰

다음 리뷰로 테스트해보세요:

### 긍정 리뷰
\`\`\`
커피가 정말 맛있고 직원분들이 너무 친절하세요!
분위기도 좋고 인테리어도 예뻐서 자주 올 것 같아요.
\`\`\`

### 부정 리뷰
\`\`\`
음식이 별로였고 직원 태도가 불친절했어요.
가격도 비싸고 대기시간도 너무 길어서 실망했습니다.
\`\`\`

### 중립 리뷰
\`\`\`
가격은 조금 비싸지만 맛은 괜찮았어요.
다음에 한 번 더 와볼 생각입니다.
\`\`\`

## 문제 해결

### 문제: 모듈을 찾을 수 없음

\`\`\`bash
# Node modules 재설치
rm -rf node_modules package-lock.json
npm install

# Python packages 재설치
cd python
pip install --upgrade -r requirements.txt
\`\`\`

### 문제: Supabase 연결 오류

- \`.env.local\` 파일의 URL과 키가 정확한지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 문제: OpenAI API 오류

- API 키가 유효한지 확인
- 계정에 크레딧이 있는지 확인: [https://platform.openai.com/usage](https://platform.openai.com/usage)

### 문제: Port 3000이 이미 사용 중

\`\`\`bash
# 다른 포트로 실행
PORT=3001 npm run dev
\`\`\`

## 다음 단계

- [README.md](./README.md) - 전체 문서
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 배포 가이드
- [skill.md](./skill.md) - 개발 스킬 가이드

## 도움말

문제가 발생하면:
1. [GitHub Issues](https://github.com/yourusername/naver-reply-service/issues)에 문의
2. \`.env.local\` 파일을 확인
3. Vercel/Supabase 대시보드에서 로그 확인

---

**Happy Coding! 🚀**
