// Usage Tracking Utilities
// API 사용량 추적 및 쿼터 관리 유틸리티

import { createClient } from '@supabase/supabase-js'

// OpenAI GPT-4o-mini Pricing (as of 2024)
// https://openai.com/api/pricing/
const PRICING = {
  'gpt-4o-mini': {
    input: 0.15 / 1_000_000, // $0.15 per 1M input tokens
    output: 0.60 / 1_000_000, // $0.60 per 1M output tokens
  },
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      `Missing Supabase credentials: URL=${!!supabaseUrl}, Key=${!!supabaseKey}`
    )
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Calculate estimated cost for OpenAI API call
 */
export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = PRICING[model as keyof typeof PRICING]
  if (!pricing) {
    console.warn(`Unknown model: ${model}, using gpt-4o-mini pricing`)
    return (
      PRICING['gpt-4o-mini'].input * promptTokens +
      PRICING['gpt-4o-mini'].output * completionTokens
    )
  }

  return pricing.input * promptTokens + pricing.output * completionTokens
}

/**
 * Log API usage to database
 */
export async function logApiUsage(params: {
  userId: string
  apiType: 'openai_chat' | 'sentiment_analysis'
  endpoint: string
  modelUsed?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  estimatedCost?: number
  requestSize?: number
  responseSize?: number
  success: boolean
  errorMessage?: string
  executionTimeMs: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase.from('api_usage_logs').insert({
      user_id: params.userId,
      api_type: params.apiType,
      endpoint: params.endpoint,
      model_used: params.modelUsed,
      prompt_tokens: params.promptTokens || 0,
      completion_tokens: params.completionTokens || 0,
      total_tokens: params.totalTokens || 0,
      estimated_cost: params.estimatedCost || 0,
      request_size: params.requestSize,
      response_size: params.responseSize,
      success: params.success,
      error_message: params.errorMessage,
      execution_time_ms: params.executionTimeMs,
    })

    if (error) {
      console.error('Failed to log API usage:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Exception in logApiUsage:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Check if user has exceeded their quota
 */
export async function checkQuota(
  userId: string
): Promise<{
  allowed: boolean
  reason?: string
  currentUsage?: {
    dailyReplies: number
    monthlyReplies: number
    monthlyTokens: number
  }
  quota?: {
    dailyLimit: number
    monthlyReplyLimit: number
    monthlyTokenLimit: number
  }
}> {
  try {
    const supabase = getSupabaseClient()

    // Get user's quota settings
    const { data: quotaData, error: quotaError } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (quotaError && quotaError.code !== 'PGRST116') {
      // PGRST116 = not found
      console.error('Failed to fetch quota:', quotaError)
      return { allowed: true } // Allow on error to not block users
    }

    // If no quota set, allow (default quota will be created on first use)
    if (!quotaData) {
      return { allowed: true }
    }

    // Get today's usage
    const { data: todayUsage, error: todayError } = await supabase.rpc(
      'get_today_usage',
      { p_user_id: userId }
    )

    if (todayError) {
      console.error('Failed to fetch today usage:', todayError)
      return { allowed: true } // Allow on error
    }

    // Get current month's usage
    const { data: monthUsage, error: monthError } = await supabase.rpc(
      'get_current_month_usage',
      { p_user_id: userId }
    )

    if (monthError) {
      console.error('Failed to fetch month usage:', monthError)
      return { allowed: true } // Allow on error
    }

    const dailyReplies = todayUsage?.[0]?.total_requests || 0
    const monthlyReplies = monthUsage?.[0]?.total_requests || 0
    const monthlyTokens = monthUsage?.[0]?.total_tokens || 0

    // Check daily limit
    if (
      quotaData.daily_reply_limit &&
      dailyReplies >= quotaData.daily_reply_limit
    ) {
      return {
        allowed: false,
        reason: `일일 답글 생성 한도(${quotaData.daily_reply_limit}개)를 초과했습니다.`,
        currentUsage: { dailyReplies, monthlyReplies, monthlyTokens },
        quota: {
          dailyLimit: quotaData.daily_reply_limit,
          monthlyReplyLimit: quotaData.monthly_reply_limit,
          monthlyTokenLimit: quotaData.monthly_token_limit,
        },
      }
    }

    // Check monthly reply limit
    if (
      quotaData.monthly_reply_limit &&
      monthlyReplies >= quotaData.monthly_reply_limit
    ) {
      return {
        allowed: false,
        reason: `월간 답글 생성 한도(${quotaData.monthly_reply_limit}개)를 초과했습니다.`,
        currentUsage: { dailyReplies, monthlyReplies, monthlyTokens },
        quota: {
          dailyLimit: quotaData.daily_reply_limit,
          monthlyReplyLimit: quotaData.monthly_reply_limit,
          monthlyTokenLimit: quotaData.monthly_token_limit,
        },
      }
    }

    // Check monthly token limit
    if (
      quotaData.monthly_token_limit &&
      monthlyTokens >= quotaData.monthly_token_limit
    ) {
      return {
        allowed: false,
        reason: `월간 토큰 사용 한도(${quotaData.monthly_token_limit.toLocaleString()})를 초과했습니다.`,
        currentUsage: { dailyReplies, monthlyReplies, monthlyTokens },
        quota: {
          dailyLimit: quotaData.daily_reply_limit,
          monthlyReplyLimit: quotaData.monthly_reply_limit,
          monthlyTokenLimit: quotaData.monthly_token_limit,
        },
      }
    }

    // All checks passed
    return {
      allowed: true,
      currentUsage: { dailyReplies, monthlyReplies, monthlyTokens },
      quota: {
        dailyLimit: quotaData.daily_reply_limit,
        monthlyReplyLimit: quotaData.monthly_reply_limit,
        monthlyTokenLimit: quotaData.monthly_token_limit,
      },
    }
  } catch (error) {
    console.error('Exception in checkQuota:', error)
    return { allowed: true } // Allow on error to not block users
  }
}

/**
 * Get current usage statistics for a user
 */
export async function getUsageStats(userId: string): Promise<{
  success: boolean
  stats?: {
    today: {
      requests: number
      tokens: number
      cost: number
    }
    thisMonth: {
      requests: number
      tokens: number
      cost: number
    }
    quota?: {
      dailyLimit: number
      monthlyReplyLimit: number
      monthlyTokenLimit: number
    }
  }
  error?: string
}> {
  try {
    const supabase = getSupabaseClient()

    // Get today's usage
    const { data: todayData } = await supabase.rpc('get_today_usage', {
      p_user_id: userId,
    })

    // Get current month's usage
    const { data: monthData } = await supabase.rpc('get_current_month_usage', {
      p_user_id: userId,
    })

    // Get quota
    const { data: quotaData } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .single()

    const todayStats = todayData?.[0] || {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
    }
    const monthStats = monthData?.[0] || {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
    }

    return {
      success: true,
      stats: {
        today: {
          requests: todayStats.total_requests || 0,
          tokens: todayStats.total_tokens || 0,
          cost: parseFloat(todayStats.total_cost || '0'),
        },
        thisMonth: {
          requests: monthStats.total_requests || 0,
          tokens: monthStats.total_tokens || 0,
          cost: parseFloat(monthStats.total_cost || '0'),
        },
        quota: quotaData
          ? {
              dailyLimit: quotaData.daily_reply_limit,
              monthlyReplyLimit: quotaData.monthly_reply_limit,
              monthlyTokenLimit: quotaData.monthly_token_limit,
            }
          : undefined,
      },
    }
  } catch (error) {
    console.error('Exception in getUsageStats:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Initialize default quota for a new customer
 */
export async function initializeUserQuota(
  userId: string,
  options?: {
    dailyLimit?: number
    monthlyReplyLimit?: number
    monthlyTokenLimit?: number
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase.from('usage_quotas').insert({
      user_id: userId,
      daily_reply_limit: options?.dailyLimit || 100,
      monthly_reply_limit: options?.monthlyReplyLimit || 1000,
      monthly_token_limit: options?.monthlyTokenLimit || 100000,
      quota_reset_date: new Date().toISOString().split('T')[0],
    })

    if (error) {
      // Ignore duplicate key errors (user already has quota)
      if (error.code === '23505') {
        return { success: true }
      }
      console.error('Failed to initialize quota:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Exception in initializeUserQuota:', error)
    return { success: false, error: String(error) }
  }
}
