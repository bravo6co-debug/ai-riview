'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [reviewContent, setReviewContent] = useState('')
  const [generatedReply, setGeneratedReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentiment, setSentiment] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // 로그인 확인
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token) {
      router.push('/login')
      return
    }

    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [router])

  const generateReply = async () => {
    if (!reviewContent.trim()) {
      alert('리뷰 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/reply/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          review_content: reviewContent,
          brand_context: '카페'
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedReply(data.reply)
        setSentiment(data.sentiment)

        // 자동 클립보드 복사
        await navigator.clipboard.writeText(data.reply)
      } else {
        alert(`오류: ${data.error}`)
      }
    } catch (error) {
      alert('답글 생성 중 오류가 발생했습니다.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedReply)
  }

  const handleReset = () => {
    setReviewContent('')
    setGeneratedReply('')
    setSentiment(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const getSentimentBadge = () => {
    const badges = {
      positive: { text: '긍정', color: 'bg-green-100 text-green-800' },
      negative: { text: '부정', color: 'bg-red-100 text-red-800' },
      neutral: { text: '중립', color: 'bg-gray-100 text-gray-800' }
    }
    const badge = badges[sentiment as keyof typeof badges]
    return badge ? (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    ) : null
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            네이버 플레이스 답글 생성기
          </h1>
          <div className="flex items-center gap-4">
            {user.is_admin && (
              <button
                onClick={() => router.push('/admin')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                관리자 페이지
              </button>
            )}
            <span className="text-sm text-gray-600">
              {user.username}님
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* 리뷰 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              리뷰 내용
            </label>
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="리뷰 내용을 붙여넣으세요..."
              className="w-full min-h-[150px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-3">
            <button
              onClick={generateReply}
              disabled={loading}
              className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {loading ? '생성 중...' : '답글 생성하기'}
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
            >
              초기화
            </button>
          </div>

          {/* 생성된 답글 */}
          {generatedReply && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  생성된 답글
                </label>
                {getSentimentBadge()}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {generatedReply}
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                클립보드에 복사
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
