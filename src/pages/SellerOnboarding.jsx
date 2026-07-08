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

export default function SellerOnboarding() {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

const handleNext = () => {
  if (current < steps.length - 1) setCurrent(current + 1)
   else navigate("/register/seller")
}

  const handleSkip = () => navigate("/register/seller")

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