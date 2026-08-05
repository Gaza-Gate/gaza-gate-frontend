import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { ArrowRight } from 'lucide-react'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { resolveSellerGoogleLogin } from '../utils/googleAuth'
import { extractToken, extractUser } from '../utils/authSession'
import { useAuth } from '../context/AuthContext'
import GoogleBtn from '../components/GoogleBtn'

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isBootstrapping, hasSellerProfile } = useAuth()
  const [apiError, setApiError] = useState('')
  const [remember, setRemember] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)

  // ✅ لو في session صالح بـ localStorage (إعادة فتح/refresh/Vercel reload)
  //    بنحوّل البائع للوحة التحكم بدال ما يقدر يوصل لصفحة login.
  //    بنستنى الـ bootstrap عشان ما نعمل redirect بقرار مبني على state قديم.
  useEffect(() => {
    if (isBootstrapping) return
    if (isAuthenticated) {
      navigate(hasSellerProfile ? '/seller/dashboard' : '/seller/dashboard', { replace: true })
    }
  }, [isAuthenticated, isBootstrapping, hasSellerProfile, navigate])

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      const res = await authAPI.sellerLogin({ email: values.email, password: values.password })
      const token = extractToken(res.data)
      const user = extractUser(res.data)
      if (!token || !user) throw new Error('استجابة الخادم غير مكتملة')

      // ✅ مرّر user + accessToken للـ login() — React state و localStorage
      //    ينحدّثوا فوراً، بدون page reload
      login({ user, accessToken: token })

      navigate('/seller/dashboard')
    } catch (err) {
      setApiError(
        err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          'حدث خطأ، حاول مرة أخرى'
      )
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
        // ✅ login() صار يستقبل user + accessToken بشكل صريح
        if (result.user && result.accessToken) {
          login({ user: result.user, accessToken: result.accessToken })
        }
        navigate('/seller/dashboard')
        return
      }

      // حالة register: لسا ما في user كامل — بنوجّه لصفحة إكمال التسجيل
      navigate('/register/seller', {
        state: {
          fromGoogleLogin: true,
          pendingToken: result.pendingToken,
          initialValues: result.initialValues,
        },
      })
   } catch (err) {
      setApiError(
        err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          'فشل تسجيل الدخول بجوجل'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <FormCard>
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="رجوع"
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors mb-2"
      >
        <ArrowRight size={20} />
      </button>

      <div className="flex items-center justify-center gap-2 mb-3">
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: "rgba(249, 115, 22, 0.18)",
            color: "#fdba74",
            border: "1px solid rgba(249, 115, 22, 0.35)",
          }}
        >
          حساب بائع
        </span>
      </div>

      <CardHeader icon={<>  مرحباً بك من جديد  </>} subtitle="ادخل بياناتك للوصول للوحة التحكم" />
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
