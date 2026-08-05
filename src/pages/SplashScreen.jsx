import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
// ✅ اللوغو الرسمي الأصلي — نفس النسخة للنهاري والليلي (بدون نسخة dark)
import logo from '../assets/logo.png'

/**
 * SplashScreen — شاشة ترحيبية تظهر فور فتح التطبيق.
 *
 * ✅ اللوغو الأصلي يظهر في منتصف الشاشة (logo.png للنهاري والليلي).
 * ✅ الخلفية متغيّرة بحسب الثيم: `var(--bg-page)` (كحلي في الوضع الداكن، فاتح في النهاري).
 * ✅ الموجة المتحركة في الخلفية (body::before/::after من index.css) تتغيّر مع الثيم.
 *
 * ✅ لو في session صالح بـ localStorage → نختصر الـ splash
 *    ونحوّل المستخدم على طول للـ dashboard/home بدل ما يستنى ثانيتين.
 *    لو الـ session لسة ما اتحقّق (isBootstrapping=true) → ننتظر حتى
 *    يخلص التحقق قبل ما نقرر (عشان ما نحوّل على أساس state قديم).
 */
export default function SplashScreen() {
  const navigate = useNavigate()
  const { isAuthenticated, isBootstrapping, currentRole } = useAuth()

  useEffect(() => {
    // ✅ لو لسه بنتحقق من الـ session، ما نقرر شي — ننتظر
    if (isBootstrapping) return

    if (isAuthenticated) {
      // ✅ اختصر الـ splash — المستخدم مسجّل، نودّيه على طول
      if (currentRole === 'seller') {
        navigate('/seller/dashboard', { replace: true })
      } else {
        navigate('/home/customer', { replace: true })
      }
      return
    }

    // ✅ ما في session — splash عادي ثانيتين وبعدين onboarding
    const timer = setTimeout(() => {
      navigate('/onboarding')
    }, 2000)

    return () => clearTimeout(timer)
  }, [navigate, isAuthenticated, isBootstrapping, currentRole])

  return (
    <div
      style={{
        background: 'var(--bg-page)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* لمسة برتقالية خفيفة في الخلفية — لإحساس الـ "wave" (محايدة للثيم) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(249,115,22,0.12) 0%, transparent 70%)',
        }}
      />

      {/* ✅ اللوغو الرسمي — نسخة وحدة للنهاري والليلي بدون أي glow أو shadow */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          animation: 'splashFade 0.6s ease both',
        }}
      >
        <img
          src={logo}
          alt="Gaza Gate"
          style={{
            width: 'clamp(120px, 22vw, 160px)',
            height: 'auto',
            display: 'block',
            background: 'transparent',
            boxShadow: 'none',
            filter: 'none',
          }}
        />
      </div>

      {/* keyframes محلية — fade فقط */}
      <style>{`
        @keyframes splashFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
