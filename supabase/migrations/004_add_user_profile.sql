-- Add user profile columns to users table
-- 사용자 프로필 컬럼 추가: 업체명, 업종, 브랜드 톤앤매너

-- Add columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS business_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'cafe',
ADD COLUMN IF NOT EXISTS brand_tone VARCHAR(50) DEFAULT 'friendly';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_business_type ON users(business_type);

-- Update existing users with default values
UPDATE users
SET business_name = COALESCE(business_name, username),
    business_type = COALESCE(business_type, 'cafe'),
    brand_tone = COALESCE(brand_tone, 'friendly')
WHERE business_name IS NULL OR business_type IS NULL OR brand_tone IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.business_name IS '업체명 (Business Name)';
COMMENT ON COLUMN users.business_type IS '업종 (Business Type/Industry)';
COMMENT ON COLUMN users.brand_tone IS '브랜드 톤앤매너 (Brand Tone & Manner)';
