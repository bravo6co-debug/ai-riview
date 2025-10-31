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

// 리뷰 메타데이터 추출
function extractReviewMetadata(content: string, sentiment: string) {
  // Unicode regex를 string으로 변환하여 ES5 호환성 유지
  const emojiPattern = new RegExp('[\\u{1F300}-\\u{1F9FF}]', 'u')

  const metadata = {
    length: content.length,
    hasEmoji: emojiPattern.test(content),
    mentionsStaff: /사장|직원|점주|사모님|대표님|사장님|알바|아르바이트|매니저|주방장/.test(content),
    mentionsFood: /맛|메뉴|음식|요리|반찬|국물|고기|밥|커피|디저트|케이크|빵|피자|치킨/.test(content),
    mentionsService: /친절|서비스|응대|태도|빠르|느리|불친절/.test(content),
    mentionsAtmosphere: /분위기|인테리어|깨끗|청결|넓|좁|조용|시끄|뷰|전망/.test(content),
    mentionsPrice: /가격|비싸|저렴|합리적|가성비|만원|천원/.test(content),
    isShortReview: content.length < 30,
    isDetailedReview: content.length > 100,
    hasQuestion: /\?|어떻게|언제|왜|무엇|어디/.test(content),
  }

  // 감정 강도 정교하게 계산
  const positiveWords = (content.match(/맛있|좋아|친절|깨끗|추천|만족|최고|완벽|훌륭|감동|대박|굿|good|nice|짱|인정/g) || []).length
  const negativeWords = (content.match(/별로|실망|불만|최악|끔찍|불친절|맛없|더럽|비싸|느리|불편|짜증|화남/g) || []).length

  const adjustedStrength = sentiment === 'positive'
    ? 0.6 + (positiveWords * 0.08)
    : sentiment === 'negative'
    ? 0.6 + (negativeWords * 0.08)
    : 0.5

  return {
    ...metadata,
    adjustedStrength: Math.min(adjustedStrength, 1.0),
    emotionalIntensity: positiveWords + negativeWords
  }
}

// 답글 스타일 결정
function getReplyStyle(metadata: any) {
  const styles = []

  if (metadata.isShortReview) {
    styles.push('concise')
  }

  if (metadata.isDetailedReview) {
    styles.push('detailed')
  }

  if (metadata.mentionsStaff) {
    styles.push('staff_focused')
  }

  if (metadata.mentionsFood) {
    styles.push('food_focused')
  }

  if (metadata.mentionsPrice) {
    styles.push('value_focused')
  }

  if (metadata.hasQuestion) {
    styles.push('qa_format')
  }

  return styles.length > 0 ? styles : ['standard']
}

// Temperature 동적 조정
function getTemperature(sentiment: string, emotionalIntensity: number): number {
  if (sentiment === 'negative') {
    return 0.5 // 부정 리뷰는 일관성 있게
  }

  if (sentiment === 'positive') {
    return emotionalIntensity > 3 ? 0.9 : 0.8 // 긍정 리뷰는 다양하게
  }

  return 0.7 // 중립
}

// 간단한 감정 분석 (룰 기반)
function quickSentimentAnalysis(content: string) {
  const positiveKeywords = ['맛있', '좋아', '친절', '깨끗', '추천', '만족', '최고', '완벽', '훌륭', '감동', '대박']
  const negativeKeywords = ['별로', '실망', '불만', '최악', '끔찍', '불친절', '맛없', '더럽', '비싸', '느리']

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
  // 메타데이터 추출
  const metadata = extractReviewMetadata(reviewContent, sentiment)

  // 답글 스타일 결정
  const styles = getReplyStyle(metadata)

  // Temperature 동적 조정
  const temperature = getTemperature(sentiment, metadata.emotionalIntensity)

  // 스타일별 지침
  const styleInstructions: Record<string, string> = {
    concise: '짧은 리뷰이므로 40-60자 내외로 간결하게 답변하세요.',
    detailed: '고객이 여러 요소를 언급했으므로 각 포인트에 대해 구체적으로 답변하세요 (100-150자).',
    staff_focused: '직원/팀에 대한 언급이 있으므로 이를 중심으로 답변하세요.',
    food_focused: '음식/메뉴에 대한 언급이 있으므로 특정 메뉴를 자연스럽게 언급하세요.',
    value_focused: '가격에 대한 언급이 있으므로 가치와 품질을 강조하세요.',
    qa_format: '질문이 포함되어 있으므로 먼저 질문에 답한 후 감사 인사를 하세요.',
    standard: '80-120자 내외로 자연스럽게 답변하세요.'
  }

  const activeStyles = styles.map(s => styleInstructions[s] || '').join(' ')

  // 감정별 맥락
  const sentimentContext: Record<string, string> = {
    positive: metadata.emotionalIntensity > 3
      ? '고객이 매우 열정적으로 칭찬했으므로, 그에 상응하는 진심 어린 감사를 표현하세요.'
      : '고객의 만족에 감사하고, 다음 방문 시 기대할 수 있는 것을 제안하세요.',
    negative: metadata.emotionalIntensity > 3
      ? '고객이 매우 불만족했으므로, 즉각적이고 구체적인 사과와 해결책을 제시하세요.'
      : '고객의 불편을 인정하고, 개선 의지를 명확히 밝히세요.',
    neutral: '고객이 방문해준 것에 감사하고, 더 나은 경험을 위한 노력을 약속하세요.'
  }

  // 업종별 특화 가이드 (간략화)
  const businessTypeLabel = getBusinessTypeLabel(userProfile.business_type)
  const brandToneLabel = getBrandToneLabel(userProfile.brand_tone)
  const toneGuide = getToneGuide(userProfile.brand_tone)

  // 향상된 시스템 프롬프트
  const systemPrompt = `당신은 ${userProfile.business_name || '우리 매장'}의 리뷰 답글 전문가입니다.
매번 다른 표현과 구조를 사용하여 자연스럽고 진정성 있는 답글을 작성하세요.
템플릿처럼 들리지 않도록 하되, 고객이 언급한 구체적인 단어나 표현을 자연스럽게 인용하세요.`

  // 향상된 프롬프트
  const prompt = `[리뷰 정보]
내용: "${reviewContent}"
감정: ${sentiment} (강도: ${metadata.adjustedStrength.toFixed(2)})
길이: ${metadata.length}자

[답글 작성 지침]
${activeStyles}

${sentimentContext[sentiment]}

[업종 - ${businessTypeLabel}]
- 업종 특성을 반영하여 답변하세요
- ${metadata.mentionsFood ? '음식/메뉴를 구체적으로 언급하세요' : ''}
- ${metadata.mentionsStaff ? '직원/팀에 대해 언급하세요' : ''}
- ${metadata.mentionsAtmosphere ? '분위기/공간에 대해 언급하세요' : ''}

[브랜드 톤 - ${brandToneLabel}]
${toneGuide}

[다양성 확보]
- 매번 다른 시작 문구를 사용하세요 (감사합니다 / 방문 감사드립니다 / 소중한 리뷰 등)
- 이모지는 업종과 톤에 맞게 0-2개만 사용하세요
- 고객이 사용한 표현을 그대로 인용하면 더 진정성이 느껴집니다

위 가이드를 참고하여 답글을 작성하세요. 답글만 작성하고 부가 설명은 하지 마세요.`

  try {
    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature, // 동적으로 조정된 값 (0.5~0.9)
      max_tokens: 250,
      presence_penalty: 0.6, // 반복 표현 방지
      frequency_penalty: 0.3, // 다양성 증가
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
