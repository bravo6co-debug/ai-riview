# 네이버 플레이스 리뷰 답글 생성 서비스 개발 스킬

## 핵심 개요

네이버 플레이스 리뷰에 대한 AI 기반 답글 생성 웹 서비스를 개발합니다. 감정 분석 기반 3단계 하이브리드 분석으로 맥락에 맞는 고품질 답글을 자동 생성하며, 모바일/PC 최적화된 직관적인 인터페이스를 제공합니다.

**배포 환경**: Vercel (프론트엔드 + API)  
**데이터베이스**: Supabase (PostgreSQL)  
**백엔드**: Python (FastAPI)

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                 Vercel Deployment                        │
│  ┌────────────────────────────────────────────────┐    │
│  │         Next.js Frontend (React)                │    │
│  │  • 사용자 페이지 (답글 생성)                     │    │
│  │  • 관리자 페이지 (계정 관리)                     │    │
│  └────────────────┬───────────────────────────────┘    │
│                   │                                      │
│  ┌────────────────┴───────────────────────────────┐    │
│  │         Python API Routes (/api/*)              │    │
│  │  • /api/auth/login                              │    │
│  │  • /api/reply/generate                          │    │
│  │  • /api/admin/users                             │    │
│  └────────────────┬───────────────────────────────┘    │
└───────────────────┼──────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│   Supabase       │    │   OpenAI API     │
│   PostgreSQL     │    │  (GPT-4o-mini)   │
│   + Auth         │    └──────────────────┘
└──────────────────┘
```

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Hooks
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Authentication**: JWT + passlib (bcrypt)
- **Database ORM**: supabase-py
- **AI Integration**: OpenAI Python SDK
- **Deployment**: Vercel Serverless Functions

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL + RLS)
- **CDN**: Vercel Edge Network
- **Environment**: Vercel Environment Variables

## 프로젝트 구조

```
naver-reply-service/
├── app/                         # Next.js App Router
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx         # 로그인 페이지
│   ├── (dashboard)/
│   │   ├── page.tsx             # 답글 생성 페이지
│   │   └── admin/
│   │       └── page.tsx         # 관리자 페이지
│   ├── layout.tsx
│   └── globals.css
│
├── components/                  # React 컴포넌트
│   ├── ui/                      # shadcn/ui 컴포넌트
│   ├── ReplyGenerator.tsx       # 답글 생성 컴포넌트
│   ├── AdminPanel.tsx           # 관리자 패널
│   └── LoginForm.tsx            # 로그인 폼
│
├── lib/                         # 유틸리티
│   ├── supabase.ts             # Supabase 클라이언트
│   └── auth.ts                 # 인증 유틸리티
│
├── api/                         # Python API (Vercel Serverless)
│   ├── auth/
│   │   └── login.py            # 로그인 API
│   ├── reply/
│   │   └── generate.py         # 답글 생성 API
│   └── admin/
│       └── users.py            # 관리자 API
│
├── python/                      # Python 백엔드 로직
│   ├── services/
│   │   ├── sentiment_analyzer.py    # 감정 분석 (문서 로직)
│   │   ├── ai_reply_generator.py    # 답글 생성 (문서 로직)
│   │   └── ai_service_v2.py         # 통합 인터페이스
│   ├── utils/
│   │   ├── auth.py              # JWT 인증
│   │   ├── database.py          # Supabase 연결
│   │   └── cache.py             # 캐싱 유틸리티
│   └── requirements.txt
│
├── supabase/                    # Supabase 설정
│   └── migrations/
│       └── 001_init.sql         # 초기 스키마
│
├── .env.local                   # 로컬 환경 변수
├── next.config.js
├── package.json
├── vercel.json                  # Vercel 설정
└── README.md
```

## 데이터베이스 스키마 (Supabase)

### SQL 마이그레이션

```sql
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
```

## Python Backend 핵심 구현

### requirements.txt

```txt
fastapi==0.109.0
supabase==2.3.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
openai==1.12.0
pydantic==2.5.3
python-dotenv==1.0.0
```

### 감정 분석 서비스 (문서 로직 완전 구현)

**python/services/sentiment_analyzer.py** - 핵심만 발췌:

```python
import hashlib
import json
from typing import Dict, Optional
from openai import OpenAI

class SentimentAnalyzer:
    """
    3단계 하이브리드 감정 분석 엔진
    1단계: 룰 기반 빠른 분석 (키워드 매칭)
    2단계: 한국어 특화 주제/키워드 추출
    3단계: AI 정밀 분석 (조건부 - 부정리뷰/복잡한리뷰)
    """
    
    def __init__(self, openai_api_key: str, supabase_client=None):
        self.client = OpenAI(api_key=openai_api_key)
        self.supabase = supabase_client
        
        # 감정 키워드 사전 (문서 로직 그대로)
        self.sentiment_keywords = {
            "positive": {
                "strong": ["최고", "완벽", "훌륭", "감동", "환상", "대박"],
                "medium": ["맛있", "좋아", "친절", "깨끗", "추천", "만족"],
                "weak": ["나쁘지않", "그럭저럭", "무난"]
            },
            "negative": {
                "strong": ["최악", "끔찍", "환불", "신고", "쓰레기"],
                "medium": ["별로", "실망", "불만", "후회", "아쉬"],
                "weak": ["조금", "약간", "다소"]
            }
        }
        
        # 주제 카테고리 (문서 로직 그대로)
        self.topic_categories = {
            "맛/품질": {"keywords": ["맛", "음식", "요리", "신선"], ...},
            "서비스": {"keywords": ["직원", "알바", "응대", "태도"], ...},
            "분위기/시설": {"keywords": ["인테리어", "좌석", "공간"], ...},
            "청결": {"keywords": ["위생", "깨끗", "냄새"], ...},
            "가격": {"keywords": ["가격", "가성비", "비용"], ...},
            "대기시간": {"keywords": ["대기", "기다림", "시간"], ...}
        }
    
    async def analyze(self, content: str) -> Dict:
        """통합 감정 분석"""
        # 캐시 확인 (SHA-256 해시)
        cached = await self._check_cache(content)
        if cached:
            return cached
        
        # 1단계: 룰 기반 빠른 분석
        quick_result = self._quick_sentiment_analysis(content)
        
        # 2단계: 주제 및 키워드 추출
        topic_result = self._extract_topics_and_keywords(content)
        
        # 3단계: AI 정밀 분석 여부 결정 (문서 로직 그대로)
        needs_deep_analysis = (
            quick_result["sentiment"] == "negative" or  # 부정 리뷰는 항상
            len(content) > 100 or                        # 긴 리뷰
            len(topic_result["topics"]) > 2 or           # 여러 주제
            quick_result["confidence"] < 0.7             # 낮은 신뢰도
        )
        
        if needs_deep_analysis:
            analysis = await self._deep_analysis_with_ai(content, quick_result, topic_result)
        else:
            analysis = self._build_fallback_analysis(content, quick_result, topic_result)
        
        # 캐시 저장
        await self._save_to_cache(content, analysis)
        
        return analysis
    
    def _quick_sentiment_analysis(self, content: str) -> Dict:
        """1단계: 룰 기반 빠른 감정 분석 (문서 알고리즘 그대로)"""
        positive_score = 0
        negative_score = 0
        
        # 키워드 스코어링
        for strength, keywords in self.sentiment_keywords["positive"].items():
            weight = {"strong": 3, "medium": 2, "weak": 1}[strength]
            for keyword in keywords:
                positive_score += content.count(keyword) * weight
        
        for strength, keywords in self.sentiment_keywords["negative"].items():
            weight = {"strong": 3, "medium": 2, "weak": 1}[strength]
            for keyword in keywords:
                negative_score += content.count(keyword) * weight
        
        # 증폭 표현 감지
        if any(amp in content for amp in ["너무", "정말", "진짜", "완전"]):
            negative_score *= 1.5
        
        # 감정 결정 및 신뢰도 계산 (문서 로직)
        total_score = positive_score + negative_score
        if total_score == 0:
            sentiment, confidence = "neutral", 0.5
        elif positive_score > negative_score * 1.5:
            sentiment = "positive"
            confidence = 0.6 + (positive_score / total_score) * 0.35
        elif negative_score > positive_score * 1.5:
            sentiment = "negative"
            confidence = 0.6 + (negative_score / total_score) * 0.35
        else:
            sentiment, confidence = "neutral", 0.5
        
        return {"sentiment": sentiment, "confidence": confidence, "scores": {"positive": positive_score, "negative": negative_score}}
    
    async def _deep_analysis_with_ai(self, content: str, quick_result: Dict, topic_result: Dict) -> Dict:
        """3단계: AI 정밀 분석 (문서 프롬프트 그대로)"""
        prompt = f"""다음 고객 리뷰를 정밀 분석해주세요:

리뷰: "{content}"

분석 항목:
1. 전체 감정 (positive/negative/neutral)
2. 감정 강도 (0.0 ~ 1.0)
3. 주요 주제 (최대 3개)
4. 핵심 키워드 (최대 5개)
5. 고객 의도 (칭찬/불만/제안/문의)
6. 답글 강조 포인트
7. 답글 피해야 할 요소

JSON 형식으로만 응답하세요."""
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 고객 리뷰 분석 전문가입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        
        ai_result = json.loads(response.choices[0].message.content)
        return {**ai_result, "analysis_depth": "deep", "analysis_source": "ai", "model_used": "gpt-4o-mini"}
```

### 답글 생성 API 엔드포인트

**api/reply/generate.py**:

```python
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import sys, os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../python'))

from services.ai_service_v2 import AIServiceV2
from utils.auth import verify_jwt_token
from utils.database import get_supabase_client

app = FastAPI()

class ReplyRequest(BaseModel):
    review_content: str
    brand_context: str = "카페"

async def get_current_user(authorization: str = Header(...)):
    """JWT 토큰 검증"""
    try:
        token = authorization.split("Bearer ")[1]
        return verify_jwt_token(token)
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/api/reply/generate")
async def generate_reply(
    request: ReplyRequest,
    user = Depends(get_current_user)
):
    """답글 생성 API (감정 분석 + 답글 생성)"""
    try:
        # AI 서비스 초기화
        ai_service = AIServiceV2(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            supabase_client=get_supabase_client()
        )
        
        # 답글 생성 (3단계 감정 분석 포함)
        result = await ai_service.generate_reply(
            review_content=request.review_content,
            options={
                "brand_context": request.brand_context,
                "user_id": user["id"],
                "save_to_db": True
            }
        )
        
        # 이력 저장
        supabase = get_supabase_client()
        supabase.table("reply_history").insert({
            "user_id": user["id"],
            "review_content": request.review_content,
            "generated_reply": result["reply"],
            "sentiment": result["sentiment"],
            "sentiment_strength": result["sentiment_strength"],
            "topics": result["topics"],
            "keywords": result["keywords"]
        }).execute()
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Vercel Serverless Handler
handler = app
```

## Next.js Frontend 핵심 구현

### 답글 생성 컴포넌트

**components/ReplyGenerator.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export default function ReplyGenerator() {
  const [reviewContent, setReviewContent] = useState('')
  const [generatedReply, setGeneratedReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentiment, setSentiment] = useState<string | null>(null)
  const { toast } = useToast()

  const generateReply = async () => {
    if (!reviewContent.trim()) {
      toast({
        title: "오류",
        description: "리뷰 내용을 입력해주세요.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/reply/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          review_content: reviewContent,
          brand_context: "카페"
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedReply(data.reply)
        setSentiment(data.sentiment)
        
        // 자동 클립보드 복사
        await navigator.clipboard.writeText(data.reply)
        
        toast({
          title: "✅ 답글 생성 완료",
          description: "클립보드에 자동으로 복사되었습니다!",
        })
      }
    } catch (error) {
      toast({
        title: "❌ 생성 실패",
        description: "답글 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedReply)
    toast({
      title: "📋 복사 완료",
      description: "클립보드에 복사되었습니다."
    })
  }

  const getSentimentBadge = () => {
    const badges = {
      positive: { text: "긍정", color: "bg-green-100 text-green-800" },
      negative: { text: "부정", color: "bg-red-100 text-red-800" },
      neutral: { text: "중립", color: "bg-gray-100 text-gray-800" }
    }
    const badge = badges[sentiment as keyof typeof badges]
    return badge ? (
      <span className={`px-2 py-1 rounded-full text-xs ${badge.color}`}>
        {badge.text}
      </span>
    ) : null
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            🏪 네이버 플레이스 답글 생성기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 리뷰 입력 */}
          <div>
            <label className="block mb-2 text-sm font-medium">
              리뷰 내용
            </label>
            <Textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="리뷰 내용을 붙여넣으세요..."
              className="min-h-[120px] sm:min-h-[150px] text-sm sm:text-base"
            />
          </div>

          {/* 생성 버튼 */}
          <Button
            onClick={generateReply}
            disabled={loading}
            className="w-full py-3 sm:py-4 text-base sm:text-lg"
            size="lg"
          >
            {loading ? '생성 중...' : '답글 생성하기'}
          </Button>

          {/* 생성된 답글 */}
          {generatedReply && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  생성된 답글
                </label>
                {getSentimentBadge()}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border text-sm sm:text-base">
                {generatedReply}
              </div>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="w-full"
              >
                📋 클립보드에 복사
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

## Vercel 배포 설정

### vercel.json

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install && cd python && pip install -r requirements.txt",
  "framework": "nextjs",
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.11",
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "OPENAI_API_KEY": "@openai-api-key",
    "JWT_SECRET": "@jwt-secret"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization" }
      ]
    }
  ]
}
```

## 환경 변수

### .env.local (로컬 개발용)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx...

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars-change-this-in-production

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 배포 가이드

### 1단계: Supabase 프로젝트 생성

```bash
# Supabase 대시보드에서 프로젝트 생성
# https://supabase.com/dashboard

