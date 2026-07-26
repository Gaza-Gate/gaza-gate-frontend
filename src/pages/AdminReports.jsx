 import { useEffect, useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
import { StatsGridSkeleton, Skeleton } from '../components/LoadingState'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import { SidebarProvider } from '../components/SidebarContext'
import { getAdminReports } from '../services/adminService'
import './AdminReports.css'

const PERIODS = [
  { key: '7d', label: 'آخر 7 أيام' },
  { key: '30d', label: 'آخر 30 يوماً' },
  { key: '3m', label: 'آخر 3 أشهر' },
  { key: 'year', label: 'هذا العام' },
]

// بيانات وهمية مؤقتة لحد ما يجهز endpoint من نور
const FALLBACK_DATA = {
  stats: {
    totalSales: 463000,
    conversionRate: 3.8,
    avgOrderValue: 131.9,
  },
  chart: [
    { day: 'يوم 1', revenue: 620, orders: 55 },
    { day: 'يوم 2', revenue: 640, orders: 58 },
    { day: 'يوم 3', revenue: 660, orders: 60 },
    { day: 'يوم 4', revenue: 655, orders: 62 },
    { day: 'يوم 5', revenue: 690, orders: 65 },
    { day: 'يوم 6', revenue: 705, orders: 68 },
    { day: 'يوم 7', revenue: 720, orders: 70 },
  ],
  categories: [
    { name: 'المأكولات المنزلية', amount: 128000, count: 148 },
    { name: 'ملابس', amount: 94500, count: 274 },
    { name: 'الاشغال اليدوية', amount: 67200, count: 312 },
  ],
}

export default function AdminReports() {
  return (
    <SidebarProvider>
      <AdminReportsContent />
    </SidebarProvider>
  )
}

function AdminReportsContent() {
  const [period, setPeriod] = useState('7d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const res = await getAdminReports(period)
        setData(res.data)
      } catch (err) {
        console.error('فشل تحميل التقارير', err)
        setData(FALLBACK_DATA)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [period])

  const maxCategoryAmount = data
    ? Math.max(...data.categories.map((c) => c.amount))
    : 1

  return (
    <div className="admin-reports-page">
      <AdminTopbar />

      <div className="admin-reports-page__body">
        <AdminSidebar />

        <main className="admin-reports-page__content">
          <div className="reports-header">
            <div className="reports-header__title-group">
              <h1 className="admin-reports-page__title">التقارير والتحليلات</h1>
              <p className="admin-reports-page__subtitle">نظرة عامة على أداء المنصة</p>
            </div>

            <div className="reports-header__filters">
              <button type="button" className="calendar-btn" aria-label="اختيار تاريخ">
                <FiCalendar />
              </button>
              <div className="period-tabs">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`period-tab ${period === p.key ? 'active' : ''}`}
                    onClick={() => setPeriod(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading || !data ? (
            <div className="reports-skel-wrap">
              <StatsGridSkeleton count={4} />
              <div className="reports-skel-chart-card">
                <div className="skel-stack" style={{ gap: 10 }}>
                  <Skeleton width="30%" height={14} />
                  <div className="reports-skel-chart" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* بطاقات الإحصائيات */}
              <div className="stats-grid">
                <div className="stat-card">
                  <p className="stat-card__label">إجمالي المبيعات</p>
                  <p className="stat-card__value">
                    ₪ {data.stats.totalSales.toLocaleString()}
                  </p>
                  <p className="stat-card__hint">خلال الفترة المحددة</p>
                </div>

                <div className="stat-card">
                  <p className="stat-card__label">معدل التحويل</p>
                  <p className="stat-card__value stat-card__value--green">
                    {data.stats.conversionRate}%
                  </p>
                  <p className="stat-card__hint">من الزوار للمشترين</p>
                </div>

                <div className="stat-card">
                  <p className="stat-card__label">متوسط قيمة الطلب</p>
                  <p className="stat-card__value stat-card__value--purple">
                    ₪ {data.stats.avgOrderValue}
                  </p>
                  <p className="stat-card__hint">لكل معاملة</p>
                </div>
              </div>

              {/* الرسم البياني */}
              <div className="chart-card">
                <div className="chart-card__header">
                  <h3>الإيرادات مقابل الطلبات</h3>
                  <div className="chart-legend">
                    <span className="legend-item">
                      <span className="legend-dot legend-dot--revenue" />
                      الإيرادات
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot legend-dot--orders" />
                      الطلبات
                    </span>
                  </div>
                </div>

                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.chart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        orientation="left"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                      />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="orders"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* أداء التصنيفات */}
              <div className="categories-card">
                <h3 className="categories-card__title">أداء التصنيفات</h3>

                <div className="categories-list">
                  {data.categories.map((cat) => (
                    <div className="category-row" key={cat.name}>
                      <span className="category-row__name">{cat.name}</span>

                      <div className="category-row__bar-wrap">
                        <div
                          className="category-row__bar"
                          style={{
                            width: `${(cat.amount / maxCategoryAmount) * 100}%`,
                          }}
                        />
                      </div>

                      <span className="category-row__count">{cat.count}</span>
                      <span className="category-row__amount">
                        ₪ {cat.amount.toLocaleString()}
                      </span>
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