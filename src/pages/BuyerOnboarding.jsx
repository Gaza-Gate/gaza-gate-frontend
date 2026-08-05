import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingStep from '../components/OnboardingStep'
import { MapPin, ShieldCheck, ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const steps = [
  {
    badge: 'توصيل سريع',
    title: 'وصول لبابك',
    desc: 'اطلب من متاجر قريبة واستلم أسرع وبتكلفة أقل.',
    icon: MapPin,
  },
  {
    badge: 'ضمان الجودة',
    title: 'بائعون موثقون',
    desc: 'كل بائع يمر بمراجعة دقيقة. قيّم تجربتك وساهم في رفع جودة المنصة.',
    icon: ShieldCheck,
  },
  {
    badge: 'للمشترين',
    title: 'تسوق من بيتك',
    desc: 'ابحث عن بائعين قريبين منك وقلل تكلفة التوصيل. تتبع طلبك لحظة بلحظة.',
    icon: ShoppingCart,
  },
]

export default function BuyerOnboarding() {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()
  const { isAuthenticated, isBootstrapping, currentRole } = useAuth()

  // ✅ لو في session → نتجاوز الـ onboarding على طول
  useEffect(() => {
    if (isBootstrapping) return
    if (!isAuthenticated) return
    if (currentRole === 'seller') {
      navigate('/seller/dashboard', { replace: true })
    } else {
      navigate('/home/customer', { replace: true })
    }
  }, [isAuthenticated, isBootstrapping, currentRole, navigate])

  const handleNext = () => {
    if (current < steps.length - 1) setCurrent(current + 1)
    else navigate('/register/customer')
  }

  const handleSkip = () => navigate('/register/customer')

  return (
    <div
      className="onb-step-root"
      dir="rtl"
    >
      <OnboardingStep
        step={steps[current]}
        current={current}
        total={steps.length}
        onNext={handleNext}
        onSkip={handleSkip}
      />

      {/* ستايل محلي — خلفية متجاوبة مع الثيم */}
      <style>{`
        .onb-step-root {
          min-height: 100vh;
          background: var(--bg-page);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'Tajawal', sans-serif;
          transition: background-color 0.3s ease;
        }
      `}</style>
    </div>
  )
}
