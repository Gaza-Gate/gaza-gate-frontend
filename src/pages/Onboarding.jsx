 import { useNavigate } from 'react-router-dom'
import SellerIllustration from '../assets/SellerIllustration'
import BuyerIllustration from '../assets/BuyerIllustration'

function PortalCard({ title, description, illustration, fillLabel, outlineLabel, onFill, onOutline }) {
  return (
    <div style={{ background: 'var(--orange-pale)', borderRadius: 'var(--radius-lg)', padding: '2rem 1.5rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: 180, height: 155, marginBottom: '1.25rem' }}>
        {illustration}
      </div>
      <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: '.4rem', textDecoration: 'underline', textUnderlineOffset: 3 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: '1.25rem', lineHeight: 1.6 }}>{description}</p>
      <div style={{ width: '100%' }}>
        <button onClick={onFill} style={{ display: 'block', width: '100%', padding: 12, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: "'Tajawal', sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8, boxShadow: 'var(--shadow-btn)' }}>
          {fillLabel}
        </button>
        <button onClick={onOutline} style={{ display: 'block', width: '100%', padding: '11px', background: 'transparent', color: 'var(--text-dark)', border: '1.5px solid rgba(0,0,0,.15)', borderRadius: 'var(--radius-sm)', fontFamily: "'Tajawal', sans-serif", fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
          {outlineLabel}
        </button>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
      <h1 className="fade-up" style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: '2rem' }}>
        أهلا بك في منصة بوابة غزة
      </h1>
      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', width: '100%', maxWidth: 800 }}>
          <PortalCard  
        title="بوابة المشتري"
        showUnderline={true}
         description="تسوق، تتبع طلباتك، وتواصل مع البائعين."
        illustration={<SellerIllustration />}
        fillLabel="أنشئ متجري"
        outlineLabel="تسجيل دخول"
        onFill={() => navigate('/onboarding/customer')}
       onOutline={() => navigate('/Login/customer')}
      />
            <PortalCard
        title ="بوابة البائع"
        description="أدر منتجاتك، تتبع مبيعاتك، ونمّ عملك."
         illustration={<BuyerIllustration />}
        fillLabel="أنشئ حسابي"
        outlineLabel="تسجيل دخول"
        onFill={() => navigate('/seller/onboarding')}
        onOutline={() => navigate('/login/seller')}
      />
      </div>
      <style>{`@media(max-width:600px){.onboarding-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  )
}