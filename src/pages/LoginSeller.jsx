import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import OAuthButtons from '../components/OAuthButtons'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'

export default function LoginSeller() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      await authAPI.sellerLogin({ email: values.email, password: values.password })
      navigate('/dashboard/seller')
    } catch (err) {
      setApiError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormCard>
      <CardHeader icon={<>🏪 مرحباً بك من جديد 👋</>} subtitle="ادخل بياناتك للوصول للوحة التحكم" />
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
      <OAuthButtons />
      <FooterLink text="ليس عندك حساب؟" linkText="إنشاء حسابي" to="/register/seller" />
    </FormCard>
  )
}
