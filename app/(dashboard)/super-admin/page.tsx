'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  user_role: string
  company_name?: string
  contact_email?: string
  is_active: boolean
  created_at: string
}

interface UsageSummary {
  totalRequests: number
  totalTokens: number
  totalCost: number
  activeUsers: number
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [subAdmins, setSubAdmins] = useState<User[]>([])
  const [customers, setCustomers] = useState<User[]>([])
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null)
  const [showAddSubAdmin, setShowAddSubAdmin] = useState(false)
  const [newSubAdmin, setNewSubAdmin] = useState({
    username: '',
    password: '',
    company_name: '',
    contact_email: '',
  })

  useEffect(() => {
    // 인증 확인
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userStr)
    if (user.user_role !== 'super_admin') {
      router.push('/') // 권한 없으면 일반 대시보드로
      return
    }

    setCurrentUser(user)
    loadDashboardData(token)
  }, [router])

  const loadDashboardData = async (token: string) => {
    try {
      // TODO: API 엔드포인트 구현 필요
      // const response = await fetch('/api/super-admin/overview', {
      //   headers: { Authorization: `Bearer ${token}` }
      // })
      // const data = await response.json()

      // 임시 데이터
      setUsageSummary({
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        activeUsers: 0,
      })
      setSubAdmins([])
      setCustomers([])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleAddSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')

    try {
      // TODO: API 구현 필요
      // const response = await fetch('/api/super-admin/sub-admins', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify(newSubAdmin)
      // })

      alert('하위 관리자 추가 기능은 곧 구현될 예정입니다.')
      setShowAddSubAdmin(false)
      setNewSubAdmin({ username: '', password: '', company_name: '', contact_email: '' })
    } catch (error) {
      console.error('Failed to add sub-admin:', error)
      alert('하위 관리자 추가에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">슈퍼 관리자 대시보드</h1>
            <p className="text-sm text-gray-600">{currentUser?.username}님 환영합니다</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Usage Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">총 요청 수</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {usageSummary?.totalRequests.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">총 토큰 사용</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {usageSummary?.totalTokens.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">총 비용</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${usageSummary?.totalCost.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">활성 사용자</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {usageSummary?.activeUsers || 0}
            </p>
          </div>
        </div>

        {/* Sub-Admins Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">하위 관리자 목록</h2>
            <button
              onClick={() => setShowAddSubAdmin(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              + 하위 관리자 추가
            </button>
          </div>
          <div className="p-6">
            {subAdmins.length === 0 ? (
              <p className="text-gray-500 text-center py-8">등록된 하위 관리자가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        아이디
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        회사명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        이메일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        등록일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{admin.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{admin.company_name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{admin.contact_email || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              admin.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {admin.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(admin.created_at).toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* All Customers Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">전체 고객 목록</h2>
          </div>
          <div className="p-6">
            {customers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">등록된 고객이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        아이디
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        담당 관리자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        등록일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{customer.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">-</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              customer.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {customer.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(customer.created_at).toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Sub-Admin Modal */}
      {showAddSubAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">하위 관리자 추가</h3>
            <form onSubmit={handleAddSubAdmin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    아이디
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    value={newSubAdmin.username}
                    onChange={(e) =>
                      setNewSubAdmin({ ...newSubAdmin, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    value={newSubAdmin.password}
                    onChange={(e) =>
                      setNewSubAdmin({ ...newSubAdmin, password: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    회사명
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    value={newSubAdmin.company_name}
                    onChange={(e) =>
                      setNewSubAdmin({ ...newSubAdmin, company_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    value={newSubAdmin.contact_email}
                    onChange={(e) =>
                      setNewSubAdmin({ ...newSubAdmin, contact_email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSubAdmin(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
