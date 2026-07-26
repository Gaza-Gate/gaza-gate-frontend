 import { useEffect, useState } from 'react'
import { FiBox, FiUsers, FiDollarSign, FiShoppingCart } from 'react-icons/fi'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import { StatsGridSkeleton, Skeleton } from '../components/LoadingState'
import { SidebarProvider } from '../components/SidebarContext'
import { getAdminDashboard } from '../services/adminService'
import './AdminDashboard.css'

// بيانات وهمية مؤقتة لحد ما يجهز endpoint من نور
const FALLBACK_DATA = {
  stats: {
    totalProducts: 982,
    totalProductsChange: '+24 هذا الشهر',
    activeUsers: 5,
    activeUsersTotal: 7,
    totalRevenue: 463000,
    totalRevenueChange: '+18.3%',
    totalOrders: 3510,
    totalOrdersChange: '+12.4%',
  },
  monthlyRevenue: [
    { month: 'يناير', value: 55000 },
    { month: 'فبراير', value: 58000 },
    { month: 'مارس', value: 62000 },
    { month: 'أبريل', value: 60000 },
    { month: 'مايو', value: 68000 },
    { month: 'يونيو', value: 82000 },
    { month: 'يوليو', value: 86000 },
  ],
  monthlyOrders: [
    { month: 'يناير', value: 280 },
    { month: 'فبراير', value: 310 },
    { month: 'مارس', value: 330 },
    { month: 'أبريل', value: 300 },
    { month: 'مايو', value: 380 },
    { month: 'يونيو', value: 430 },
    { month: 'يوليو', value: 440 },
  ],
  recentOrders: [
    {
      id: 'GG-7821',
      customerName: 'أحمد محمد الخطيب',
      amount: 2340,
      status: 'مكتمل',
    },
    {
      id: 'GG-7820',
      customerName: 'خالد الأحمدي',
      amount: 890,
      status: 'معلق',
    },
    {
      id: 'GG-7819',
      customerName: 'ريم الشمري',
      amount: 1150,
      status: 'مكتمل',
    },
    {
      id: 'GG-7818',
      customerName: 'فاطمة إبراهيم',
      amount: 430,
      status: 'ملغي',
    },
  ],
}

const STATUS_STYLES = {
  'مكتمل': 'status-tag--success',
  'معلق': 'status-tag--pending',
  'ملغي': 'status-tag--cancelled',
}

export default function AdminDashboard() {
  return (
    <SidebarProvider>
      <AdminDashboardContent />
    </SidebarProvider>
  )
}

function AdminDashboardContent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getAdminDashboard()
        setData(res.data)
      } catch (err) {
        console.error('فشل تحميل بيانات لوحة التحكم', err)
        setData(FALLBACK_DATA)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  return (
    <div className="admin-dashboard-page">
      <AdminTopbar />

      <div className="admin-dashboard-page__body">
        <AdminSidebar />

        <main className="admin-dashboard-page__content">
          {loading || !data ? (
            <div className="dashboard-skel-wrap">
              <StatsGridSkeleton count={4} />
              <div className="dashboard-skel-charts">
                <div className="dashboard-skel-chart-card">
                  <div className="skel-stack" style={{ gap: 10 }}>
                    <Skeleton width="35%" height={14} />
                    <div className="dashboard-skel-chart" />
                  </div>
                </div>
                <div className="dashboard-skel-chart-card">
                  <div className="skel-stack" style={{ gap: 10 }}>
                    <Skeleton width="35%" height={14} />
                    <div className="dashboard-skel-chart" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* بطاقات الإحصائيات */}
              <div className="dashboard-stats-grid">
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-card__row">
                    <div
                      className="dashboard-stat-card__icon"
                      style={{ background: '#fef3c7', color: '#d97706' }}
                    >
                      <FiBox />
                    </div>
                    <span className="dashboard-stat-card__change dashboard-stat-card__change--positive">
                      {data.stats.totalProductsChange}
                    </span>
                  </div>
                  <p className="dashboard-stat-card__value">
                    {data.stats.totalProducts.toLocaleString()}
                  </p>
                  <p className="dashboard-stat-card__label">المنتجات النشطة</p>
                </div>

                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-card__row">
                    <div
                      className="dashboard-stat-card__icon"
                      style={{ background: '#f3e8ff', color: '#9333ea' }}
                    >
                      <FiUsers />
                    </div>
                    <span className="dashboard-stat-card__change dashboard-stat-card__change--negative">
                      -2 هذا الشهر
                    </span>
                  </div>
                  <p className="dashboard-stat-card__value">
                    {data.stats.activeUsers} من {data.stats.activeUsersTotal}
                  </p>
                  <p className="dashboard-stat-card__label">المستخدمين النشطين</p>
                </div>

                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-card__row">
                    <div
                      className="dashboard-stat-card__icon"
                      style={{ background: '#dcfce7', color: '#16a34a' }}
                    >
                      <FiDollarSign />
                    </div>
                    <span className="dashboard-stat-card__change dashboard-stat-card__change--positive">
                      {data.stats.totalRevenueChange}
                    </span>
                  </div>
                  <p className="dashboard-stat-card__value">
                    ₪ {data.stats.totalRevenue.toLocaleString()}
                  </p>
                  <p className="dashboard-stat-card__label">إجمالي الإيرادات</p>
                </div>

                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-card__row">
                    <div
                      className="dashboard-stat-card__icon"
                      style={{ background: '#fed7aa', color: '#ea580c' }}
                    >
                      <FiShoppingCart />
                    </div>
                    <span className="dashboard-stat-card__change dashboard-stat-card__change--positive">
                      {data.stats.totalOrdersChange}
                    </span>
                  </div>
                  <p className="dashboard-stat-card__value">
                    {data.stats.totalOrders.toLocaleString()}
                  </p>
                  <p className="dashboard-stat-card__label">إجمالي الطلبات</p>
                </div>
              </div>

              {/* الإيرادات الشهرية */}
              <div className="dashboard-chart-card">
                <div className="dashboard-chart-card__header">
                  <h3>الإيرادات الشهرية</h3>
                  <span className="dashboard-chart-card__hint">يناير — يوليو 2025</span>
                </div>
                <div className="dashboard-chart-wrapper">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.monthlyRevenue}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* الطلبات الشهرية */}
              <div className="dashboard-chart-card">
                <div className="dashboard-chart-card__header">
                  <h3>الطلبات الشهرية</h3>
                  <span className="dashboard-chart-card__hint">عدد الطلبات المستلمة</span>
                </div>
                <div className="dashboard-chart-wrapper">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.monthlyOrders}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* أحدث الطلبات */}
              <div className="dashboard-recent-orders-card">
                <h3 className="dashboard-recent-orders-card__title">أحدث الطلبات</h3>

                <div className="recent-orders-list">
                  {data.recentOrders.map((order) => (
                    <div className="recent-order-row" key={order.id}>
                      <span
                        className={`status-tag ${STATUS_STYLES[order.status] || ''}`}
                      >
                        {order.status}
                      </span>
                      <span className="recent-order-row__amount">
                        ₪ {order.amount.toLocaleString()}
                      </span>
                      <span className="recent-order-row__customer">
                        {order.customerName}
                      </span>
                      <span className="recent-order-row__id">#{order.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}