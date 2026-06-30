import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { GoogleLogin } from '@react-oauth/google'
import { customerRegisterSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { customerGoogleRegister, customerGoogleLogin } from '../services/authService'

export default function RegisterCustomer() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      await authAPI.customerRegister({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
      })
      navigate('/verify-email', { state: { email: values.email } })
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
      // حاول register أولاً
      const data = await customerGoogleRegister(googleIdToken)
      const token = data.data?.token || data.token
      if (token) localStorage.setItem('token', token)
      navigate('/home/customer')
    } catch {
      // إذا موجود مسبقاً → login مباشرة
      try {
        const data = await customerGoogleLogin(googleIdToken)
        const token = data.data?.token || data.token
        if (token) localStorage.setItem('token', token)
        navigate('register/customer')
      } catch (err) {
        setApiError(err.message || 'فشل التسجيل بجوجل')
      }
    }
  }

  return (
    <FormCard>
      <CardHeader icon={<>🏪 اكتشف آلاف المنتجات 🛍️</>} subtitle="عالمك من التسوق يبدأ من هنا" />
      <Formik
        initialValues={{ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' }}
        validationSchema={customerRegisterSchema}
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
            <PrimaryBtn loading={isSubmitting}>إنشاء حساب</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <Divider />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
  <div style={{ width: '100%', maxWidth: '400px' }}>
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => setApiError('فشل تسجيل الدخول بجوجل')}
      text="continue_with"
      locale="ar"
      useOneTap={false}
      width={Math.min(window.innerWidth - 48, 400).toString()}
    />
  </div>
</div>
      <FooterLink text="عندك حساب؟" linkText="تسجيل دخول" to="/login/customer" />
    </FormCard>
  )
}
