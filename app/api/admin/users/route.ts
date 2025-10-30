import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import * as bcrypt from 'bcryptjs'

// Force Node.js runtime (required for bcryptjs)
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

// GET: 사용자 목록 조회 (관리자만)
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

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyToken(token)

    if (!user || !user.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // 모든 사용자 조회
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, is_admin, created_at, last_login')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('사용자 조회 오류:', usersError)
      return NextResponse.json(
        { success: false, error: '사용자 조회 실패' },
        { status: 500, headers: corsHeaders }
      )
    }

    // 각 사용자의 답글 생성 통계 조회
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const { count, error } = await supabase
          .from('reply_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        return {
          ...user,
          reply_count: count || 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithStats,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST: 새 사용자 생성 (관리자만)
export async function POST(request: NextRequest) {
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

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyToken(token)

    if (!user || !user.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // 요청 본문 읽기
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 아이디 중복 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 아이디입니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, 12)

    // 사용자 생성
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        is_admin: false,
      })
      .select('id, username, is_admin, created_at')
      .single()

    if (createError) {
      console.error('사용자 생성 오류:', createError)
      return NextResponse.json(
        { success: false, error: '사용자 생성 실패' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: '사용자가 생성되었습니다.',
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('사용자 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 사용자 삭제 (관리자만)
export async function DELETE(request: NextRequest) {
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

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyToken(token)

    if (!user || !user.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // 요청 본문 읽기
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 자기 자신은 삭제할 수 없음
    if (userId === user.id) {
      return NextResponse.json(
        { success: false, error: '자기 자신은 삭제할 수 없습니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 사용자 삭제
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('사용자 삭제 오류:', deleteError)
      return NextResponse.json(
        { success: false, error: '사용자 삭제 실패' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      message: '사용자가 삭제되었습니다.',
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('사용자 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
