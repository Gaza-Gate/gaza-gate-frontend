import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import OAuthButtons from '../components/OAuthButtons'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { useGoogleLogin } from '@react-oauth/google'
import { customerGoogleLogin } from '../services/authService'

export default function LoginCustomer() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      await authAPI.customerLogin({ email: values.email, password: values.password })
      navigate('/dashboard/customer')
    } catch (err) {
      setApiError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const data = await customerGoogleLogin(tokenResponse.access_token)
        console.log(data)
        navigate('/dashboard/customer')
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
      <CardHeader icon={<>🏪 <span>يا هلا بعودتك!</span> 😄</>} subtitle="تسوق من حيث توقفت" />
      <Formik initialValues={{ email: '', password: '' }} validationSchema={loginSchema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={apiError} />
            <InputField name="email" type="email" label="البريد الإلكتروني" placeholder="Store@gmail.com" icon="email" />
            <InputField name="password" type="password" label="كلمة المرور" placeholder="••••••••" icon="password" />
            <RememberRow />
            <PrimaryBtn loading={isSubmitting}>تسجيل دخول</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <Divider />
      <OAuthButtons onGoogle={() => handleGoogleLogin()} />
      <FooterLink text="ليوجد عندك حساب؟" linkText="إنشاء حسابي" to="/register/customer" />
    </FormCard>
  )
}