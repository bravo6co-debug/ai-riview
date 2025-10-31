-- Migration 005: Add User Roles and Hierarchy
-- 사용자 역할 및 계층 구조 추가

-- Add new columns for role-based system
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_role VARCHAR(20) DEFAULT 'customer'
    CHECK (user_role IN ('super_admin', 'sub_admin', 'customer')),
ADD COLUMN IF NOT EXISTS parent_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS company_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for faster hierarchy queries
CREATE INDEX IF NOT EXISTS idx_users_parent_admin ON users(parent_admin_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Migrate existing data: Convert is_admin to user_role
UPDATE users
SET user_role = CASE
  WHEN is_admin = TRUE THEN 'super_admin'
  ELSE 'customer'
END
WHERE user_role = 'customer'; -- Only update if not already set

-- Add comments for documentation
COMMENT ON COLUMN users.is_admin IS 'DEPRECATED: Use user_role instead';
COMMENT ON COLUMN users.user_role IS 'User role: super_admin (총 관리자), sub_admin (하위 관리자), or customer (고객)';
COMMENT ON COLUMN users.parent_admin_id IS 'Parent admin reference: sub_admin → super_admin, customer → sub_admin';
COMMENT ON COLUMN users.company_name IS 'Company name for sub-admins';
COMMENT ON COLUMN users.contact_email IS 'Contact email for communication';
COMMENT ON COLUMN users.contact_phone IS 'Contact phone number';
COMMENT ON COLUMN users.is_active IS 'Account status (active/inactive)';
COMMENT ON COLUMN users.notes IS 'Admin notes about the user';
