import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SellerIllustration from '../assets/SellerIllustration'
import BuyerIllustration from '../assets/BuyerIllustration'
import { useAuth } from '../context/AuthContext'

/**
 * Onboarding — شاشة اختيار نوع الحساب (مشتري / بائع).
 *
 * ✅ اللوغو تم إزالته من أعلى الشاشة (بناءً على طلب المستخدم).
 * ✅ الثيم ديناميكي بالكامل: في الوضع النهاري خلفية فاتحة + بطاقات بيضاء
 *    + نصوص داكنة. في الوضع الليلي خلفية كحلية + بطاقات كحلية أفتح + نصوص بيضاء.
 * ✅ البرتقالي يظل ثابتاً كهوية بصرية.
 * ✅ الموجة في الخلفية تأتي من body::before / body::after في index.css.
 */
function PortalCard({ title, description, illustration, fillLabel, outlineLabel, onFill, onOutline, tag }) {
  return (
    <div className="portal-card">
      <div className="portal-card-tag">{tag}</div>
      <div className="portal-card-illustration">
        {illustration}
      </div>
      <div className="portal-card-content">
        <h2 className="portal-card-title">{title}</h2>
        <p className="portal-card-desc">{description}</p>
        <div className="portal-card-actions">
          <button className="portal-btn-primary auth-orange-btn" onClick={onFill}>
            {fillLabel}
          </button>
          <button className="portal-btn-ghost" onClick={onOutline}>
            {outlineLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { isAuthenticated, isBootstrapping, currentRole } = useAuth()

  // ✅ لو في session → نتجاوز الـ onboarding وندخل على طول
  useEffect(() => {
    if (isBootstrapping) return
    if (!isAuthenticated) return
    if (currentRole === 'seller') {
      navigate('/seller/dashboard', { replace: true })
    } else {
      navigate('/home/customer', { replace: true })
    }
  }, [isAuthenticated, isBootstrapping, currentRole, navigate])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .onboarding-root {
          min-height: 100vh;
          background: var(--bg-page); /* ✅ ديناميكي — فاتح/كحلي حسب الثيم */
          color: var(--text-dark);
          font-family: 'Tajawal', sans-serif;
          direction: rtl;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          position: relative;
          overflow: hidden;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* خلفية ديكور — توهج برتقالي خفيف (محايد للثيم) */
        .onboarding-root::before {
          content: '';
          position: absolute;
          top: -120px;
          left: -120px;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .onboarding-root::after {
          content: '';
          position: absolute;
          bottom: -100px;
          right: -100px;
          width: 360px;
          height: 360px;
          background: radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Header */
        .onboarding-header {
          text-align: center;
          margin-bottom: 2.5rem;
          position: relative;
          z-index: 1;
        }

        .onboarding-eyebrow {
          display: inline-block;
          background: rgba(249, 115, 22, 0.18);
          color: #c2410c;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 5px 16px;
          border-radius: 99px;
          margin-bottom: 0.9rem;
          border: 1px solid rgba(249, 115, 22, 0.35);
        }
        .dark .onboarding-eyebrow {
          color: #fdba74;
        }

        .onboarding-title {
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 900;
          color: var(--text-dark);
          line-height: 1.3;
          margin-bottom: 0.6rem;
          transition: color 0.3s ease;
        }

        .onboarding-title span {
          color: #f97316;
        }

        .onboarding-sub {
          font-size: clamp(13px, 2vw, 15px);
          color: var(--text-mid);
          max-width: 440px;
          margin: 0 auto;
          line-height: 1.7;
          transition: color 0.3s ease;
        }

        /* Grid */
        .onboarding-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          width: 100%;
          max-width: 820px;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 640px) {
          .onboarding-grid {
            grid-template-columns: 1fr;
            max-width: 400px;
            gap: 1rem;
          }
        }

        /* Card — ديناميكي حسب الثيم */
        .portal-card {
          background: var(--bg-glass);
          border-radius: 20px;
          padding: 2rem 1.75rem 1.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1.5px solid var(--border-glass);
          box-shadow: var(--shadow-glass);
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        /* خط علوي برتقالي للـ card */
        .portal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #fb923c, #fdba74);
          border-radius: 20px 20px 0 0;
        }

        .portal-card:hover {
          transform: translateY(-4px);
          border-color: rgba(249, 115, 22, 0.5);
          box-shadow: 0 14px 48px rgba(249, 115, 22, 0.15), 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .dark .portal-card:hover {
          box-shadow: 0 14px 48px rgba(249, 115, 22, 0.18), 0 4px 12px rgba(0, 0, 0, 0.45);
        }

        .portal-card-tag {
          display: inline-block;
          background: rgba(249, 115, 22, 0.15);
          color: #c2410c;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 99px;
          margin-bottom: 1.1rem;
          border: 1px solid rgba(249, 115, 22, 0.3);
        }
        .dark .portal-card-tag {
          color: #fdba74;
        }

        .portal-card-illustration {
          width: 160px;
          height: 145px;
          margin-bottom: 1.3rem;
          border-radius: 16px;
          background: var(--bg-overlay);
          border: 1px solid var(--border-glass);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        @media (max-width: 640px) {
          .portal-card-illustration {
            width: 130px;
            height: 118px;
          }
        }

        .portal-card-content {
          width: 100%;
        }

        .portal-card-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-dark);
          margin-bottom: 0.5rem;
          transition: color 0.3s ease;
        }

        .portal-card-desc {
          font-size: 13px;
          color: var(--text-mid);
          line-height: 1.7;
          margin-bottom: 1.4rem;
          min-height: 40px;
          transition: color 0.3s ease;
        }

        .portal-card-actions {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .portal-btn-primary {
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'Tajawal', sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
          box-shadow: 0 6px 18px rgba(249, 115, 22, 0.4);
        }

        .portal-btn-primary:hover {
          background: linear-gradient(135deg, #fdba74 0%, #fb923c 50%, #f97316 100%);
          transform: scale(1.02);
          box-shadow: 0 8px 22px rgba(249, 115, 22, 0.55);
        }

        .portal-btn-primary:active {
          transform: scale(0.98);
        }

        .portal-btn-ghost {
          width: 100%;
          padding: 11px 16px;
          background: transparent;
          color: var(--text-mid);
          border: 1.5px solid var(--border-strong);
          border-radius: 12px;
          font-family: 'Tajawal', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.18s, color 0.18s, background 0.18s;
        }

        .portal-btn-ghost:hover {
          border-color: #f97316;
          color: #f97316;
          background: rgba(249, 115, 22, 0.08);
        }

        /* Animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .onboarding-header { animation: fadeUp 0.45s 0.1s ease both; }
        .portal-card:nth-child(1) { animation: fadeUp 0.45s 0.2s ease both; }
        .portal-card:nth-child(2) { animation: fadeUp 0.45s 0.3s ease both; }
      `}</style>

      <div className="onboarding-root">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-eyebrow">مرحباً بك</div>
          <h1 className="onboarding-title">
            أهلاً بك في <span>بوابتك</span>
          </h1>
          <p className="onboarding-sub">
            اختر طريقة تسجيلك — مشترٍ يتسوق أو بائع يبني متجره
          </p>
        </div>

        {/* Cards */}
        <div className="onboarding-grid">
          <PortalCard
            tag="للمشترين"
            title="بوابة المشتري"
            description="تسوق، تتبع طلباتك، وتواصل مع البائعين بكل سهولة."
            illustration={<SellerIllustration />}
            fillLabel="أنشئ حساب مشترٍ"
            outlineLabel="تسجيل دخول"
            onFill={() => navigate('/onboarding/customer')}
            onOutline={() => navigate('/login/customer')}
          />
          <PortalCard
            tag="للبائعين"
            title="بوابة البائع"
            description="أدر منتجاتك، تتبع مبيعاتك، ونمّ عملك من مكان واحد."
            illustration={<BuyerIllustration />}
            fillLabel="أنشئ متجري"
            outlineLabel="تسجيل دخول"
            onFill={() => navigate('/seller/onboarding')}
            onOutline={() => navigate('/login/seller')}
          />
        </div>
      </div>
    </>
  )
}
