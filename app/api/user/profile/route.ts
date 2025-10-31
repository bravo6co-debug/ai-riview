import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

// Force Node.js runtime
export const runtime = 'nodejs'
// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Helper function to get Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

// JWT 토큰 검증
async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    return null
  }
}

// GET: 사용자 프로필 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // JWT 토큰 검증
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token)

    if (!payload || !payload.id) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 사용자 프로필 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('business_name, business_type, brand_tone')
      .eq('id', payload.id)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        profile: {
          business_name: user.business_name || '',
          business_type: user.business_type || 'cafe',
          brand_tone: user.brand_tone || 'friendly',
        },
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('프로필 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PUT: 사용자 프로필 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // JWT 토큰 검증
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token)

    if (!payload || !payload.id) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 요청 본문 파싱
    const body = await request.json()
    const { business_name, business_type, brand_tone } = body

    // 입력 검증
    if (!business_type || !brand_tone) {
      return NextResponse.json(
        { success: false, error: '업종과 톤앤매너는 필수입니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // business_name 길이 검증
    if (business_name && business_name.length > 100) {
      return NextResponse.json(
        { success: false, error: '업체명은 100자 이내로 입력해주세요.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 허용된 값 검증
    const allowedBusinessTypes = [
      'cafe',
      'restaurant_korean',
      'restaurant_chinese',
      'restaurant_japanese',
      'restaurant_western',
      'restaurant_buffet',
      'bakery',
      'dessert',
      'fastfood',
      'bar',
      'salon',
      'nail',
      'spa',
      'fitness',
      'hospital',
      'dental',
      'hotel',
      'retail',
      'other',
    ]
    const allowedBrandTones = [
      'friendly',
      'professional',
      'casual',
      'warm',
      'energetic',
      'luxury',
      'minimalist',
    ]

    if (!allowedBusinessTypes.includes(business_type)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 업종입니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!allowedBrandTones.includes(brand_tone)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 톤앤매너입니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 프로필 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({
        business_name: business_name || null,
        business_type,
        brand_tone,
      })
      .eq('id', payload.id)

    if (updateError) {
      console.error('프로필 업데이트 오류:', updateError)
      return NextResponse.json(
        { success: false, error: '프로필 업데이트에 실패했습니다.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: '프로필이 업데이트되었습니다.',
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('프로필 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
