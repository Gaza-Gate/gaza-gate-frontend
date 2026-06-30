import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { sellerGoogleLogin } from '../services/authService'
import GoogleBtn from '../components/GoogleBtn'

export default function LoginSeller() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      const res = await authAPI.sellerLogin({ email: values.email, password: values.password })
      const { accessToken, user } = res.data.data
      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('userType', 'seller')
      navigate('/seller/dashboard')
    } catch (err) {
      setApiError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const res = await sellerGoogleLogin(credentialResponse.credential)
      const { accessToken, user } = res.data
      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('userType', 'seller')
      navigate('/seller/dashboard')
    } catch (err) {
      setApiError(err.message || 'فشل تسجيل الدخول بجوجل')
    }
  }

  return (
    <FormCard>
      <CardHeader icon={<>🏪 مرحباً بك من جديد 👋</>} subtitle="ادخل بياناتك للوصول للوحة التحكم" />
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
      <GoogleBtn
        onSuccess={handleGoogleSuccess}
        onError={() => setApiError('فشل تسجيل الدخول بجوجل')}
      />
      <FooterLink text="ليس عندك حساب؟" linkText="إنشاء حسابي" to="/register/seller" />
    </FormCard>
  )
}