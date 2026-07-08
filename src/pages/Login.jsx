import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { resolveSellerGoogleLogin } from '../utils/googleAuth'
import { extractToken, extractUser, saveSellerSession } from '../utils/authSession'
import GoogleBtn from '../components/GoogleBtn'

export default function LoginSeller() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')
  const [remember, setRemember] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      const res = await authAPI.sellerLogin({ email: values.email, password: values.password })
      const token = extractToken(res.data)
      const user = extractUser(res.data)
      if (!token) throw new Error('لم يتم استلام رمز الدخول')
      saveSellerSession(token, user, remember)
      navigate('/seller/dashboard')
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setApiError('')
    setGoogleLoading(true)
    try {
      const result = await resolveSellerGoogleLogin(credentialResponse.credential, remember)

      if (result.mode === 'login') {
        navigate('/seller/dashboard')
        return
      }

      navigate('/register/seller', {
        state: {
          fromGoogleLogin: true,
          pendingToken: result.pendingToken,
          initialValues: result.initialValues,
        },
      })
    } catch (err) {
      setApiError(err.message || 'فشل تسجيل الدخول بجوجل')
    } finally {
      setGoogleLoading(false)
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
            <RememberRow userType="seller" remember={remember} onRememberChange={setRemember} />
            <PrimaryBtn loading={isSubmitting}>تسجيل دخول</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <Divider />
      <GoogleBtn
        loading={googleLoading}
        onSuccess={handleGoogleSuccess}
        onError={() => setApiError('فشل تسجيل الدخول بجوجل')}
      />
      <FooterLink text="ليس عندك حساب؟" linkText="إنشاء حسابي" to="/register/seller" />
    </FormCard>
  )
}
