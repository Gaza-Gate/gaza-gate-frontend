import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingStep from '../components/OnboardingStep'
import { MapPin, ShieldCheck, ShoppingCart } from 'lucide-react'

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

  const handleNext = () => {
    if (current < steps.length - 1) setCurrent(current + 1)
    else navigate('/register/customer')
  }

  const handleSkip = () => navigate('/register/customer')

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