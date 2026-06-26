 import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import OAuthButtons from '../components/OAuthButtons'
import { sellerRegisterSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { useGoogleLogin } from '@react-oauth/google'
import { sellerGoogleLogin } from '../services/authService'

export default function RegisterSeller() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      await authAPI.sellerRegister({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        storeName: values.storeName,
        storeDescription: values.storeDescription,
      })
      navigate('/verify-email', { state: { email: values.email } })
    } catch (err) {
      setApiError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const data = await sellerGoogleLogin(tokenResponse.access_token)
        console.log(data)
        navigate('/seller/onboarding')
      } catch (err) {
        console.log(err)
      }
    },
    onError: () => {
      console.log('فشل تسجيل الدخول بجوجل')
    }
  })

  return (
    <FormCard>
      <CardHeader icon={<>🏪 أنشئ متجرك الآن 🚀</>} subtitle="عالمك التجاري ينتظر إبداعك اليوم!" />
      <Formik
        initialValues={{ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', storeName: '', storeDescription: '' }}
        validationSchema={sellerRegisterSchema}
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
            <InputField name="password" type="password" label="كلمة المرور" placeholder="••••••••" icon="password" />
            <InputField name="confirmPassword" type="password" label="تأكيد كلمة المرور" placeholder="••••••••" icon="password" />
            <InputField name="storeName" type="text" label="اسم متجرك" placeholder="مثال: متجر سمير" icon="store" />
            <InputField name="storeDescription" type="text" label="وصف المتجر (اختياري)" placeholder="مثال: منتجات يدوية وتطريز..." textarea />
            <PrimaryBtn loading={isSubmitting}>إنشاء حسابي</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <Divider />
      <OAuthButtons onGoogle={() => handleGoogleLogin()} />
      <FooterLink text="عندك حساب؟" linkText="تسجيل دخول" to="/login/seller" />
    </FormCard>
  )
}