import { useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'

export default function GoogleBtn({ onSuccess, onError, loading = false }) {
  useEffect(() => {
    // نمنع جوجل من تسجيل الدخول تلقائياً بحساب محفوظ من قبل (FedCM / One Tap auto-select)
    // هيك نضمن إنه كل ضغطة على الزر تفتح فعلياً قائمة اختيار الحساب
    window.google?.accounts?.id?.disableAutoSelect?.()
  }, [])

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
          background: 'rgba(255,255,255,0.75)',
          borderRadius: '12px',
          fontFamily: "'Tajawal', sans-serif",
          fontSize: 14,
          color: '#374151',
          fontWeight: 600,
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