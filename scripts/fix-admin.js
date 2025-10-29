// Admin 계정 비밀번호 재설정 스크립트
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = 'https://abmznacsmekugtgagdnk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibXpuYWNzbWVrdWd0Z2FnZG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTcwODMzOCwiZXhwIjoyMDc3Mjg0MzM4fQ.zXZJc4W0MzGzh9aKS7p0pv_Rxg70yY-FyTP6S4ufxZo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAdmin() {
  try {
    console.log('🔧 Admin 계정 비밀번호 재설정...\n')

    // 1. 기존 admin 계정 삭제
    console.log('1. 기존 admin 계정 삭제 중...')
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('username', 'admin')

    if (deleteError) {
      console.log('삭제 오류 (무시 가능):', deleteError.message)
    } else {
      console.log('✅ 기존 계정 삭제 완료')
    }

    // 2. 새 비밀번호 해시 생성
    console.log('\n2. 새 비밀번호 해시 생성 중...')
    const passwordHash = await bcrypt.hash('admin123', 12)
    console.log('✅ 비밀번호 해시 생성 완료')
    console.log('해시:', passwordHash.substring(0, 20) + '...')

    // 3. 새 admin 계정 생성
    console.log('\n3. 새 admin 계정 생성 중...')
    const { data, error: insertError } = await supabase
      .from('users')
      .insert({
        username: 'admin',
        password_hash: passwordHash,
        is_admin: true
      })
      .select()

    if (insertError) {
      console.error('❌ 삽입 오류:', insertError)
      process.exit(1)
    }

    console.log('✅ 새 admin 계정 생성 완료!')

    // 4. 비밀번호 검증
    console.log('\n4. 비밀번호 검증 테스트...')
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single()

    if (verifyError) {
      console.error('❌ 검증 오류:', verifyError)
      process.exit(1)
    }

    const isValid = await bcrypt.compare('admin123', verifyUser.password_hash)
    console.log('비밀번호 매칭:', isValid ? '✅ 성공' : '❌ 실패')

    if (isValid) {
      console.log('\n🎉 완료! 이제 로그인할 수 있습니다:')
      console.log('   아이디: admin')
      console.log('   비밀번호: admin123')
    } else {
      console.log('\n❌ 비밀번호 검증 실패. 다시 시도해주세요.')
    }
  } catch (error) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
}

fixAdmin()
