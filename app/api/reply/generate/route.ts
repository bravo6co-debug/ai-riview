import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import OpenAI from 'openai'
import { getBusinessTypeLabel, getBrandToneLabel, getToneGuide } from '@/lib/constants'
import {
  checkQuota,
  logApiUsage,
  estimateCost,
  initializeUserQuota,
} from '@/lib/usage-tracker'

// Force Node.js runtime for bcryptjs
export const runtime = 'nodejs'
// Force dynamic rendering (prevent static optimization)
export const dynamic = 'force-dynamic'

// Helper function to get Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Helper function to get OpenAI client
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  })
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// JWT 토큰 검증
async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

// SHA-256 해시 생성 (Web Crypto API 사용)
async function generateContentHash(content: string): Promise<string> {
  const normalized = content
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // 공백 정규화

  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

// 캐시 조회
async function lookupCache(contentHash: string) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('sentiment_analysis_cache')
      .select('*')
      .eq('content_hash', contentHash)
      .single()

    if (error || !data) {
      return null // 캐시 미스
    }

    // 캐시 히트 - 통계 업데이트
    await supabase
      .from('sentiment_analysis_cache')
      .update({
        hit_count: data.hit_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('content_hash', contentHash)

    console.log(`캐시 히트: ${contentHash.substring(0, 8)}... (hit_count: ${data.hit_count + 1})`)
    return data
  } catch (error) {
    console.error('캐시 조회 오류:', error)
    return null // 오류 시 캐시 미스로 처리
  }
}

// 캐시에 저장
async function storeInCache(cacheData: {
  content_hash: string
  content_preview: string
  sentiment: string
  sentiment_strength: number
  topics: any[]
  keywords: any[]
  analysis_model: string
}) {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('sentiment_analysis_cache')
      .insert({
        content_hash: cacheData.content_hash,
        content_preview: cacheData.content_preview,
        sentiment: cacheData.sentiment,
        sentiment_strength: cacheData.sentiment_strength,
        topics: cacheData.topics,
        keywords: cacheData.keywords,
        analysis_model: cacheData.analysis_model,
        hit_count: 0,
        last_used_at: null
      })

    // 23505 = unique_violation (동시 요청으로 인한 중복 삽입)
    if (error && error.code !== '23505') {
      console.error('캐시 저장 오류:', error)
    } else if (!error) {
      console.log(`캐시 저장: ${cacheData.content_hash.substring(0, 8)}...`)
    }
  } catch (error) {
    console.error('캐시 저장 실패:', error)
    // 캐시 저장 실패해도 메인 플로우는 계속 진행
  }
}

// 간단한 감정 분석 (룰 기반)
function quickSentimentAnalysis(content: string) {
  const positiveKeywords = ['맛있', '좋아', '친절', '깨끗', '추천', '만족', '최고', '완벽', '훌륭']
  const negativeKeywords = ['별로', '실망', '불만', '최악', '끔찍', '불친절', '맛없', '더럽']

  let positiveScore = 0
  let negativeScore = 0

  positiveKeywords.forEach(keyword => {
    if (content.includes(keyword)) positiveScore += 1
  })

  negativeKeywords.forEach(keyword => {
    if (content.includes(keyword)) negativeScore += 1
  })

  if (positiveScore > negativeScore) {
    return { sentiment: 'positive', strength: 0.7 + (positiveScore * 0.05) }
  } else if (negativeScore > positiveScore) {
    return { sentiment: 'negative', strength: 0.7 + (negativeScore * 0.05) }
  } else {
    return { sentiment: 'neutral', strength: 0.5 }
  }
}

