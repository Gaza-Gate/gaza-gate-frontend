import { useEffect, useState } from "react"

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
    <div
  className="bg-white rounded-2xl text-center relative transition-all duration-700"
  style={{ 
    opacity: show ? 1 : 0, 
    transform: show ? "translateX(0)" : "translateX(30px)",
    width: "500px",
    padding: "60px 50px"
  }}
>
      {!isLast && (
        <button onClick={onSkip} className="absolute top-4 left-4 text-sm text-gray-400 hover:text-gray-600">
          تخطي ›
        </button>
      )}

      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon size={36} color="#e07820" />
      </div>

      <span className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-full mb-3 inline-block">
        {step.badge}
      </span>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h2>
      <p className="text-sm text-gray-400 leading-relaxed mb-6">{step.desc}</p>

      <div className="flex gap-2 justify-center mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "bg-orange-500 w-5" : "bg-orange-200 w-2"
            }`}
          />
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition"
      >
        {isLast ? "يلا" : "التالي"}
      </button>
    </div>
  )
}