import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { ArrowRight } from 'lucide-react'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { authAPI } from '../utils/api'
import { sellerGoogleRegisterComplete } from '../services/authService'
import { sellerRegisterSchema, sellerRegisterGoogleSchema } from '../utils/validationSchemas'
import { prepareSellerGoogleRegistration } from '../utils/googleAuth'
import { extractToken, extractUser, saveSellerSession } from '../utils/authSession'
import GoogleBtn from '../components/GoogleBtn'

export default function RegisterSeller() {
  const navigate = useNavigate()
  const location = useLocation()
  const [apiError, setApiError] = useState('')
  const [pendingToken, setPendingToken] = useState(null)
  const [googleInitialValues, setGoogleInitialValues] = useState(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fromGoogleLogin, setFromGoogleLogin] = useState(false)

  const defaultValues = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeDescription: '',
  }

  useEffect(() => {
    const state = location.state
    if (!state?.pendingToken || !state?.initialValues) return

    setPendingToken(state.pendingToken)
    setGoogleInitialValues(state.initialValues)
    setFromGoogleLogin(Boolean(state.fromGoogleLogin))
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      if (pendingToken) {
        const data = await sellerGoogleRegisterComplete({
          pendingToken,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          storeName: values.storeName,
          storeDescription: values.storeDescription,
        })
        const token = extractToken(data)
        const user = extractUser(data)
        if (!token) throw new Error('لم يتم استلام رمز الدخول بعد إنشاء الحساب')
        saveSellerSession(token, user, true)
        navigate('/seller/dashboard')
      } else {
        await authAPI.sellerRegister({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
          storeName: values.storeName,
          storeDescription: values.storeDescription,
        })
        navigate('/verify-otp', { state: { email: values.email } })
      }
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setApiError('')
    setGoogleLoading(true)
    try {
      const registration = await prepareSellerGoogleRegistration(credentialResponse.credential)
      setPendingToken(registration.pendingToken)
      setGoogleInitialValues(registration.initialValues)
      setFromGoogleLogin(false)
    } catch (err) {
      setApiError(err.message || 'فشل التسجيل بجوجل')
    } finally {
      setGoogleLoading(false)
    }
  }

  const isGoogleFlow = Boolean(pendingToken)

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
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          حساب بائع
        </span>
      </div>

      <CardHeader
        icon={<> {isGoogleFlow ? 'أكمل إنشاء متجرك ' : 'أنشئ متجرك الآن  '}</>}
        subtitle={
          fromGoogleLogin
            ? 'حسابك غير موجود بعد — أكمل بيانات متجرك باستخدام بريدك من جوجل'
            : isGoogleFlow
              ? 'أدخل اسم متجرك وبياناتك لإكمال التسجيل'
              : 'عالمك التجاري ينتظر إبداعك اليوم!'
        }
      />

      {fromGoogleLogin && googleInitialValues?.email && (
        <div style={{
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '1rem',
          fontSize: 13,
          color: '#9A3412',
          textAlign: 'right',
        }}>
          تم جلب بريدك من Google: <strong>{googleInitialValues.email}</strong>
        </div>
      )}

      <Formik
        initialValues={googleInitialValues || defaultValues}
        enableReinitialize
        validationSchema={isGoogleFlow ? sellerRegisterGoogleSchema : sellerRegisterSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={apiError} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField name="firstName" type="text" label="الاسم الأول" placeholder="الاسم الأول" icon="user" />
              <InputField name="lastName" type="text" label="الاسم الثاني" placeholder="الاسم الثاني" icon="user" />
            </div>
            <InputField
              name="email"
              type="email"
              label="البريد الإلكتروني"
              placeholder="name@gmail.com"
              icon="email"
              disabled={isGoogleFlow}
            />
            {!isGoogleFlow && (
              <>
                <InputField name="password" type="password" label="كلمة المرور" placeholder="••••••••" icon="password" />
                <InputField name="confirmPassword" type="password" label="تأكيد كلمة المرور" placeholder="••••••••" icon="password" />
              </>
            )}
            <InputField name="storeName" type="text" label="اسم متجرك" placeholder="مثال: متجر سمير" icon="store" />
            <InputField name="storeDescription" type="text" label="وصف المتجر (اختياري)" placeholder="مثال: منتجات يدوية وتطريز..." textarea />
            <PrimaryBtn loading={isSubmitting}>
              {isGoogleFlow ? 'إكمال التسجيل' : 'إنشاء حسابي'}
            </PrimaryBtn>
          </Form>
        )}
      </Formik>

      {!isGoogleFlow && (
        <>
          <Divider />
          <GoogleBtn
            loading={googleLoading}
            onSuccess={handleGoogleSuccess}
            onError={() => setApiError('فشل التسجيل بجوجل')}
          />
        </>
      )}

      <FooterLink text="عندك حساب؟" linkText="تسجيل دخول" to="/login/seller" />
    </FormCard>
  )
}