// AI 답글 생성
async function generateReplyWithAI(
  reviewContent: string,
  sentiment: string,
  userProfile: {
    business_name: string
    business_type: string
    brand_tone: string
  }
): Promise<{
  reply: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
}> {
  const systemPrompts: Record<string, string> = {
    positive: `당신은 네이버 플레이스 리뷰 답글 전문가입니다.

긍정 리뷰 답글 작성 가이드:
1. 고객이 만족한 구체적 요소를 언급하며 감사 표현
2. 재방문 시 제공할 수 있는 가치 제안
3. 따뜻하고 친근한 톤 유지

답글 작성 원칙:
- 50-150자 내외로 간결하게
- 고객이 언급한 구체적 내용(맛, 서비스, 분위기 등) 인용
- 감사 표현 → 공감 → 재방문 유도 구조
- 과도한 이모지 지양 (1-2개 이내)
- 업체 특성을 반영한 자연스러운 문장

예시 패턴:
"{구체적_칭찬_요소}에 만족하셨다니 정말 기쁩니다! 다음에도 좋은 경험 드릴게요. 감사합니다 😊"`,

    negative: `당신은 네이버 플레이스 리뷰 답글 전문가입니다.

부정 리뷰 답글 작성 가이드:
1. 즉각적 사과와 구체적 문제 인식
2. 개선 의지 명확히 표현
3. 변명보다는 해결 중심으로 접근

답글 작성 원칙:
- 50-150자 내외로 간결하게
- 진심 어린 사과로 시작
- 고객이 지적한 구체적 문제점 언급
- 명확한 개선 약속
- 변명이나 책임 회피 금지
- 필요시 오프라인 소통 채널 제안

예시 패턴:
"불편을 드려 진심으로 죄송합니다. {구체적_문제}는 즉시 개선하겠습니다. 더 나은 모습으로 찾아뵙고 싶습니다."`,

    neutral: `당신은 네이버 플레이스 리뷰 답글 전문가입니다.

중립 리뷰 답글 작성 가이드:
1. 아쉬운 부분 공감 표현
2. 긍정 요소 강화 및 개선 약속
3. 다음 방문 시 더 나은 경험 제안

답글 작성 원칙:
- 50-150자 내외로 간결하게
- 방문 감사 표현
- 긍정적 요소는 강화하고 아쉬운 점은 개선 약속
- 고객의 피드백을 진지하게 받아들임을 표현
- 재방문 유도

예시 패턴:
"소중한 리뷰 감사합니다! {긍정_요소}는 만족하셨지만 {아쉬운_점}은 보완하겠습니다. 다음엔 더 좋은 경험 드릴게요!"`,
  }

  // 사용자 프로필 정보를 라벨로 변환
  const businessTypeLabel = getBusinessTypeLabel(userProfile.business_type)
  const brandToneLabel = getBrandToneLabel(userProfile.brand_tone)
  const toneGuide = getToneGuide(userProfile.brand_tone)

  const prompt = `[리뷰 내용]
"${reviewContent}"

[매장 정보]
- 매장명: ${userProfile.business_name || '우리 매장'}
- 업종: ${businessTypeLabel}
- 브랜드 톤앤매너: ${brandToneLabel}

[톤앤매너 가이드]
${toneGuide}

위 리뷰에 대한 답글을 작성해주세요. 80-120자 내외로 간결하게 작성하고, 고객이 언급한 구체적인 내용을 인용하세요.
설정된 브랜드 톤앤매너에 맞게 작성하세요.
답글만 작성하세요 (부가 설명 없이):`

  try {
    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompts[sentiment] || systemPrompts['neutral'] },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 250,
    })

    const reply = response.choices[0].message.content?.trim() || '답글 생성에 실패했습니다.'

    return {
      reply,
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    }
  } catch (error) {
    console.error('OpenAI API 오류:', error)
    // 템플릿 폴백
    const templates: Record<string, string[]> = {
      positive: [
        '좋게 봐주셔서 감사합니다 😊 앞으로도 더 좋은 모습으로 찾아뵙겠습니다!',
        '만족스러우셨다니 기쁩니다! 항상 최선을 다하는 매장이 되겠습니다 😊',
      ],
      negative: [
        '불편을 드려 정말 죄송합니다. 즉시 개선하겠습니다. 더 나은 모습으로 다시 찾아뵙고 싶습니다.',
        '소중한 의견 감사합니다. 말씀하신 부분은 빠르게 개선하도록 하겠습니다.',
      ],
      neutral: [
        '방문해 주셔서 감사합니다 😊 소중한 의견 잘 참고하여 더 나은 서비스로 보답하겠습니다!',
        '피드백 감사드립니다. 지속적으로 개선해 나가겠습니다!',
      ],
    }

    const templateList = templates[sentiment] || templates['neutral']
    const reply = templateList[Math.floor(Math.random() * templateList.length)]

    return {
      reply,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null
  let apiCallSuccess = false

  try {
    // JWT 토큰 검증
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyToken(token)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    userId = user.id as string

    // 사용량 쿼터 확인
    const quotaCheck = await checkQuota(userId)
    if (!quotaCheck.allowed) {
      const executionTime = Date.now() - startTime

      // 쿼터 초과 로그 기록
      await logApiUsage({
        userId,
        apiType: 'openai_chat',
        endpoint: '/api/reply/generate',
        success: false,
        errorMessage: quotaCheck.reason || '사용량 한도 초과',
        executionTimeMs: executionTime,
      })

      return NextResponse.json(
        {
          success: false,
          error: quotaCheck.reason || '사용량 한도를 초과했습니다.',
          quota: quotaCheck.quota,
          currentUsage: quotaCheck.currentUsage,
        },
        { status: 429, headers: corsHeaders } // 429 Too Many Requests
      )
    }

    // 요청 본문 읽기
    let body
    try {
      const text = await request.text()
      body = JSON.parse(text)
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      return NextResponse.json(
        { success: false, error: '잘못된 요청 형식입니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { review_content } = body

    if (!review_content || !review_content.trim()) {
      return NextResponse.json(
        { success: false, error: '리뷰 내용을 입력해주세요.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 사용자 프로필 조회
    const supabase = getSupabaseClient()
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('business_name, business_type, brand_tone')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404, headers: corsHeaders }
      )
    }

    // 기본값 설정
    const profile = {
      business_name: userProfile.business_name || '',
      business_type: userProfile.business_type || 'cafe',
      brand_tone: userProfile.brand_tone || 'friendly',
    }

    // 콘텐츠 해시 생성
    const contentHash = await generateContentHash(review_content)

    // 캐시 조회
    const cachedAnalysis = await lookupCache(contentHash)

    let analysis
    let analysisSource = 'cache'

    if (cachedAnalysis) {
      // 캐시 히트 - 저장된 결과 사용
      analysis = {
        sentiment: cachedAnalysis.sentiment,
        strength: cachedAnalysis.sentiment_strength
      }
    } else {
      // 캐시 미스 - 새로운 분석 수행
      analysis = quickSentimentAnalysis(review_content)
      analysisSource = 'rule-based'

      // 캐시에 저장 (비동기, 결과를 기다리지 않음)
      storeInCache({
        content_hash: contentHash,
        content_preview: review_content.substring(0, 100),
        sentiment: analysis.sentiment,
        sentiment_strength: analysis.strength,
        topics: [],
        keywords: [],
        analysis_model: 'rule-based'
      }).catch(err => console.error('캐시 저장 실패:', err))
    }

    // 답글 생성 (토큰 사용량 추적)
    let generatedReply: string
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0

    try {
      const aiResult = await generateReplyWithAI(
        review_content,
        analysis.sentiment,
        profile
      )
      generatedReply = aiResult.reply
      promptTokens = aiResult.promptTokens
      completionTokens = aiResult.completionTokens
      totalTokens = aiResult.totalTokens
    } catch (replyError) {
      console.error('답글 생성 실패:', replyError)
      // 폴백 템플릿 사용
      const templates: Record<string, string[]> = {
        positive: ['좋게 봐주셔서 감사합니다 😊 앞으로도 더 좋은 모습으로 찾아뵙겠습니다!'],
        negative: ['불편을 드려 정말 죄송합니다. 즉시 개선하겠습니다.'],
        neutral: ['방문해 주셔서 감사합니다 😊 더 나은 서비스로 보답하겠습니다!'],
      }
      generatedReply = templates[analysis.sentiment]?.[0] || '답글 생성에 실패했습니다.'
    }

    // 이력 저장
    try {
      const supabase = getSupabaseClient()
      await supabase.from('reply_history').insert({
        user_id: userId,
        review_content,
        generated_reply: generatedReply,
        sentiment: analysis.sentiment,
        sentiment_strength: analysis.strength,
        topics: JSON.stringify([]),
        keywords: JSON.stringify([]),
      })
    } catch (dbError) {
      console.error('DB 저장 실패:', dbError)
      // DB 저장 실패해도 답글은 반환
    }

    // API 사용량 로그 기록
    const executionTime = Date.now() - startTime
    const cost = estimateCost('gpt-4o-mini', promptTokens, completionTokens)

    apiCallSuccess = true

    // 비동기로 로그 기록 (응답 속도에 영향 없도록)
    logApiUsage({
      userId,
      apiType: 'openai_chat',
      endpoint: '/api/reply/generate',
      modelUsed: 'gpt-4o-mini',
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost: cost,
      requestSize: JSON.stringify({ review_content }).length,
      responseSize: JSON.stringify({ reply: generatedReply }).length,
      success: true,
      executionTimeMs: executionTime,
    }).catch((err) => console.error('사용량 로그 기록 실패:', err))

    return NextResponse.json({
      success: true,
      reply: generatedReply,
      sentiment: analysis.sentiment,
      sentiment_strength: analysis.strength,
      topics: [],
      keywords: [],
      // Optional: Include usage stats in development
      ...(process.env.NODE_ENV === 'development' && {
        _debug: {
          tokens: totalTokens,
          cost: cost.toFixed(6),
          executionTime: `${executionTime}ms`,
        },
      }),
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('답글 생성 오류:', error)

    // 오류 발생 시 로그 기록
    if (userId) {
      const executionTime = Date.now() - startTime
      await logApiUsage({
        userId,
        apiType: 'openai_chat',
        endpoint: '/api/reply/generate',
        success: false,
        errorMessage: String(error),
        executionTimeMs: executionTime,
      }).catch((err) => console.error('사용량 로그 기록 실패:', err))
    }

    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
