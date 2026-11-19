import { useEffect, useState } from "react"

/**
 * OnboardingStep — بطاقة خطوة الـ Onboarding (مشتري/بائع).
 *
 * ✅ متجاوبة مع الثيم الحالي:
 *    - light → بطاقة بيضاء + نص داكن + خلفية فاتحة.
 *    - dark  → بطاقة كحلية + نص أبيض + خلفية كحلية.
 *    البرتقالي يظل نفسه كهوية بصرية (الأيقونة + الـ badge + الزر + النقاط).
 */
export default function OnboardingStep({ step, current, total, onNext, onSkip }) {
  const Icon = step.icon
  const isLast = current === total - 1
  const [show, setShow] = useState(true)

  useEffect(() => {
    setShow(false)
    const t = setTimeout(() => setShow(true), 50)
    return () => clearTimeout(t)
  }, [current])

  return (
    <>
      <div
        className="onb-step-card"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translateX(0)" : "translateX(30px)",
          width: "500px",
          maxWidth: "100%",
          padding: "60px 50px",
        }}
      >
        {!isLast && (
          <button
            onClick={onSkip}
            className="onb-step-skip"
          >
            تخطي ›
          </button>
        )}

        <div className="onb-step-icon-wrap">
          <Icon size={36} color="#e07820" />
        </div>

        <span className="onb-step-badge">
          {step.badge}
        </span>

        <h2 className="onb-step-title">{step.title}</h2>
        <p className="onb-step-desc">{step.desc}</p>

        <div className="onb-step-dots">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`onb-step-dot ${i === current ? "onb-step-dot--active" : ""}`}
            />
          ))}
        </div>

        <button
          onClick={onNext}
          className="onb-step-btn"
        >
          {isLast ? "يلا" : "التالي"}
        </button>
      </div>

      <style>{`
        .onb-step-card {
          background: var(--bg-surface);
          color: var(--text-dark);
          border-radius: 1rem;
          text-align: center;
          position: relative;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--border);
          transition:
            opacity 0.7s,
            transform 0.7s,
            background-color 0.3s ease,
            color 0.3s ease,
            border-color 0.3s ease;
        }
        .dark .onb-step-card {
          background: var(--bg-surface);
          box-shadow: var(--shadow-card);
          border-color: var(--border);
        }

        .onb-step-skip {
          position: absolute;
          top: 1rem;
          left: 1rem;
          font-size: 0.875rem;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          font-family: 'Tajawal', sans-serif;
          transition: color 0.2s ease;
        }
        .onb-step-skip:hover { color: var(--text-mid); }

        .onb-step-icon-wrap {
          width: 5rem;
          height: 5rem;
          background: rgba(249, 115, 22, 0.12);
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }

        .onb-step-badge {
          font-size: 0.75rem;
          background: rgba(249, 115, 22, 0.12);
          color: #f97316;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          margin-bottom: 0.75rem;
          display: inline-block;
          font-weight: 600;
        }

        .onb-step-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 0.75rem;
          transition: color 0.3s ease;
        }

        .onb-step-desc {
          font-size: 0.875rem;
          color: var(--text-mid);
          line-height: 1.6;
          margin-bottom: 1.5rem;
          transition: color 0.3s ease;
        }

        .onb-step-dots {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .onb-step-dot {
          height: 0.5rem;
          border-radius: 9999px;
          background: rgba(249, 115, 22, 0.25);
          width: 0.5rem;
          transition: all 0.3s ease;
        }
        .onb-step-dot--active {
          background: #f97316;
          width: 1.25rem;
        }

        .onb-step-btn {
          width: 100%;
          background: linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%);
          color: #ffffff;
          font-weight: 600;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: none;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
          font-size: 1rem;
          box-shadow: 0 6px 18px rgba(249, 115, 22, 0.35);
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .onb-step-btn:hover {
          background: linear-gradient(135deg, #fdba74 0%, #fb923c 50%, #f97316 100%);
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(249, 115, 22, 0.5);
        }
        .onb-step-btn:active { transform: scale(0.98); }

        @media (max-width: 480px) {
          .onb-step-card { padding: 2.5rem 1.5rem !important; }
        }
      `}</style>
    </>
  )
}
