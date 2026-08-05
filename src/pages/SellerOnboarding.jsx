import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import OnboardingStep from "../components/OnboardingStep"
import { Store, TrendingUp, Users } from "lucide-react"
import { useAuth } from "../context/AuthContext"

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
  const { isAuthenticated, isBootstrapping, currentRole } = useAuth()

  // ✅ لو في session → نتجاوز الـ onboarding على طول
  useEffect(() => {
    if (isBootstrapping) return
    if (!isAuthenticated) return
    if (currentRole === 'seller') {
      navigate("/seller/dashboard", { replace: true })
    } else {
      navigate("/home/customer", { replace: true })
    }
  }, [isAuthenticated, isBootstrapping, currentRole, navigate])

  const handleNext = () => {
    if (current < steps.length - 1) setCurrent(current + 1)
    else navigate("/register/seller")
  }

  const handleSkip = () => navigate("/register/seller")

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
