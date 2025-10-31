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

export async function GET(request: NextRequest) {
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

    if (!user || user.user_role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: '슈퍼 관리자 권한이 필요합니다.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    // Get total usage statistics
    const { data: usageData, error: usageError } = await supabase
      .from('api_usage_logs')
      .select('total_tokens, estimated_cost, success')

    if (usageError) {
      console.error('Failed to fetch usage data:', usageError)
    }

    // Calculate totals
    const totalRequests = usageData?.length || 0
    const totalTokens = usageData?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const totalCost = usageData?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0

    // Get active users count (users who made requests in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activeUsersData, error: activeUsersError } = await supabase
      .from('api_usage_logs')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (activeUsersError) {
      console.error('Failed to fetch active users:', activeUsersError)
    }

    const uniqueActiveUsers = new Set(activeUsersData?.map(log => log.user_id) || [])
    const activeUsers = uniqueActiveUsers.size

    // Get sub-admins count
    const { count: subAdminsCount, error: subAdminsError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_role', 'sub_admin')

    if (subAdminsError) {
      console.error('Failed to fetch sub-admins count:', subAdminsError)
    }

    // Get customers count
    const { count: customersCount, error: customersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_role', 'customer')

    if (customersError) {
      console.error('Failed to fetch customers count:', customersError)
    }

    return NextResponse.json({
      success: true,
      overview: {
        totalRequests,
        totalTokens,
        totalCost,
        activeUsers,
        subAdminsCount: subAdminsCount || 0,
        customersCount: customersCount || 0,
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Overview API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
