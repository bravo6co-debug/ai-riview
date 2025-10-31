import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

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

// GET: List all customers
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

    // Get all customers with their parent admin info
    const { data: customers, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        user_role,
        parent_admin_id,
        business_name,
        business_type,
        is_active,
        created_at,
        parent_admin:parent_admin_id(username, company_name)
      `)
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
