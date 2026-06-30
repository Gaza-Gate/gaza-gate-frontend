import { useNavigate } from 'react-router-dom'
import SellerIllustration from '../assets/SellerIllustration'
import BuyerIllustration from '../assets/BuyerIllustration'

function PortalCard({ title, description, illustration, fillLabel, outlineLabel, onFill, onOutline, accentColor, tag }) {
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
          <button className="portal-btn-primary" onClick={onFill}>
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .onboarding-root {
          min-height: 100vh;
          background: #FFF8F3;
          font-family: 'Tajawal', sans-serif;
          direction: rtl;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          position: relative;
          overflow: hidden;
        }

        /* خلفية ديكور */
        .onboarding-root::before {
          content: '';
          position: absolute;
          top: -120px;
          left: -120px;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .onboarding-root::after {
          content: '';
          position: absolute;
          bottom: -100px;
          right: -100px;
          width: 360px;
          height: 360px;
          background: radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%);
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
          background: #FED7AA;
          color: #C2410C;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 5px 16px;
          border-radius: 99px;
          margin-bottom: 0.9rem;
        }

        .onboarding-title {
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 900;
          color: #1A1A1A;
          line-height: 1.3;
          margin-bottom: 0.6rem;
        }

        .onboarding-title span {
          color: #F97316;
        }

        .onboarding-sub {
          font-size: clamp(13px, 2vw, 15px);
          color: #6B7280;
          max-width: 440px;
          margin: 0 auto;
          line-height: 1.7;
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

        /* Card */
        .portal-card {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 2rem 1.75rem 1.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 2px 24px rgba(249,115,22,0.08), 0 1px 4px rgba(0,0,0,0.05);
          border: 1.5px solid #FDE8D4;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          position: relative;
          overflow: hidden;
        }

        .portal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #F97316, #FDBA74);
          border-radius: 20px 20px 0 0;
        }

        .portal-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 40px rgba(249,115,22,0.14), 0 2px 8px rgba(0,0,0,0.06);
        }

        .portal-card-tag {
          display: inline-block;
          background: #FFF3E8;
          color: #EA580C;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 99px;
          margin-bottom: 1.1rem;
          border: 1px solid #FED7AA;
        }

        .portal-card-illustration {
          width: 160px;
          height: 145px;
          margin-bottom: 1.3rem;
          border-radius: 16px;
          background: #FFF8F3;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
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
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .portal-card-desc {
          font-size: 13px;
          color: #6B7280;
          line-height: 1.7;
          margin-bottom: 1.4rem;
          min-height: 40px;
        }

        .portal-card-actions {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .portal-btn-primary {
          width: 100%;
          padding: 12px 16px;
          background: #F97316;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'Tajawal', sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s, transform 0.12s;
          box-shadow: 0 4px 14px rgba(249,115,22,0.3);
        }

        .portal-btn-primary:hover {
          background: #EA6D0E;
          transform: scale(1.02);
        }

        .portal-btn-primary:active {
          transform: scale(0.98);
        }

        .portal-btn-ghost {
          width: 100%;
          padding: 11px 16px;
          background: transparent;
          color: #374151;
          border: 1.5px solid #E5E7EB;
          border-radius: 12px;
          font-family: 'Tajawal', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.18s, color 0.18s, background 0.18s;
        }

        .portal-btn-ghost:hover {
          border-color: #F97316;
          color: #F97316;
          background: #FFF8F3;
        }

        /* Footer dots */
        .onboarding-footer {
          margin-top: 2rem;
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
          z-index: 1;
        }

        .onboarding-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #FDBA74;
        }

        .onboarding-dot-active {
          width: 20px;
          border-radius: 3px;
          background: #F97316;
        }

        /* Animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .onboarding-header { animation: fadeUp 0.45s ease both; }
        .portal-card:nth-child(1) { animation: fadeUp 0.45s 0.1s ease both; }
        .portal-card:nth-child(2) { animation: fadeUp 0.45s 0.2s ease both; }
      `}</style>

      <div className="onboarding-root">
        {/* Header */}
        <div className="onboarding-header">
          <span className="onboarding-eyebrow">بوابة غزة 🇵🇸</span>
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