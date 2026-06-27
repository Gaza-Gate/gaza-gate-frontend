import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { authAPI } from '../utils/api'
import { GoogleLogin } from '@react-oauth/google'
import { sellerGoogleRegister, sellerGoogleRegisterComplete } from '../services/authService'
import { sellerRegisterSchema, sellerRegisterGoogleSchema } from '../utils/validationSchemas'

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64))
}

export default function RegisterSeller() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')
  const [pendingToken, setPendingToken] = useState(null)
  const [googleInitialValues, setGoogleInitialValues] = useState(null)
  const [googleLoading, setGoogleLoading] = useState(false) // ✅ يمنع ضغطات متكررة

  const defaultValues = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', storeName: '', storeDescription: '' }

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      if (pendingToken) {
        await sellerGoogleRegisterComplete({
          pendingToken,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          storeName: values.storeName,
          storeDescription: values.storeDescription,
        })
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

  async function handleGoogleClick(credentialResponse) {
    if (googleLoading) return // ✅ يمنع نقرتين متتاليتين -> يمنع 409
    setGoogleLoading(true)
    setApiError('')
    try {
      const profile = parseJwt(credentialResponse.credential)
      const data = await sellerGoogleRegister(credentialResponse.credential)
      setPendingToken(data.data.pendingToken)
      setGoogleInitialValues({
        firstName: profile.given_name || '',
        lastName: profile.family_name || '',
        email: profile.email || '',
        password: 'GOOGLE_AUTH',
        confirmPassword: 'GOOGLE_AUTH',
        storeName: '',
        storeDescription: '',
      })
    } catch (err) {
      setApiError(err.message || 'فشل التسجيل بجوجل')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <FormCard>
      <CardHeader icon={<>🏪 أنشئ متجرك الآن 🚀</>} subtitle="عالمك التجاري ينتظر إبداعك اليوم!" />
      <Formik
        initialValues={googleInitialValues || defaultValues}
        enableReinitialize={true}
        validationSchema={pendingToken ? sellerRegisterGoogleSchema : sellerRegisterSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={apiError} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField name="firstName" type="text" label="الاسم الأول" placeholder="الاسم الأول" icon="user" />
              <InputField name="lastName" type="text" label="الاسم الثاني" placeholder="الاسم الثاني" icon="user" />
            </div>
            <InputField name="email" type="email" label="البريد الإلكتروني" placeholder="name@gmail.com" icon="email" />
            {!pendingToken && (
              <>
                <InputField name="password" type="password" label="كلمة المرور" placeholder="••••••••" icon="password" />
                <InputField name="confirmPassword" type="password" label="تأكيد كلمة المرور" placeholder="••••••••" icon="password" />
              </>
            )}
            <InputField name="storeName" type="text" label="اسم متجرك" placeholder="مثال: متجر سمير" icon="store" />
            <InputField name="storeDescription" type="text" label="وصف المتجر (اختياري)" placeholder="مثال: منتجات يدوية وتطريز..." textarea />
            <PrimaryBtn loading={isSubmitting}>
              {pendingToken ? 'إكمال التسجيل' : 'إنشاء حسابي'}
            </PrimaryBtn>
          </Form>
        )}
      </Formik>

      {!pendingToken && (
        <>
          <Divider />
          <GoogleLogin
            onSuccess={handleGoogleClick}
            onError={() => setApiError('فشل التسجيل بجوجل')}
          />
        </>
      )}

      <FooterLink text="عندك حساب؟" linkText="تسجيل دخول" to="/login/seller" />
    </FormCard>
  )
}