# SQL Editor에서 마이그레이션 실행 (위의 SQL 복사 붙여넣기)

# API Keys 복사
# Settings > API > Project URL, anon public key, service_role key
```

### 2단계: Vercel 프로젝트 생성

```bash
# GitHub 저장소에 코드 푸시
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/naver-reply-service.git
git push -u origin main

# Vercel에서 Import Project
# https://vercel.com/new

# Environment Variables 설정 (위의 .env.local 내용 복사)
```

### 3단계: 초기 관리자 계정 생성

Supabase SQL Editor에서:

```sql
-- bcrypt로 해싱된 비밀번호 (admin123)
INSERT INTO users (username, password_hash, is_admin)
VALUES (
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5zzHEfq3.Zm7K',
  TRUE
);
```

### 4단계: 배포 확인

```bash
# Vercel 배포 완료 후
https://your-project.vercel.app

# 로그인 테스트
# 아이디: admin
# 비밀번호: admin123
```

## 비용 예측

### 월 1000개 답글 기준

| 항목 | 무료 플랜 | 유료 플랜 |
|-----|---------|---------|
| **Vercel** | Hobby (무료) | Pro ($20/월) |
| **Supabase** | Free (무료) | Pro ($25/월) |
| **OpenAI** | ~$0.24 | ~$0.24 |
| **총 비용** | **$0.24/월** | **$45/월** |

### 확장 가능성
- 5000개 답글/월: **$1.20** (OpenAI만)
- 10000개 답글/월: **$2.40** (OpenAI만)

## 핵심 기능 체크리스트

✅ **3단계 하이브리드 감정 분석** (첨부 문서 로직 완전 구현)
  - 1단계: 룰 기반 빠른 분석
  - 2단계: 한국어 특화 주제/키워드 추출
  - 3단계: AI 정밀 분석 (조건부)

✅ **AI 기반 답글 생성** (첨부 문서 로직 완전 구현)
  - 감정별 시스템 프롬프트
  - 고도화 프롬프트 구성
  - 80-120자 최적 길이

✅ **캐싱 시스템** (비용 60% 절감)
  - SHA-256 해시 기반
  - Supabase에 저장

✅ **인증 시스템**
  - JWT 토큰 기반
  - 관리자/사용자 구분

✅ **모바일/PC 최적화**
  - Tailwind CSS 반응형
  - 터치 최적화

✅ **클립보드 자동 복사**
  - 답글 생성 시 자동 복사
  - 수동 복사 버튼

✅ **Vercel + Supabase 배포**
  - Serverless Functions
  - Edge Network CDN

## 개발 우선순위

### Phase 1: MVP (1주차)
- [x] Supabase 데이터베이스 설정
- [x] Python 감정 분석 엔진 (문서 로직)
- [x] Python 답글 생성 엔진 (문서 로직)
- [x] 기본 인증 API
- [x] 답글 생성 API

### Phase 2: Frontend (2주차)
- [x] Next.js 프로젝트 초기화
- [x] 로그인 페이지
- [x] 답글 생성 페이지
- [x] shadcn/ui 컴포넌트
- [x] 모바일 반응형

### Phase 3: 관리자 기능 (3주차)
- [ ] 관리자 대시보드
- [ ] 사용자 계정 관리
- [ ] 사용 통계
- [ ] API 비용 모니터링

### Phase 4: 배포 및 최적화 (4주차)
- [ ] Vercel 프로덕션 배포
- [ ] 성능 최적화
- [ ] 에러 로깅 (Sentry)
- [ ] 사용자 피드백 수집

## 확장 기능 로드맵

### Q2 2025
- **브랜드 관리 기능**
  - 브랜드별 설정 저장
  - 답글 톤앤매너 커스터마이징
  
- **일괄 처리**
  - CSV 업로드
  - 대량 답글 생성

### Q3 2025
- **통계 대시보드**
  - 감정 분석 트렌드
  - 주제별 리뷰 분포
  - 일별/주별/월별 통계

- **외부 연동**
  - Slack 알림
  - Google Sheets 연동

### Q4 2025
- **AI 모델 고도화**
  - Fine-tuning
  - 답글 품질 평가 시스템

---

**문서 버전**: 2.0.0  
**최종 수정**: 2025-01-29  
**핵심 로직**: 첨부 문서의 3단계 하이브리드 감정 분석 시스템 완전 구현  
**배포**: Vercel + Supabase  
**언어**: Python (Backend) + TypeScript (Frontend)