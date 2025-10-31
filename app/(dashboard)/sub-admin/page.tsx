'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChangePasswordModal from '@/components/ChangePasswordModal'

interface Customer {
  id: string
  username: string
  business_name?: string
  business_type?: string
  is_active: boolean
  created_at: string
}

export default function SubAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    username: '',
    business_name: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userStr)
    if (user.user_role !== 'sub_admin') {
      router.push('/') // 권한 없으면 일반 대시보드로
      return
    }

    setCurrentUser(user)
    loadCustomers(token)
  }, [router])

  const loadCustomers = async (token: string) => {
    try {
      const response = await fetch('/api/sub-admin/customers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setCustomers(data.customers)
      } else {
        alert(data.error || '고객 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to load customers:', error)
      alert('고객 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')

    try {
      const response = await fetch('/api/sub-admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCustomer)
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message || '고객이 추가되었습니다.')
        setShowAddCustomer(false)
        setNewCustomer({ username: '', business_name: '' })
        if (token) {
          loadCustomers(token)
        }
      } else {
        alert(data.error || '고객 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to add customer:', error)
      alert('고객 추가에 실패했습니다.')
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('정말 이 고객을 삭제하시겠습니까?')) {
      return
    }

    const token = localStorage.getItem('token')
    try {
      const response = await fetch(`/api/sub-admin/customers?id=${customerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        alert('고객이 삭제되었습니다.')
        if (token) {
          loadCustomers(token)
        }
      } else {
        alert(data.error || '고객 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to delete customer:', error)
      alert('고객 삭제에 실패했습니다.')
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
            <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="text-sm text-gray-600">
              {currentUser?.username}님 ({currentUser?.company_name || '회사명 없음'})
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              비밀번호 변경
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Customers Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">내 고객 목록</h2>
            <button
              onClick={() => setShowAddCustomer(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              + 고객 추가
            </button>
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
                        업체명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        업종
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        등록일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{customer.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{customer.business_name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{customer.business_type || '-'}</td>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            삭제
                          </button>
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

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">고객 추가</h3>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 초기 비밀번호는 <strong>1234!@#$</strong>로 자동 설정됩니다.
              </p>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    아이디
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    value={newCustomer.username}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    업체명
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    value={newCustomer.business_name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, business_name: e.target.value })
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
                  onClick={() => setShowAddCustomer(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  )
}
