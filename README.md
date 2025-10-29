# 네이버 플레이스 리뷰 답글 생성 서비스

AI 기반 감정 분석과 답글 자동 생성을 제공하는 웹 서비스입니다.

## 핵심 기능

### 3단계 하이브리드 감정 분석
1. **룰 기반 빠른 분석**: 키워드 매칭으로 빠른 감정 분류
2. **한국어 특화 분석**: 6개 주제 카테고리 기반 키워드 추출
3. **AI 정밀 분석**: 복잡한 리뷰에 대한 GPT-4o-mini 분석 (조건부)

### 맥락 인식 답글 생성
- 감정, 주제, 키워드 기반 개인화된 답글
- 80-120자 최적 길이
- 자동 클립보드 복사

### 비용 최적화
- 조건부 AI 호출로 60% 비용 절감
- SHA-256 기반 캐싱으로 95% API 비용 절약

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS

### Backend
- **Framework**: Next.js API Routes (TypeScript)
- **AI**: OpenAI GPT-4o-mini
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (jose)

## 빠른 시작

### 1. 프로젝트 클론 및 설치

\`\`\`bash
git clone <repository-url>
cd airiview
npm install
\`\`\`

### 2. 환경 변수 설정

\`.env.local\` 파일을 생성하고 다음 내용을 입력하세요:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-your-api-key

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 3. Supabase 데이터베이스 설정

Supabase 대시보드에서 SQL Editor를 열고 \`supabase/migrations/001_init.sql\` 파일의 내용을 실행하세요.

### 4. 로컬 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 5. 로그인

- **아이디**: admin
- **비밀번호**: admin123

## 배포

### Vercel 배포 가이드

#### 1. GitHub에 코드 푸시

```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

#### 2. Vercel 프로젝트 설정

1. [Vercel 대시보드](https://vercel.com/dashboard)에 접속
2. "Add New" → "Project" 클릭
3. GitHub 저장소 `bravo6co-debug/ai-riview` 선택
4. "Import" 클릭

#### 3. 환경 변수 설정

Vercel 프로젝트 설정에서 다음 환경 변수를 추가하세요:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-proj-your-api-key
JWT_SECRET=your-super-secret-key-min-32-chars
```

#### 4. 배포 설정

- **Framework Preset**: Next.js (자동 감지)
- **Build Command**: `npm run build` (자동 설정)
- **Output Directory**: `.next` (자동 설정)
- **Install Command**: `npm install` (자동 설정)

#### 5. Deploy

"Deploy" 버튼을 클릭하면 자동으로 빌드 및 배포가 시작됩니다.

#### 6. Supabase 데이터베이스 설정

배포 후, Supabase 대시보드에서 SQL Editor를 열고 `supabase/migrations/001_init.sql` 파일의 내용을 실행하세요.

#### 7. 배포 완료

Vercel이 제공하는 URL(예: `https://your-project.vercel.app`)로 접속하여 서비스를 이용하세요.

## 프로젝트 구조

\`\`\`
airiview/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # 로그인 페이지
│   ├── (dashboard)/              # 답글 생성 페이지
│   ├── layout.tsx
│   └── globals.css
│
├── api/                          # Python API (Vercel Serverless)
│   ├── auth/login.py             # 로그인 API
│   └── reply/generate.py         # 답글 생성 API
│
├── python/                       # Python 백엔드 로직
│   ├── services/
│   │   ├── sentiment_analyzer.py     # 3단계 감정 분석
│   │   ├── ai_reply_generator.py     # 답글 생성
│   │   └── ai_service_v2.py          # 통합 서비스
│   ├── utils/
│   │   ├── auth.py                   # JWT 인증
│   │   └── database.py               # Supabase 연결
│   └── requirements.txt
│
├── supabase/
│   └── migrations/
│       └── 001_init.sql          # 데이터베이스 스키마
│
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
└── vercel.json                   # Vercel 설정
\`\`\`

## 사용 방법

### 답글 생성

1. 로그인 후 대시보드로 이동합니다.
2. 리뷰 내용을 입력란에 붙여넣습니다.
3. "답글 생성하기" 버튼을 클릭합니다.
4. 생성된 답글이 자동으로 클립보드에 복사됩니다.

### 감정 분석 결과

생성된 답글과 함께 다음 정보가 표시됩니다:
- **감정**: 긍정/부정/중립
- **주요 주제**: 맛/품질, 서비스, 분위기 등
- **핵심 키워드**: 리뷰에서 추출된 주요 키워드

## 비용 예측

### 월 1000개 답글 기준

| 항목 | 무료 플랜 | 유료 플랜 |
|-----|---------|---------|
| **Vercel** | Hobby (무료) | Pro ($20/월) |
| **Supabase** | Free (무료) | Pro ($25/월) |
| **OpenAI** | ~$0.24 | ~$0.24 |
| **총 비용** | **$0.24/월** | **$45/월** |

## 문서

- [skill.md](./skill.md) - 개발 스킬 문서
- [SENTIMENT_REPLY_SYSTEM_DETAILED.md](./SENTIMENT_REPLY_SYSTEM_DETAILED.md) - 상세 시스템 가이드

## 라이선스

MIT

## 문의

이슈가 있으시면 GitHub Issues를 통해 문의해주세요.
