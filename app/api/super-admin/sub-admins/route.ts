import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import * as bcrypt from 'bcryptjs'
import { initializeUserQuota } from '@/lib/usage-tracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

// GET: List all sub-admins
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyToken(token)

    if (!user || user.user_role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: '슈퍼 관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    const { data: subAdmins, error } = await supabase
      .from('users')
      .select('id, username, user_role, company_name, contact_email, contact_phone, is_active, created_at')
      .eq('user_role', 'sub_admin')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch sub-admins:', error)
      return NextResponse.json(
        { success: false, error: '하위 관리자 목록을 불러올 수 없습니다.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      subAdmins: subAdmins || [],
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Sub-admins GET error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST: Create new sub-admin
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyToken(token)

    if (!user || user.user_role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: '슈퍼 관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const body = await request.json()
    const { username, company_name, contact_phone, notes } = body

    if (!username) {
      return NextResponse.json(
        { success: false, error: '아이디는 필수입니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    // Check if username already exists
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

    // 초기 비밀번호: 1234!@#$
    const defaultPassword = '1234!@#$'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)

    // Create sub-admin
    const { data: newSubAdmin, error: createError } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        user_role: 'sub_admin',
        is_admin: false, // DEPRECATED field
        company_name: company_name || null,
        contact_phone: contact_phone || null,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create sub-admin:', createError)
      return NextResponse.json(
        { success: false, error: '하위 관리자 생성에 실패했습니다.' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Initialize quota for the new sub-admin (optional, sub-admins might not need quotas)
    // await initializeUserQuota(newSubAdmin.id)

    return NextResponse.json({
      success: true,
      message: `하위 관리자가 추가되었습니다. 초기 비밀번호: ${defaultPassword}`,
      subAdmin: {
        id: newSubAdmin.id,
        username: newSubAdmin.username,
        user_role: newSubAdmin.user_role,
        company_name: newSubAdmin.company_name,
        is_active: newSubAdmin.is_active,
        created_at: newSubAdmin.created_at,
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Sub-admins POST error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE: Delete sub-admin
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyToken(token)

    if (!user || user.user_role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: '슈퍼 관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const { searchParams } = new URL(request.url)
    const subAdminId = searchParams.get('id')

    if (!subAdminId) {
      return NextResponse.json(
        { success: false, error: '삭제할 관리자 ID가 필요합니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    // Delete sub-admin (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', subAdminId)
      .eq('user_role', 'sub_admin')

    if (deleteError) {
      console.error('Failed to delete sub-admin:', deleteError)
      return NextResponse.json(
        { success: false, error: '하위 관리자 삭제에 실패했습니다.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      message: '하위 관리자가 삭제되었습니다.',
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Sub-admins DELETE error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
