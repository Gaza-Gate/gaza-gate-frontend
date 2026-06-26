import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import OAuthButtons from '../components/OAuthButtons'
import { customerRegisterSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { useGoogleLogin } from '@react-oauth/google'
import { customerGoogleLogin } from '../services/authService'

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
      setApiError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }
const handleGoogleSuccess = async (credentialResponse) => {
    setApiError('')
    const googleIdToken = credentialResponse.credential
    try {
      // حاول تسجيل دخول أولاً
      const data = await customerGoogleLogin(googleIdToken)
      const token = data.data?.token || data.token
      if (token) localStorage.setItem('token', token)
      navigate('/home/customer') // حساب موجود → هوم
      
    } catch {
      // ما عنده حساب → اعمل register
      try {
        const data = await customerGoogleRegister(googleIdToken)
        const token = data.data?.token || data.token
        if (token) localStorage.setItem('token', token)
        navigate('/register/customer') // حساب جديد → يكمل بياناته
      } catch (err) {
        console.log(err)
      }
    },
    onError: () => {
      console.log('فشل تسجيل الدخول بجوجل')
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
      <OAuthButtons onGoogle={() => handleGoogleLogin()} />
      <FooterLink text="ليوجد عندك حساب؟" linkText="تسجيل دخول" to="/login/customer" />
    </FormCard>
  )
}