import { FiBell, FiSearch, FiShoppingCart, FiMenu, FiLogOut } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../utils/api'
import { useSidebar } from './SidebarContext'
import logo from '../assets/logo.png'
import './AdminTopbar.css'

export default function AdminTopbar() {
  const navigate = useNavigate()
  const { toggle } = useSidebar()

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

  return (
    <header className="admin-topbar">
      <button
        type="button"
        className="admin-sidebar__toggle-btn"
        onClick={toggle}
        aria-label="فتح القائمة"
      >
        <FiMenu />
      </button>

      <img src={logo} alt="Gaza Gate" className="admin-topbar__logo" />

    <div className="admin-topbar__search">
  <FiSearch />
  <input
    type="text"
    placeholder="ابحث عن منتج أو متجر..."
    autoComplete="new-password"
    name="admin-search-field-no-autofill"
    onFocus={(e) => e.target.removeAttribute('readonly')}
    readOnly
  />
</div>

      <div className="admin-topbar__icons">
        <FiShoppingCart />
        <FiBell />
        <button type="button" className="admin-topbar__icon-btn" onClick={handleLogout}>
          <FiLogOut />
          <span>خروج</span>
        </button>
      </div>
    </header>
  )
}