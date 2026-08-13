import { useState, useEffect, useReducer, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { ArrowRight } from 'lucide-react'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { customerGoogleLoginOnly } from '../utils/googleAuth'
import { extractToken, extractUser, isMissingAccountError } from '../utils/authSession'
import { useAuth } from '../context/AuthContext'
import { smartBack } from '../utils/smartBack'
import GoogleBtn from '../components/GoogleBtn'

// ────────────────────────────────────────────────────────────────────────────
// useReducer — atomic state updates لعمليتي الـ auth
// ────────────────────────────────────────────────────────────────────────────
// بدلاً من useState منفصلة لـ (formLoading, googleLoading, apiError):
//   1) أي تحديث "loading on" + "error clear" بيصير بـ dispatch واحد
//      → ما في render "نصفي" بيبين لحظة قصيرة بدون loading
//   2) switch واحد — أسهل للقراءة والـ reason-about
//   3) الـ children اللي تعتمد على isLoading بتعتمد على قيمة واحدة (mode)
const initialAuthState = { mode: 'idle', error: '' }

function authReducer(state, action) {
  switch (action.type) {
    case 'START_LOGIN':
      return { mode: 'login', error: '' }
    case 'START_GOOGLE':
      return { mode: 'google', error: '' }
    case 'ERROR':
      return { mode: 'idle', error: action.error }
    case 'CLEAR_ERROR':
      return { ...state, error: '' }
    default:
      return state
  }
}

export default function LoginCustomer() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isBootstrapping, currentRole } = useAuth()
  const [authState, dispatch] = useReducer(authReducer, initialAuthState)
  // تذكرني — local state لأزرار الـ UI (checkbox)
  const [remember, setRemember] = useState(true)

  // ── mounted ref — يمنع setState على unmounted component (cleanup آمن) ──
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ── derived values بـ useMemo — يتجنّب إعادة الحساب على كل render ──
  const isLoginSubmitting = useMemo(() => authState.mode === 'login', [authState.mode])
  const isGoogleLoading = useMemo(() => authState.mode === 'google', [authState.mode])

  // ── لو في session صالح → redirect فوري (السلوك الأصلي محفوظ) ──
  useEffect(() => {
    if (isBootstrapping) return
    if (!isAuthenticated) return
    if (currentRole === 'seller') {
      navigate('/seller/dashboard', { replace: true })
    } else {
      navigate('/home/customer', { replace: true })
    }
  }, [isAuthenticated, isBootstrapping, currentRole, navigate])

  // ── useCallback — stable refs للـ handlers (مهم لـ React.memo على الأطفال) ──
  const handleRememberChange = useCallback((value) => setRemember(value), [])

  // ── Login بالبريد/كلمة السر ──
  //   • Axios call مباشر: instance مع withCredentials → الكوكي (refreshToken)
  //     بيُرسل تلقائياً. ما في headers إضافية ولا localStorage reads.
  //   • الاستجابة موحّدة بـ extractToken/extractUser (يتعامل مع data.data و data).
  //   • Error chain: يقرأ أول رسالة متاحة (الباك يرجعها بـ data.data.message غالباً).
  const handleSubmit = useCallback(async (values, { setSubmitting }) => {
    dispatch({ type: 'START_LOGIN' })
    try {
      const res = await authAPI.customerLogin({
        email: values.email,
        password: values.password,
      })
      const token = extractToken(res.data)
      const user = extractUser(res.data)
      if (!token || !user) throw new Error('استجابة الخادم غير مكتملة')

      // React state + localStorage ينحدّثوا فوراً بدون reload
      login({ user, accessToken: token })
      navigate('/home/customer')
    } catch (err) {
      if (!mountedRef.current) return
      dispatch({
        type: 'ERROR',
        error:
          err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          'حدث خطأ، حاول مرة أخرى',
      })
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }, [login, navigate])

  // ── Google Login ──
  //   السلوك الحالي:
  //   1) نحاول login فقط (مش login + register تلقائي).
  //   2) لو الباك رجّع 404 / "not found" → الحساب مش موجود
  //      → نعرض رسالة واضحة في نفس الصفحة (بدون أي redirect تلقائي)
  //      → المستخدم يقدر ينقر يدوياً على "إنشاء حسابي" بالأسفل إذا حبّ.
  //      → عند أي محاولة جديدة أو تحديث للصفحة، الرسالة بتختفي تلقائياً
  //        لأنها React state (الـ START_GOOGLE يمسح الخطأ).
  //   3) أي خطأ ثاني → نعرضه كـ apiError.
  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const credential = credentialResponse?.credential
    if (!credential) {
      dispatch({ type: 'ERROR', error: 'لم يصلنا رمز من جوجل' })
      return
    }

    dispatch({ type: 'START_GOOGLE' })
    try {
      const { user, accessToken } = await customerGoogleLoginOnly(credential)
      login({ user, accessToken })
      navigate('/home/customer')
    } catch (err) {
      if (!mountedRef.current) return

      // ✅ الحساب غير موجود → نعرض رسالة فقط، بدون redirect
      if (isMissingAccountError(err)) {
        dispatch({
          type: 'ERROR',
          error: 'هذا الحساب غير مسجل لدينا، يرجى إنشاء حساب جديد',
        })
        return
      }

      dispatch({
        type: 'ERROR',
        error: err.message || 'فشل تسجيل الدخول بجوجل',
      })
    }
  }, [login, navigate])

  const handleGoogleError = useCallback(() => {
    dispatch({ type: 'ERROR', error: 'فشل تسجيل الدخول بجوجل' })
  }, [])

  return (
    <FormCard>
      <button
        type="button"
        onClick={() => smartBack(navigate, { fallback: '/' })}
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
          حساب مشتري
        </span>
      </div>

      <CardHeader icon={<> <span>يا هلا بعودتك!</span> </>} subtitle="تسوق من حيث توقفت" />
      <Formik initialValues={{ email: '', password: '' }} validationSchema={loginSchema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={authState.error} />
            <InputField name="email" type="email" label="البريد الإلكتروني" placeholder="name@gmail.com" icon="email" />
            <InputField name="password" type="password" label="كلمة المرور" placeholder="••••••••" icon="password" />
            <RememberRow userType="customer" remember={remember} onRememberChange={handleRememberChange} />
            <PrimaryBtn loading={isSubmitting || isLoginSubmitting}>تسجيل دخول</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <Divider />
      <GoogleBtn
        loading={isGoogleLoading}
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
      />
      <FooterLink text="ليس لديك حساب؟" linkText="إنشاء حسابي" to="/register/customer" />
    </FormCard>
  )
}
