import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { GoogleLogin } from '@react-oauth/google'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { customerGoogleLogin, customerGoogleRegister } from '../services/authService'

export default function LoginCustomer() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  const location = useLocation();
const token = location.state?.googleIdToken;

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

  const handleGoogleSuccess = async (credentialResponse) => {
    setApiError('')
    const googleIdToken = credentialResponse.credential
    try {
      // حاول login أولاً
      const data = await customerGoogleLogin(googleIdToken)
      const token = data.data?.token || data.token
      if (token) localStorage.setItem('token', token)
      navigate('/home/customer')
    } catch {
      // إذا فشل → المستخدم جديد، سجّله تلقائياً
      try {
        const data = await customerGoogleRegister(googleIdToken)
        const token = data.data?.token || data.token
        if (token) localStorage.setItem('token', token)
        navigate('/register/customer')
      } catch (err) {
        setApiError(err.message || 'فشل تسجيل الدخول بجوجل')
        navigate('/register/customer', { state: { googleIdToken } });
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
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setApiError('فشل تسجيل الدخول بجوجل')}
          text="continue_with"
          locale="ar"
          width="400"
        />
      </div>
      <FooterLink text="ليس لديك حساب؟" linkText="إنشاء حسابي" to="/register/customer" />
    </FormCard>
  )
}