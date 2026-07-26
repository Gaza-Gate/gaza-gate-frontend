 import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiFilter } from 'react-icons/fi'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import { SidebarProvider } from '../components/SidebarContext'
import { TableSkeleton, EmptyState } from '../components/LoadingState'
import { Inbox } from 'lucide-react'
import { getAdminUsers, toggleUserStatus } from '../services/adminService'
import './AdminUsers.css'

// بيانات وهمية مؤقتة لحد ما يجهز endpoint من نور
const FALLBACK_USERS = [
  {
    id: 1,
    name: 'أحمد محمد الخطيب',
    email: 'ahmad@example.com',
    role: 'عميل',
    ordersCount: 14,
    registeredAt: '2024-03-12',
    isActive: true,
    avatarColor: '#3b82f6',
  },
  {
    id: 2,
    name: 'فاطمة إبراهيم',
    email: 'fatima@example.com',
    role: 'عميل',
    ordersCount: 8,
    registeredAt: '2024-05-20',
    isActive: true,
    avatarColor: '#0ea5e9',
  },
  {
    id: 3,
    name: 'محمود يوسف',
    email: 'mahmoud@example.com',
    role: 'مشرف',
    ordersCount: 0,
    registeredAt: '2023-11-01',
    isActive: true,
    avatarColor: '#f97316',
  },
  {
    id: 4,
    name: 'سارة عبد الله',
    email: 'sara@example.com',
    role: 'عميل',
    ordersCount: 3,
    registeredAt: '2024-01-08',
    isActive: false,
    avatarColor: '#38bdf8',
  },
  {
    id: 5,
    name: 'خالد الأحمدي',
    email: 'khalid@example.com',
    role: 'عميل',
    ordersCount: 22,
    registeredAt: '2024-06-15',
    isActive: true,
    avatarColor: '#22c55e',
  },
  {
    id: 6,
    name: 'نور الدين حسن',
    email: 'nour@example.com',
    role: 'عميل',
    ordersCount: 1,
    registeredAt: '2023-09-28',
    isActive: false,
    avatarColor: '#0ea5e9',
  },
  {
    id: 7,
    name: 'ريم الشمري',
    email: 'reem@example.com',
    role: 'عميل',
    ordersCount: 5,
    registeredAt: '2024-07-03',
    isActive: true,
    avatarColor: '#3b82f6',
  },
]

export default function AdminUsers() {
  return (
    <SidebarProvider>
      <AdminUsersContent />
    </SidebarProvider>
  )
}

function AdminUsersContent() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | disabled
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await getAdminUsers()
        setUsers(res.data)
      } catch (err) {
        console.error('فشل تحميل المستخدمين', err)
        setUsers(FALLBACK_USERS)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'disabled' && !u.isActive)

      return matchesSearch && matchesStatus
    })
  }, [users, searchTerm, statusFilter])

  const handleToggleStatus = async (user) => {
    const newStatus = !user.isActive
    setUpdatingId(user.id)
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
    )
    try {
      await toggleUserStatus(user.id, newStatus)
    } catch (err) {
      console.error('فشل تحديث حالة المستخدم', err)
      // رجّع الحالة القديمة لو فشل
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: user.isActive } : u))
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const getInitial = (name) => name?.trim().charAt(0) || '؟'

  return (
    <div className="admin-users-page">
      <AdminTopbar />

      <div className="admin-users-page__body">
        <AdminSidebar />

        <main className="admin-users-page__content">
          <div className="users-header">
            <div className="users-header__title-group">
              <h1 className="admin-users-page__title">إدارة المستخدمين</h1>
              <p className="admin-users-page__subtitle">
                {users.length} مستخدم — {users.filter((u) => u.isActive).length} نشط
              </p>
            </div>
          </div>

          <div className="users-toolbar">
            <div className="search-box">
              <FiSearch className="search-box__icon" />
              <input
                type="text"
                placeholder="بحث في المستخدمين..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-box">
              <FiFilter className="filter-box__icon" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">فلتر</option>
                <option value="active">نشط</option>
                <option value="disabled">معطل</option>
              </select>
            </div>
          </div>

          <div className="users-table-card">
            {loading ? (
              <TableSkeleton rows={6} columns={5} />
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="لا يوجد نتائج مطابقة"
                description="جرّب تغيير البحث أو الفلاتر"
              />
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>الدور</th>
                    <th>الطلبات</th>
                    <th>تاريخ التسجيل</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div
                            className="user-avatar"
                            style={{ background: user.avatarColor }}
                          >
                            {getInitial(user.name)}
                          </div>
                          <div className="user-cell__info">
                            <span className="user-cell__name">{user.name}</span>
                            <span className="user-cell__email">{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`role-badge ${
                            user.role === 'مشرف' ? 'role-badge--admin' : ''
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="text-center">{user.ordersCount}</td>

                      <td className="text-muted">{user.registeredAt}</td>

                      <td>
                        <span
                          className={`status-badge ${
                            user.isActive ? 'status-badge--active' : 'status-badge--disabled'
                          }`}
                        >
                          <span className="status-dot" />
                          {user.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`toggle-status-btn ${
                            user.isActive ? 'toggle-status-btn--disable' : 'toggle-status-btn--enable'
                          }`}
                          onClick={() => handleToggleStatus(user)}
                          disabled={updatingId === user.id}
                        >
                          {updatingId === user.id
                            ? '...'
                            : user.isActive
                            ? 'تعطيل'
                            : 'تفعيل'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}