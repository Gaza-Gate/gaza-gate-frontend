import { NavLink, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiUsers,
  FiTag,
  FiBarChart2,
  FiBell,
  FiUser,
  FiSettings,
  FiLogOut,
  FiX,
} from 'react-icons/fi'
import { authAPI } from '../utils/api'
import { useSidebar } from './SidebarContext'
import './AdminSidebar.css'

const mainLinks = [
  { to: '/admin/dashboard', label: 'لوحة التحكم', icon: FiHome },
  { to: '/admin/users', label: 'ادارة المستخدمين', icon: FiUsers },
  { to: '/admin/categories', label: 'التصنيفات', icon: FiTag },
  { to: '/admin/reports', label: 'التقارير', icon: FiBarChart2 },
]

const accountLinks = [
  { to: '/admin/notifications', label: 'التنبيهات', icon: FiBell },
  { to: '/admin/profile', label: 'الملف الشخصي', icon: FiUser },
  { to: '/admin/settings', label: 'الاعدادات', icon: FiSettings },
]

export default function AdminSidebar() {
  const navigate = useNavigate()
  const { isOpen, close } = useSidebar()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // حتى لو فشل الطلب منسجل خروج محلياً
    } finally {
      localStorage.clear()
      navigate('/login/seller')
    }
  }

  const renderLink = ({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={close}
      className={({ isActive }) =>
        `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`
      }
    >
      <span className="admin-sidebar__label">{label}</span>
      <Icon className="admin-sidebar__icon" />
    </NavLink>
  )

  return (
    <>
      <div
        className={`admin-sidebar__overlay${isOpen ? ' is-visible' : ''}`}
        onClick={close}
      />

      <aside className={`admin-sidebar${isOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="admin-sidebar__close-btn"
          onClick={close}
        >
          <FiX />
        </button>

        <p className="admin-sidebar__heading">القوائم الرئيسية</p>
        <nav className="admin-sidebar__group">{mainLinks.map(renderLink)}</nav>

        <p className="admin-sidebar__heading">الحساب</p>
        <nav className="admin-sidebar__group">{accountLinks.map(renderLink)}</nav>

        <button type="button" className="admin-sidebar__logout" onClick={handleLogout}>
          <span>تسجيل خروج</span>
          <FiLogOut className="admin-sidebar__icon" />
        </button>
      </aside>
    </>
  )
}