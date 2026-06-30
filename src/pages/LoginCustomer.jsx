import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { useGoogleLogin } from '@react-oauth/google'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { customerGoogleLogin, customerGoogleRegister } from '../services/authService'

function GoogleBtn({ onSuccess, onError }) {
  const login = useGoogleLogin({ onSuccess, onError })

  return (
    <button onClick={() => login()} style={{
      width: '100%', padding: '12px',
      border: '1.5px solid #E5E7EB', borderRadius: '12px',
      background: '#fff', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '10px', fontSize: '14px',
      fontFamily: 'Tajawal, sans-serif', fontWeight: '600',
      color: '#374151', cursor: 'pointer', marginBottom: '1.25rem',
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      المتابعة باستخدام Google
    </button>
  )
}

export default function LoginCustomer() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      const data = await authAPI.customerLogin({ email: values.email, password: values.password })
      const token = data.data?.token || data.token
      if (token) localStorage.setItem('token', token)
      navigate('/home/customer')
    } catch (err) {
      setApiError(err.response?.data?.data?.message || err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

const handleGoogleSuccess = async (tokenResponse) => {
  setApiError('')
  try {
    const data = await customerGoogleLogin(tokenResponse.access_token)
    const token = data.data?.token || data.token
    if (token) localStorage.setItem('token', token)
    navigate('/home/customer')
  } catch {
    try {
      const data = await customerGoogleRegister(tokenResponse.access_token)
      const token = data.data?.token || data.token
      if (token) localStorage.setItem('token', token)
      navigate('/home/customer')
    } catch (err) {
      setApiError(err.message || 'فشل تسجيل الدخول بجوجل')
    }
  }
}

  return (
    <FormCard>
      <CardHeader icon={<>🏪 <span>يا هلا بعودتك!</span> 😄</>} subtitle="تسوق من حيث توقفت" />
      <Formik initialValues={{ email: '', password: '' }} validationSchema={loginSchema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={apiError} />
            <InputField name="email" type="email" label="البريد الإلكتروني" placeholder="Store@gmail.com" icon="email" />
            <InputField name="password" type="password" label="كلمة المرور" placeholder="••••••••" icon="password" />
            <RememberRow />
            <PrimaryBtn loading={isSubmitting}>تسجيل دخول</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <Divider />
     <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
  <GoogleBtn
  onSuccess={handleGoogleSuccess}
  onError={() => setApiError('فشل تسجيل الدخول بجوجل')}
/>
</div>
      <FooterLink text="ليس لديك حساب؟" linkText="إنشاء حسابي" to="/register/customer" />
    </FormCard>
  )
}