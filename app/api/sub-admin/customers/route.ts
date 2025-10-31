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

// GET: List sub-admin's customers
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

    if (!user || user.user_role !== 'sub_admin') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    const { data: customers, error } = await supabase
      .from('users')
      .select('id, username, business_name, business_type, brand_tone, is_active, created_at')
      .eq('parent_admin_id', user.id)
      .eq('user_role', 'customer')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch customers:', error)
      return NextResponse.json(
        { success: false, error: '고객 목록을 불러올 수 없습니다.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      customers: customers || [],
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Customers GET error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST: Create new customer
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

    if (!user || user.user_role !== 'sub_admin') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const body = await request.json()
    const { username, business_name } = body

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

    // Create customer
    const { data: newCustomer, error: createError } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        user_role: 'customer',
        is_admin: false, // DEPRECATED field
        parent_admin_id: user.id as string,
        business_name: business_name || null,
        business_type: 'cafe', // 기본값 (고객이 설정에서 변경)
        brand_tone: 'friendly', // 기본값 (고객이 설정에서 변경)
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create customer:', createError)
      return NextResponse.json(
        { success: false, error: '고객 생성에 실패했습니다.' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Initialize usage quota for the new customer
    await initializeUserQuota(newCustomer.id, {
      dailyLimit: 100,
      monthlyReplyLimit: 1000,
      monthlyTokenLimit: 100000,
    })

    return NextResponse.json({
      success: true,
      message: `고객이 추가되었습니다. 초기 비밀번호: ${defaultPassword}`,
      customer: {
        id: newCustomer.id,
        username: newCustomer.username,
        business_name: newCustomer.business_name,
        business_type: newCustomer.business_type,
        is_active: newCustomer.is_active,
        created_at: newCustomer.created_at,
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Customers POST error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE: Delete customer
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

    if (!user || user.user_role !== 'sub_admin') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('id')

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: '삭제할 고객 ID가 필요합니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    // Verify the customer belongs to this sub-admin
    const { data: customer } = await supabase
      .from('users')
      .select('parent_admin_id')
      .eq('id', customerId)
      .single()

    if (!customer || customer.parent_admin_id !== user.id) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Delete customer
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', customerId)

    if (deleteError) {
      console.error('Failed to delete customer:', deleteError)
      return NextResponse.json(
        { success: false, error: '고객 삭제에 실패했습니다.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      message: '고객이 삭제되었습니다.',
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Customers DELETE error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
