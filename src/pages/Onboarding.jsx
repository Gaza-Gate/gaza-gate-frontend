<<<<<<< HEAD
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
          title="بوابة البائع"
          description="أدر منتجاتك، تتبع مبيعاتك، ونمّ عملك."
          illustration={<SellerIllustration />}
          fillLabel="أنشئ متجري"
          outlineLabel="تسجيل دخول"
          onFill={() => navigate('/register/seller')}
          onOutline={() => navigate('/login/seller')}
        />
        <PortalCard
          title="بوابة المشتري"
          description="تسوق، تتبع طلباتك، وتواصل مع البائعين."
          illustration={<BuyerIllustration />}
          fillLabel="أنشئ حسابي"
          outlineLabel="تسجيل دخول"
          onFill={() => navigate('/register/customer')}
          onOutline={() => navigate('/login/customer')}
        />
      </div>
      <style>{`@media(max-width:600px){.onboarding-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  )
}
=======
 import { useState } from "react"
import { useNavigate } from "react-router-dom"
import OnboardingStep from "../components/OnboardingStep";
import { Store, TrendingUp, Users } from "lucide-react"

const steps = [
  {
    badge: "بائع",
    title: "بيتك متجرك",
    desc: "حول خبرتك إلى متجر رقمي يصل لزبائن في كل مكان.",
    icon: Store,
  },
  {
    badge: "داشبورد",
    title: "تحكّم بمبيعاتك",
    desc: "لوحة تحكم بسيطة لإدارة طلباتك ومنتجاتك وأرباحك في مكان واحد.",
    icon: TrendingUp,
  },
  {
    badge: "مجتمع",
    title: "مع مجتمعك",
    desc: "انضم لآلاف البائعين الناجحين في منطقتك وابدأ رحلتك.",
    icon: Users,
  },
]

export default function Onboarding() {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

  const handleNext = () => {
    if (current < steps.length - 1) setCurrent(current + 1)
     else navigate("/login") // أو أي صفحة بعد الأونبوردينج
  }

   const handleSkip = () => navigate("/login")

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6" dir="rtl">
      <OnboardingStep
        step={steps[current]}
        current={current}
        total={steps.length}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    </div>
  )
}
>>>>>>> 8bf8847a9bc241688e56f5486eae3cc236a004d0
