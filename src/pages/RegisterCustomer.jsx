import { useEffect, useReducer, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { ArrowRight } from 'lucide-react'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { customerRegisterSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { customerGoogleRegisterOnly } from '../utils/googleAuth'
import { useAuth } from '../context/AuthContext'
import GoogleBtn from '../components/GoogleBtn'

// ────────────────────────────────────────────────────────────────────────────
// useReducer — atomic updates (نفس النمط المعتمد في LoginCustomer)
// ────────────────────────────────────────────────────────────────────────────
const initialAuthState = { mode: 'idle', error: '' }

function authReducer(state, action) {
  switch (action.type) {
    case 'START_REGISTER':
      return { mode: 'register', error: '' }
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

export default function RegisterCustomer() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isBootstrapping, currentRole } = useAuth()
  const [authState, dispatch] = useReducer(authReducer, initialAuthState)

  // ── استقبل بيانات Google من صفحة Login (إذا وُجدت) ──
  //    شوف LoginCustomer: عند 404 (الحساب مش موجود) بنعمل
  //    navigate('/register/customer', { state: { googleCredential, googleProfile } })
  const incomingGoogleCredential = location.state?.googleCredential
  const incomingGoogleProfile = location.state?.googleProfile

  // ── mounted ref (نفس النمط) ──
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ── Auto-register guard: يمنع double-call عند فشل المحاولة الأولى ──
  //   (بعد الخطأ، authState.mode يرجع لـ 'idle' → بدون هذا الـ flag،
  //    الـ useEffect رح يطلق مرة ثانية ويسبب register جديد على نفس الإيميل)
  const autoRegisteredRef = useRef(false)

  // ── derived loading flags (useMemo) ──
  const isRegisterSubmitting = useMemo(() => authState.mode === 'register', [authState.mode])
  const isGoogleLoading = useMemo(() => authState.mode === 'google', [authState.mode])

  // ── لو في session صالح → redirect فوري ──
  useEffect(() => {
    if (isBootstrapping) return
    if (!isAuthenticated) return
    if (currentRole === 'seller') {
      navigate('/seller/dashboard', { replace: true })
    } else {
      navigate('/home/customer', { replace: true })
    }
  }, [isAuthenticated, isBootstrapping, currentRole, navigate])

  // ── Google Register: handler موحّد (يُستخدم من الزر + الـ auto-effect) ──
  //    السلوك الجديد:
  //    1) استدعاء /api/auth/customer/google/register مباشرةً (مش login + fallback).
  //    2) لو رجّع 201 → login() فوراً + navigate للـ home.
  //    3) لو رجّع 409 (الحساب موجود مسبقاً) → نعرض رسالة واضحة
  //       تنصح المستخدم يسجل دخول بدلاً من إنشاء حساب جديد.
  //    4) أي خطأ آخر → نعرضه كـ apiError.
  const handleGoogleRegister = useCallback(async (credential) => {
    if (!credential) {
      dispatch({ type: 'ERROR', error: 'لم يصلنا رمز من جوجل' })
      return
    }

    dispatch({ type: 'START_GOOGLE' })
    try {
      const { user, accessToken } = await customerGoogleRegisterOnly(credential)
      login({ user, accessToken })
      navigate('/home/customer')
    } catch (err) {
      if (!mountedRef.current) return

      // ✅ 409: الحساب موجود مسبقاً — نحذّر المستخدم بدل ما نعمل register تاني
      if (err?.response?.status === 409) {
        dispatch({
          type: 'ERROR',
          error: 'يوجد حساب مسجل بهذا البريد مسبقاً. يرجى تسجيل الدخول.',
        })
        return
      }

      dispatch({
        type: 'ERROR',
        error:
          err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          err.message ||
          'فشل التسجيل بجوجل',
      })
    }
  }, [login, navigate])

  // ── Auto-register: لو جاي من Login ومعه credential → اعمل register تلقائياً ──
  //   ما منطلبش من المستخدم يضغط زر Google مرة ثانية.
  //   حماية مضاعفة:
  //     1) authState.mode لازم يكون idle (لتجنّب race conditions)
  //     2) autoRegisteredRef: بعد أول محاولة (نجحت أو فشلت) ما نعيد الكرة
  useEffect(() => {
    if (!incomingGoogleCredential) return
    if (autoRegisteredRef.current) return
    if (authState.mode !== 'idle') return
    autoRegisteredRef.current = true
    handleGoogleRegister(incomingGoogleCredential)
  }, [incomingGoogleCredential, authState.mode, handleGoogleRegister])

  const handleGoogleSuccess = useCallback((credentialResponse) => {
    handleGoogleRegister(credentialResponse?.credential)
  }, [handleGoogleRegister])

  const handleGoogleError = useCallback(() => {
    dispatch({ type: 'ERROR', error: 'فشل التسجيل بجوجل' })
  }, [])

  // ── Local register (بريد/كلمة سر) ──
  const handleSubmit = useCallback(async (values, { setSubmitting }) => {
    dispatch({ type: 'START_REGISTER' })
    try {
      await authAPI.customerRegister({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
      })
      navigate('/verify-email', { state: { email: values.email } })
    } catch (err) {
      if (!mountedRef.current) return
      dispatch({
        type: 'ERROR',
        error:
          err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          'حدث خطأ، حاول مرة أخرى',
      })
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }, [navigate])

  // ── pre-fill من Google profile (إذا متاح) — يحسّن UX عند القدوم من Login ──
  const initialValues = useMemo(
    () => ({
      firstName: incomingGoogleProfile?.given_name || '',
      lastName: incomingGoogleProfile?.family_name || '',
      email: incomingGoogleProfile?.email || '',
      password: '',
      confirmPassword: '',
    }),
    [incomingGoogleProfile]
  )

  return (
    <FormCard>
      <button
        type="button"
        onClick={() => navigate('/onboarding')}
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

      <CardHeader icon={<> اكتشف آلاف المنتجات </>} subtitle="عالمك من التسوق يبدأ من هنا" />
      <Formik
        initialValues={initialValues}
        validationSchema={customerRegisterSchema}
        onSubmit={handleSubmit}
        enableReinitialize={false}
      >
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={authState.error} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField name="firstName" type="text" label="الاسم الأول" placeholder="الاسم الأول" icon="user" />
              <InputField name="lastName" type="text" label="الاسم الثاني" placeholder="الاسم الثاني" icon="user" />
            </div>
            <InputField name="email" type="email" label="البريد الإلكتروني" placeholder="name@gmail.com" icon="email" />
            <InputField name="password" type="password" label="كلمة المرور" placeholder="••••••••" icon="password" />
            <InputField name="confirmPassword" type="password" label="تأكيد كلمة المرور" placeholder="••••••••" icon="password" />
            <PrimaryBtn loading={isSubmitting || isRegisterSubmitting}>إنشاء حساب</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <Divider />
      <GoogleBtn
        loading={isGoogleLoading}
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
      />
      <FooterLink text="عندك حساب؟" linkText="تسجيل دخول" to="/login/customer" />
    </FormCard>
  )
}
