import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
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
  brandContext: string
) {
  const systemPrompts: Record<string, string> = {
    positive: `당신은 한국 프랜차이즈 매장의 전문적이고 진심어린 고객 서비스 담당자입니다.

고객의 긍정적인 리뷰에 감사하며, 진정성 있고 따뜻한 답글을 작성합니다.
형식적이지 않고 고객이 언급한 구체적인 내용을 인용하여 답변합니다.

답글 작성 원칙:
- 고객이 언급한 구체적인 내용(맛, 서비스, 분위기 등)을 인용
- 80-120자 내외로 간결하게
- 따뜻하고 진정성 있는 톤
- 자연스러운 이모지 1-2개 사용
- 형식적인 문구 지양`,

    negative: `당신은 한국 프랜차이즈 매장의 전문적이고 진심어린 고객 서비스 담당자입니다.

고객의 불만에 진심으로 공감하고 사과하며, 구체적인 개선 방안을 제시합니다.
변명하거나 책임을 회피하지 않고, 문제를 정확히 이해했음을 보여줍니다.

답글 작성 원칙:
- 진심 어린 사과로 시작
- 고객이 지적한 구체적인 문제점 언급
- 명확한 개선 약속
- 80-120자 내외로 간결하게
- 진지하고 책임감 있는 톤
- 변명이나 책임 회피 금지`,

    neutral: `당신은 한국 프랜차이즈 매장의 전문적이고 진심어린 고객 서비스 담당자입니다.

고객의 방문과 피드백에 감사하며, 더 나은 경험을 제공하겠다는 의지를 전달합니다.

답글 작성 원칙:
- 방문 감사 표현
- 고객의 피드백을 진지하게 받아들임을 표현
- 개선 의지 전달
- 80-120자 내외로 간결하게
- 정중하고 따뜻한 톤`,
  }

  const prompt = `[리뷰 내용]
"${reviewContent}"

[매장 정보]
- 매장 유형: ${brandContext}

위 리뷰에 대한 답글을 작성해주세요. 80-120자 내외로 간결하게 작성하고, 고객이 언급한 구체적인 내용을 인용하세요.
답글만 작성하세요 (부가 설명 없이):`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompts[sentiment] || systemPrompts['neutral'] },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 250,
    })

    return response.choices[0].message.content?.trim() || '답글 생성에 실패했습니다.'
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
    return templateList[Math.floor(Math.random() * templateList.length)]
  }
}

export async function POST(request: NextRequest) {
  try {
    // JWT 토큰 검증
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyToken(token)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
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
        { status: 400 }
      )
    }

    const { review_content, brand_context = '카페' } = body

    if (!review_content || !review_content.trim()) {
      return NextResponse.json(
        { success: false, error: '리뷰 내용을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 감정 분석
    const analysis = quickSentimentAnalysis(review_content)

    // 답글 생성
    let generatedReply
    try {
      generatedReply = await generateReplyWithAI(
        review_content,
        analysis.sentiment,
        brand_context
      )
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
      await supabase.from('reply_history').insert({
        user_id: user.id as string,
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

    return NextResponse.json({
      success: true,
      reply: generatedReply,
      sentiment: analysis.sentiment,
      sentiment_strength: analysis.strength,
      topics: [],
      keywords: [],
    })
  } catch (error) {
    console.error('답글 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
