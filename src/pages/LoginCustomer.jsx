import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { ArrowRight } from 'lucide-react'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { authenticateCustomerWithGoogle } from '../utils/googleAuth'
import { extractToken, extractUser } from '../utils/authSession'
import { useAuth } from '../context/AuthContext'
import GoogleBtn from '../components/GoogleBtn'

export default function LoginCustomer() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [apiError, setApiError] = useState('')
  const [remember, setRemember] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      // authAPI.customerLogin بيرجّع Axios response، res.data هو الـ body
      const res = await authAPI.customerLogin({ email: values.email, password: values.password })
      const token = extractToken(res.data)
      const user = extractUser(res.data)
      if (!token || !user) throw new Error('استجابة الخادم غير مكتملة')

      // ✅ مرّر user + accessToken للـ login() — React state و localStorage
      //    ينحدّثوا فوراً، والـ UI يتفاعل بدون reload
      login({ user, accessToken: token })

      navigate('/home/customer')
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setApiError('')
    setGoogleLoading(true)
    try {
      // الـ helper الآن بيرجّع user + accessToken (شوف googleAuth.js)
      const result = await authenticateCustomerWithGoogle(credentialResponse.credential, remember)

      // ✅ login() صار يستقبل user + accessToken بشكل صريح
      if (result.user && result.accessToken) {
        login({ user: result.user, accessToken: result.accessToken })
      }

      navigate('/home/customer')
    } catch (err) {
      setApiError(err.message || 'فشل تسجيل الدخول بجوجل')
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
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          حساب مشتري
        </span>
      </div>

      <CardHeader icon={<> <span>يا هلا بعودتك!</span> </>} subtitle="تسوق من حيث توقفت" />
      <Formik initialValues={{ email: '', password: '' }} validationSchema={loginSchema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={apiError} />
            <InputField name="email" type="email" label="البريد الإلكتروني" placeholder="name@gmail.com" icon="email" />
            <InputField name="password" type="password" label="كلمة المرور" placeholder="••••••••" icon="password" />
            <RememberRow userType="customer" remember={remember} onRememberChange={setRemember} />
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
      <FooterLink text="ليس لديك حساب؟" linkText="إنشاء حسابي" to="/register/customer" />
    </FormCard>
  )
}
