'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BUSINESS_TYPES, BRAND_TONES } from '@/lib/constants'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [profile, setProfile] = useState({
    business_name: '',
    business_type: 'cafe',
    brand_tone: 'friendly',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      const data = await response.json()
      if (data.success && data.profile) {
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('프로필 로드 실패:', error)
      setMessage({ type: 'error', text: '프로필을 불러오는데 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: '프로필이 저장되었습니다!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || '저장에 실패했습니다.' })
      }
    } catch (error) {
      console.error('프로필 저장 실패:', error)
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">프로필을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← 대시보드로 돌아가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-600 mt-2">
            AI 답글 생성에 사용될 업체 정보를 설정하세요
          </p>
        </div>

        {/* 메시지 알림 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 설정 폼 */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 업체명 */}
            <div>
              <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-2">
                업체명
              </label>
              <input
                type="text"
                id="business_name"
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                placeholder="예: 스타벅스 강남점"
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                답글에 사용될 업체명입니다 (선택사항, 최대 100자)
              </p>
            </div>

            {/* 업종 */}
            <div>
              <label htmlFor="business_type" className="block text-sm font-medium text-gray-700 mb-2">
                업종 <span className="text-red-500">*</span>
              </label>
              <select
                id="business_type"
                value={profile.business_type}
                onChange={(e) => setProfile({ ...profile, business_type: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                운영하시는 업종을 선택하세요
              </p>
            </div>

            {/* 브랜드 톤앤매너 */}
            <div>
              <label htmlFor="brand_tone" className="block text-sm font-medium text-gray-700 mb-2">
                브랜드 톤앤매너 <span className="text-red-500">*</span>
              </label>
              <select
                id="brand_tone"
                value={profile.brand_tone}
                onChange={(e) => setProfile({ ...profile, brand_tone: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {BRAND_TONES.map((tone) => (
                  <option key={tone.value} value={tone.value}>
                    {tone.label} - {tone.description}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                AI 답글의 말투와 분위기를 선택하세요
              </p>
            </div>

            {/* 선택된 톤앤매너 설명 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">
                {BRAND_TONES.find((t) => t.value === profile.brand_tone)?.label} 톤
              </h3>
              <p className="text-sm text-blue-800">
                {BRAND_TONES.find((t) => t.value === profile.brand_tone)?.description}
              </p>
            </div>

            {/* 저장 버튼 */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>

        {/* 안내 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">💡 설정 안내</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 설정한 정보는 AI 답글 생성 시 자동으로 반영됩니다</li>
            <li>• 업종과 톤앤매너에 따라 답글의 스타일이 달라집니다</li>
            <li>• 언제든지 설정을 변경할 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
