import { Link } from "react-router-dom";

export function FormCard({ children }) {
  return (
    <div style={{ background: 'var(--orange-light)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="fade-up" style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: '2.5rem 2rem', width: '100%', maxWidth: 480 }}>
        {children}
      </div>
    </div>
  )
}

export function CardHeader({ icon, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
      <div style={{ fontSize: 26, marginBottom: '.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{icon}</div>
      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
  )
}

export function PrimaryBtn({ children, loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        display: 'block', width: '100%', padding: 13,
        background: loading ? '#FBA96A' : 'var(--orange)',
        color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
        fontFamily: "'Tajawal', sans-serif", fontSize: 16, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: 'var(--shadow-btn)', transition: 'background .2s, transform .2s',
        textAlign: 'center', marginBottom: '1.25rem',
      }}
    >
      {loading ? 'جاري التحميل...' : children}
    </button>
  )
}

export function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: 13 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} /> أو <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

export function FooterLink({ text, linkText, to }) {
  return (
    <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
      {text}{' '}
      <Link to={to} style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>{linkText}</Link>
    </div>
  )
}

export function RememberRow({ userType = 'seller', remember = false, onRememberChange }) {
  const forgotPath = userType === 'customer' ? '/forgot-password?role=customer' : '/forgot-password'

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', fontSize: 13 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-mid)', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange?.(e.target.checked)}
          style={{ accentColor: 'var(--orange)', width: 15, height: 15 }}
        />
        تذكرني
      </label>
      <Link to={forgotPath} style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 500 }}>نسيت كلمة المرور؟</Link>
    </div>
  )
}

export function ApiError({ message }) {
  if (!message) return null
  return (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: '#B91C1C', textAlign: 'right' }}>
      {message}
    </div>
  )
}
