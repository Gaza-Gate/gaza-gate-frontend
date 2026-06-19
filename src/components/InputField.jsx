import { useState } from 'react'
import { useField } from 'formik'

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const StoreIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const ICONS = { email: MailIcon, password: LockIcon, user: UserIcon, store: StoreIcon }

export default function InputField({ label, icon, textarea = false, ...props }) {
  const [field, meta] = useField(props)
  const [showPw, setShowPw] = useState(false)
  const isPassword = props.type === 'password'
  const hasError = meta.touched && meta.error
  const Icon = ICONS[icon]

  const inputStyle = {
    width: '100%',
    padding: isPassword ? '11px 40px 11px 40px' : (Icon ? '11px 40px 11px 12px' : '11px 12px'),
    border: `1.5px solid ${hasError ? '#EF4444' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    background: '#fff',
    color: 'var(--text-dark)',
    fontFamily: "'Tajawal', sans-serif",
    fontSize: 14,
    direction: 'rtl',
    outline: 'none',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
    resize: textarea ? 'vertical' : undefined,
    minHeight: textarea ? 80 : undefined,
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', marginBottom: 6, textAlign: 'right' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {textarea ? (
          <textarea
            {...field}
            {...props}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,.12)' }}
            onBlur={e => { field.onBlur(e); e.target.style.borderColor = hasError ? '#EF4444' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
          />
        ) : (
          <input
            {...field}
            {...props}
            type={isPassword && showPw ? 'text' : props.type}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,.12)' }}
            onBlur={e => { field.onBlur(e); e.target.style.borderColor = hasError ? '#EF4444' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
          />
        )}
        {Icon && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#bbb', pointerEvents: 'none', display: 'flex' }}>
            <Icon />
          </span>
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: showPw ? 'var(--orange)' : '#bbb', padding: 0, display: 'flex', alignItems: 'center' }}
            aria-label="إظهار/إخفاء كلمة المرور"
          >
            {showPw ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {hasError && (
        <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, textAlign: 'right' }}>{meta.error}</p>
      )}
    </div>
  )
}
