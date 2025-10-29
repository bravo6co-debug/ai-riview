// Supabase에 관리자 계정 생성 스크립트
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

// 환경 변수 직접 설정
const supabaseUrl = 'https://abmznacsmekugtgagdnk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibXpuYWNzbWVrdWd0Z2FnZG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTcwODMzOCwiZXhwIjoyMDc3Mjg0MzM4fQ.zXZJc4W0MzGzh9aKS7p0pv_Rxg70yY-FyTP6S4ufxZo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdmin() {
  try {
    console.log('Supabase 연결 중...')
    console.log('URL:', supabaseUrl)

    // 기존 admin 계정 확인
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')

    if (checkError) {
      console.log('❌ 조회 오류:', checkError.message)
      console.log('테이블이 존재하지 않을 수 있습니다. SQL 마이그레이션을 먼저 실행하세요.')
      process.exit(1)
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0]
      console.log('✅ admin 계정이 이미 존재합니다.')
      console.log('사용자 정보:', {
        id: existingUser.id,
        username: existingUser.username,
        is_admin: existingUser.is_admin,
        created_at: existingUser.created_at
      })

      // 비밀번호 테스트
      console.log('\n비밀번호 검증 테스트...')
      const isValid = await bcrypt.compare('admin123', existingUser.password_hash)
      console.log('비밀번호 매칭:', isValid ? '✅ 성공' : '❌ 실패')

      return
    }

    console.log('admin 계정을 생성합니다...')

    // 비밀번호 해싱 (admin123)
    const passwordHash = await bcrypt.hash('admin123', 12)
    console.log('비밀번호 해시 생성 완료')

    // 관리자 계정 생성
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: 'admin',
        password_hash: passwordHash,
        is_admin: true
      })
      .select()

    if (error) {
      console.error('❌ 삽입 오류:', error)
      process.exit(1)
    }

    console.log('✅ admin 계정이 성공적으로 생성되었습니다!')
    console.log('아이디: admin')
    console.log('비밀번호: admin123')
  } catch (error) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

createAdmin()
