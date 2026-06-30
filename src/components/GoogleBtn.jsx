import { GoogleLogin } from '@react-oauth/google'

export default function GoogleBtn({ onSuccess, onError }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '1.25rem',
      width: '100%',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        /* نخفي overflow عشان GoogleLogin ما يتجاوز الحدود */
        overflow: 'hidden',
        borderRadius: '12px',
      }}>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          text="continue_with"
          locale="ar"
          theme="outline"
          size="large"
          width="400"
        />
      </div>
    </div>
  )
}