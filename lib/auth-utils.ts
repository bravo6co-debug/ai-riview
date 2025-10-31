// Authentication and Authorization Utilities
// 인증 및 권한 관리 유틸리티

import { UserRole, User } from './types'

// ============================================
// Role Checking Functions
// ============================================

export function isSuperAdmin(user: User | any): boolean {
  return user?.user_role === 'super_admin'
}

export function isSubAdmin(user: User | any): boolean {
  return user?.user_role === 'sub_admin'
}

export function isCustomer(user: User | any): boolean {
  return user?.user_role === 'customer'
}

export function isAdmin(user: User | any): boolean {
  return isSuperAdmin(user) || isSubAdmin(user)
}

// ============================================
// Permission Checking Functions
// ============================================

/**
 * Check if currentUser can manage targetUser
 * Super Admin can manage everyone
 * Sub Admin can manage their own customers
 * Customers cannot manage anyone
 */
export function canManageUser(
  currentUser: User | any,
  targetUserId: string,
  targetUser?: User | any
): boolean {
  if (!currentUser || !targetUserId) return false

  // Super admin can manage everyone
  if (isSuperAdmin(currentUser)) {
    return true
  }

  // Sub-admin can manage their own customers
  if (isSubAdmin(currentUser)) {
    if (targetUser) {
      return targetUser.parent_admin_id === currentUser.id
    }
    // If we don't have the target user object, can't determine
    return false
  }

  // Customers can only manage themselves
  if (isCustomer(currentUser)) {
    return currentUser.id === targetUserId
  }

  return false
}

/**
 * Check if currentUser can view targetUser's data
 */
export function canViewUser(
  currentUser: User | any,
  targetUserId: string,
  targetUser?: User | any
): boolean {
  if (!currentUser || !targetUserId) return false

  // Can always view yourself
  if (currentUser.id === targetUserId) return true

  // Super admin can view everyone
  if (isSuperAdmin(currentUser)) {
    return true
  }

  // Sub-admin can view their customers
  if (isSubAdmin(currentUser)) {
    if (targetUser) {
      return targetUser.parent_admin_id === currentUser.id
    }
    return false
  }

  return false
}

/**
 * Get user role label in Korean
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: '총 관리자',
    sub_admin: '관리자',
    customer: '고객',
  }
  return labels[role] || role
}

/**
 * Get redirect path based on user role
 */
export function getDefaultDashboard(user: User | any): string {
  if (isSuperAdmin(user)) {
    return '/super-admin'
  }
  if (isSubAdmin(user)) {
    return '/sub-admin'
  }
  return '/' // Customer dashboard
}

/**
 * Check if user has access to a specific route
 */
export function canAccessRoute(user: User | any, route: string): boolean {
  if (!user) return false

  // Super admin routes
  if (route.startsWith('/super-admin')) {
    return isSuperAdmin(user)
  }

  // Sub-admin routes
  if (route.startsWith('/sub-admin')) {
    return isSubAdmin(user)
  }

  // Admin panel (both super and sub admins)
  if (route.startsWith('/admin')) {
    return isAdmin(user)
  }

  // Customer routes (everyone can access)
  return true
}
