// User Profile Types

export interface UserProfile {
  business_name: string
  business_type: string
  brand_tone: string
}

export interface User {
  id: string
  username: string
  is_admin: boolean
  business_name?: string
  business_type?: string
  brand_tone?: string
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
