// ============================================
// User Role Types
// ============================================
export type UserRole = 'super_admin' | 'sub_admin' | 'customer'

export interface User {
  id: string
  username: string
  is_admin: boolean // DEPRECATED: Use user_role instead
  user_role: UserRole
  parent_admin_id?: string
  company_name?: string
  contact_email?: string
  contact_phone?: string
  is_active: boolean
  business_name?: string
  business_type?: string
  brand_tone?: string
  created_at?: string
  last_login?: string
  notes?: string
}

export interface SubAdmin extends User {
  user_role: 'sub_admin'
  customer_count?: number
  total_usage?: number
}

export interface Customer extends User {
  user_role: 'customer'
  parent_admin_id: string
  parent_admin_username?: string
}

// ============================================
// User Profile Types
// ============================================
export interface UserProfile {
  business_name: string
  business_type: string
  brand_tone: string
}

export interface UpdateProfileRequest {
  business_name: string
  business_type: string
  brand_tone: string
}

export interface ProfileResponse {
  success: boolean
  profile?: UserProfile
  error?: string
}

export interface UpdateProfileResponse {
  success: boolean
  message?: string
  error?: string
}

// ============================================
// API Usage Types
// ============================================
export interface ApiUsageLog {
  id: string
  user_id: string
  api_type: string
  endpoint: string
  model_used?: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  estimated_cost: number
  request_size?: number
  response_size?: number
  success: boolean
  error_message?: string
  execution_time_ms?: number
  created_at: string
}

export interface UsageQuota {
  id: string
  user_id: string
  monthly_reply_limit: number
  daily_reply_limit: number
  monthly_token_limit: number
  quota_reset_date: string
  created_at: string
  updated_at: string
}

export interface UsageSummary {
  total_requests: number
  total_tokens: number
  total_cost: number
  successful_requests: number
  failed_requests: number
}

export interface CurrentUsageStats {
  current_month: {
    requests: number
    tokens: number
    limit: number
    remaining: number
    percentage_used: number
  }
  today: {
    requests: number
    limit: number
    remaining: number
  }
}

// ============================================
// Admin Request/Response Types
// ============================================
export interface CreateSubAdminRequest {
  username: string
  password: string
  company_name: string
  contact_email: string
  contact_phone?: string
  notes?: string
}

export interface RegisterCustomerRequest {
  username: string
  password: string
  business_name: string
  business_type: string
  brand_tone: string
  contact_email?: string
  monthly_reply_limit?: number
  daily_reply_limit?: number
}

export interface UpdateCustomerRequest {
  customer_id: string
  is_active?: boolean
  monthly_reply_limit?: number
  daily_reply_limit?: number
  notes?: string
}
