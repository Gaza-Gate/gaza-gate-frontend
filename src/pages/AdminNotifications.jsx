import { useEffect, useState } from 'react'
import {
  FiPackage,
  FiMessageSquare,
  FiCheckCircle,
  FiAlertTriangle,
  FiStar,
  FiShieldOff,
  FiX,
} from 'react-icons/fi'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import { SidebarProvider } from '../components/SidebarContext'
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from '../services/adminService'
import './AdminNotifications.css'

// خريطة الأيقونة واللون حسب نوع التنبيه
const TYPE_CONFIG = {
  order: { icon: FiPackage, color: '#3b82f6' },
  message: { icon: FiMessageSquare, color: '#8b5cf6' },
  system: { icon: FiCheckCircle, color: '#22c55e' },
  warning: { icon: FiAlertTriangle, color: '#f97316' },
  rating: { icon: FiStar, color: '#eab308' },
  backup: { icon: FiCheckCircle, color: '#22c55e' },
  security: { icon: FiShieldOff, color: '#ef4444' },
}

// بيانات وهمية مؤقتة لحد ما يجهز endpoint من نور
const FALLBACK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'order',
    title: 'طلب جديد #GG-7822',
    description: 'وصل طلب جديد بقيمة ₪1,840 من العميل أحمد محمد',
    time: 'منذ 5 دقائق',
    isRead: false,
  },
  {
    id: 2,
    type: 'message',
    title: 'رسالة من فاطمة إبراهيم',
    description: 'استفسار حول حالة شحن الطلب #GG-7810',
    time: 'منذ 22 دقيقة',
    isRead: true,
  },
  {
    id: 3,
    type: 'system',
    title: 'تحديث النظام مكتمل',
    description: 'تم تحديث قاعدة البيانات إلى الإصدار 2.41 بنجاح',
    time: 'منذ ساعة',
    isRead: false,
  },
  {
    id: 4,
    type: 'warning',
    title: 'تحذير: مخزون منخفض',
    description: 'منتج "سماعات لاسلكية XB900" تبقى منه 3 قطع فقط',
    time: 'منذ 3 ساعات',
    isRead: true,
  },
  {
    id: 5,
    type: 'order',
    title: 'طلب ملغى #GG-7808',
    description: 'تم إلغاء الطلب من العميل سارة عبد الله وسيتم استرجاع المبلغ',
    time: 'أمس 10:14 م',
    isRead: true,
  },
  {
    id: 6,
    type: 'rating',
    title: 'تقييم جديد',
    description: 'أضاف خالد الأحمدي تقييماً ممتازاً لمنتج iPhone 15 Pro',
    time: 'أمس 7:40 م',
    isRead: true,
  },
  {
    id: 7,
    type: 'backup',
    title: 'نسخة احتياطية ناجحة',
    description: 'تم إنشاء نسخة احتياطية يومية للبيانات بنجاح',
    time: 'أمس 3:00 ص',
    isRead: true,
  },
  {
    id: 8,
    type: 'security',
    title: 'محاولة دخول مشبوهة',
    description: 'تم رصد محاولة تسجيل دخول غير معتادة من IP: 185.220.x.x',
    time: '2025 يوليو 26',
    isRead: true,
  },
]

export default function AdminNotifications() {
  return (
    <SidebarProvider>
      <AdminNotificationsContent />
    </SidebarProvider>
  )
}

function AdminNotificationsContent() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getAdminNotifications()
        setNotifications(res.data)
      } catch (err) {
        console.error('فشل تحميل التنبيهات', err)
        setNotifications(FALLBACK_NOTIFICATIONS)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const visibleNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications

  const handleMarkRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    try {
      await markNotificationRead(id)
    } catch (err) {
      console.error('فشل تعليم التنبيه كمقروء', err)
    }
  }

  const handleMarkAllRead = async () => {
    const previous = notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await markAllNotificationsRead()
    } catch (err) {
      console.error('فشل تعليم كل التنبيهات كمقروءة', err)
      setNotifications(previous)
    }
  }

  const handleDismiss = async (id) => {
    const previous = notifications
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await dismissNotification(id)
    } catch (err) {
      console.error('فشل حذف التنبيه', err)
      setNotifications(previous)
    }
  }

  return (
    <div className="admin-notifications-page">
      <AdminTopbar />

      <div className="admin-notifications-page__body">
        <AdminSidebar />

        <main className="admin-notifications-page__content">
          <div className="notifications-header">
            <div className="notifications-header__title-row">
              <h1 className="admin-notifications-page__title">التنبيهات</h1>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount} غير مقروء</span>
              )}
            </div>

            <div className="notifications-header__actions">
              <button
                type="button"
                className="mark-all-btn"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                تعليم الكل كمقروء
              </button>

              <div className="filter-tabs">
                <button
                  type="button"
                  className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  الكل
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilter('unread')}
                >
                  غير مقروء
                </button>
              </div>
            </div>
          </div>

          <div className="notifications-list">
            {loading ? (
              <p className="notifications-loading">جاري التحميل...</p>
            ) : visibleNotifications.length === 0 ? (
              <p className="notifications-empty">لا يوجد تنبيهات لعرضها</p>
            ) : (
              visibleNotifications.map((n) => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
                const Icon = config.icon
                return (
                  <div
                    key={n.id}
                    className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                  >
                    <button
                      type="button"
                      className="notification-item__dismiss"
                      onClick={() => handleDismiss(n.id)}
                      aria-label="حذف التنبيه"
                    >
                      <FiX />
                    </button>

                    <div className="notification-item__top">
                      <div className="notification-item__title-group">
                        <div
                          className="notification-item__icon"
                          style={{ background: `${config.color}1A`, color: config.color }}
                        >
                          <Icon />
                        </div>
                        <div className="notification-item__title-row">
                          {!n.isRead && <span className="unread-dot" />}
                          <span className="notification-item__title">{n.title}</span>
                        </div>
                      </div>

                      <span className="notification-item__time">{n.time}</span>
                    </div>

                    <p className="notification-item__description">{n.description}</p>

                    {!n.isRead && (
                      <button
                        type="button"
                        className="notification-item__mark-read"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        تعليم كمقروء
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>
    </div>
  )
}