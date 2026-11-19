import { useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useTheme } from '../hooks/useTheme.jsx'

/**
 * ✅ زر تسجيل الدخول عبر جوجل — متجاوب مع الثيم الحالي.
 *    - light → overlay أبيض شفاف
 *    - dark  → overlay كحلي شفاف
 */
export default function GoogleBtn({ onSuccess, onError, loading = false }) {
  const { isDark } = useTheme()

  useEffect(() => {
    // نمنع جوجل من تسجيل الدخول تلقائياً بحساب محفوظ من قبل (FedCM / One Tap auto-select)
    // هيك نضمن إنه كل ضغطة على الزر تفتح فعلياً قائمة اختيار الحساب
    window.google?.accounts?.id?.disableAutoSelect?.()
  }, [])

  const overlayBg = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255,255,255,0.75)'
  const overlayColor = isDark ? '#f1f5f9' : '#374151'

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '1.25rem',
      width: '100%',
      position: 'relative',
    }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: overlayBg,
          borderRadius: '12px',
          fontFamily: "'Tajawal', sans-serif",
          fontSize: 14,
          color: overlayColor,
          fontWeight: 600,
          transition: 'background 0.3s ease, color 0.3s ease',
        }}>
          جاري المعالجة...
        </div>
      )}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        overflow: 'hidden',
        borderRadius: '12px',
        opacity: loading ? 0.65 : 1,
        pointerEvents: loading ? 'none' : 'auto',
      }}>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          text="continue_with"
          locale="ar"
          theme="outline"
          size="large"
          width="400"
          auto_select={false}
          useOneTap={false}
        />
      </div>
    </div>
  )
}
