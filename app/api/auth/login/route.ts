import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import * as bcrypt from 'bcryptjs'

// Force Node.js runtime (required for bcryptjs)
export const runtime = 'nodejs'
// Force dynamic rendering (prevent static optimization)
export const dynamic = 'force-dynamic'
// Explicitly declare revalidation as false
export const revalidate = false

// CORS headers helper
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

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client inside the function
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Supabase에서 사용자 조회
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1)

    if (error || !users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: '아이디 또는 비밀번호가 잘못되었습니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const user = users[0]

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '아이디 또는 비밀번호가 잘못되었습니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 마지막 로그인 시간 업데이트
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Check if user account is active (only if column exists)
    if (user.is_active === false) {
      return NextResponse.json(
        { success: false, error: '비활성화된 계정입니다. 관리자에게 문의하세요.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Determine user_role (fallback to old is_admin if user_role doesn't exist)
    const userRole = user.user_role || (user.is_admin ? 'super_admin' : 'customer')

    // JWT 토큰 생성 (user_role 포함)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const token = await new SignJWT({
      id: user.id,
      username: user.username,
      is_admin: user.is_admin, // DEPRECATED - keeping for backwards compatibility
      user_role: userRole,
      parent_admin_id: user.parent_admin_id || null,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin, // DEPRECATED
        user_role: userRole,
        parent_admin_id: user.parent_admin_id || null,
        business_name: user.business_name || null,
        business_type: user.business_type || null,
        brand_tone: user.brand_tone || null,
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
