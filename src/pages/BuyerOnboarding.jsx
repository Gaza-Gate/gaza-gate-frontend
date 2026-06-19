import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ---- أيقونات السلايدر (مكونة من Stroke SVG بسيطة بلون البراند) ----
function PinIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  )
}

// ---- بيانات الشرائح الثلاث ----
const slides = [
  {
    Icon: PinIcon,
    badge: 'توصيل سريع',
    title: 'وصول لبابك',
    desc: 'اطلب من متاجر قريبة واستلم أسرع وبتكلفة أقل.',
  },
  {
    Icon: ShieldIcon,
    badge: 'ضمان الجودة',
    title: 'بائعون موثقون',
    desc: 'كل بائع يمر بمراجعة دقيقة. قيّم تجربتك وساهم في رفع جودة المنصة.',
  },
  {
    Icon: CartIcon,
    badge: 'للمشترين',
    title: 'تسوق من بيتك',
    desc: 'ابحث عن بائعين قريبين منك وقلل تكلفة التوصيل. تتبع طلبك لحظة بلحظة.',
  },
]

export default function BuyerOnboarding() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const isLast = step === slides.length - 1
  const { Icon, badge, title, desc } = slides[step]

  function goToRegister() {
    navigate('/register/customer')
  }

  function handleNext() {
    if (isLast) goToRegister()
    else setStep(s => s + 1)
  }

  return (
    <div>
    

      <div
        style={{
          background: 'var(--orange-light)',
          minHeight: 'calc(100vh)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
        }}
      >
        <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
          <button
            onClick={goToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-mid)',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            تخطي ←
          </button>
        </div>

        <div
          key={step}
          className="fade-up"
          style={{
            background: '#fff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '2.5rem 2rem',
            width: '100%',
            maxWidth: 420,
            margin: '0 auto',
            textAlign: 'center',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon />

          <span
            style={{
              display: 'inline-block',
              background: 'var(--orange-pale)',
              color: 'var(--orange)',
              fontSize: 13,
              fontWeight: 700,
              padding: '6px 16px',
              borderRadius: 999,
              margin: '1.25rem 0 1rem',
            }}
          >
            {badge}
          </span>

          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: '.75rem' }}>{title}</h2>

          <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.7, marginBottom: '1.5rem', maxWidth: 320 }}>
            {desc}
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: '2rem' }}>
            {slides.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === step ? 'var(--orange)' : '#E5E5E5',
                  transition: 'background var(--transition)',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            style={{
              width: '100%',
              padding: 14,
              background: 'var(--orange)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontFamily: "'Tajawal', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-btn)',
            }}
          >
            {isLast ? 'ابدأ' : 'التالي'}
          </button>
        </div>
      </div>
    </div>
  )
}