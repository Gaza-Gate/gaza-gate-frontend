import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FormCard, CardHeader, PrimaryBtn, ApiError } from '../components/FormCard'
import { verifyEmail, resendVerificationCode } from '../services/authService'

export default function VerifyOTP() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const resendInFlight = useRef(false) // ✅ يمنع تكرار طلب resend بسبب StrictMode أو ضغطات سريعة

  useEffect(() => {
    if (countdown === 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) document.getElementById(`votp-${idx + 1}`)?.focus()
  }

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0)
      document.getElementById(`votp-${idx - 1}`)?.focus()
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    const next = [...otp]
    text.split('').forEach((ch, i) => { next[i] = ch })
    setOtp(next)
    document.getElementById(`votp-${Math.min(text.length, 5)}`)?.focus()
    e.preventDefault()
  }

  async function handleResend() {
    if (!canResend || resendInFlight.current) return // ✅ حماية مزدوجة
    resendInFlight.current = true
    setResendMsg('')
    setApiError('')
    try {
      await resendVerificationCode(email)
      setResendMsg('✅ تم إعادة إرسال الرمز، استخدم آخر رمز وصلك')
      setOtp(['', '', '', '', '', '']) // ✅ صفّر الحقول لأن الكود القديم صار غير صالح
      document.getElementById('votp-0')?.focus()
      setCountdown(60)
      setCanResend(false)
    } catch (err) {
      setApiError(err.message)
    } finally {
      resendInFlight.current = false
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (otp.some((d) => !d)) { setApiError('أدخل الرمز كاملاً'); return }
    setApiError('')
    setLoading(true)
    try {
      await verifyEmail(email, otp.join(''))
      navigate('/login/customer', { state: { verified: true } })
    } catch (err) {
      // ✅ عرض الرسالة الحقيقية القادمة من السيرفر بدل رسالة عامة دايماً
      const msg = err.message || 'حدث خطأ، حاول مرة ثانية'
      setApiError(msg)

      // لو الرمز غير صحيح/منتهي، صفّر الحقول ليعيد الكتابة بسهولة
      if (msg.includes('غير صحيح') || msg.includes('منتهي') || msg.includes('invalid') || msg.includes('expired')) {
        setOtp(['', '', '', '', '', ''])
        document.getElementById('votp-0')?.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormCard>
      <CardHeader icon="📬" subtitle={`أرسلنا رمزاً إلى ${email}`} />

      <form onSubmit={handleSubmit} noValidate>
        <ApiError message={apiError} />

        {resendMsg && (
          <p style={{ fontSize: 13, color: '#16A34A', marginBottom: '1rem', textAlign: 'center' }}>
            {resendMsg}
          </p>
        )}

        <div
          onPaste={handlePaste}
          style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', direction: 'ltr', marginBottom: '1.25rem' }}
        >
          {otp.map((d, i) => (
            <input
              key={i}
              id={`votp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              autoFocus={i === 0}
              style={{
                width: 48,
                height: 52,
                border: `1.5px solid ${apiError ? '#EF4444' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '1.3rem',
                fontWeight: 700,
                textAlign: 'center',
                color: 'var(--text-dark)',
                outline: 'none',
                fontFamily: "'Tajawal', sans-serif",
                transition: 'border-color var(--transition), box-shadow var(--transition)',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--orange)'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,.12)' }}
              onBlur={(e) => { e.target.style.borderColor = apiError ? '#EF4444' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          ))}
        </div>

        <PrimaryBtn loading={loading}>تأكيد الرمز</PrimaryBtn>
      </form>

      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--orange)',
            fontWeight: 600,
            cursor: canResend ? 'pointer' : 'default',
            opacity: canResend ? 1 : 0.5,
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 13,
          }}
        >
          {canResend ? 'ما وصلك الرمز؟ أعد الإرسال' : `إعادة الإرسال بعد ${countdown} ثانية`}
        </button>
      </div>
    </FormCard>
  )
}