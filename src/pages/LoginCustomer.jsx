import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, Divider, FooterLink, RememberRow, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { loginSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'
import { authenticateCustomerWithGoogle } from '../utils/googleAuth'
import { extractToken, extractUser, saveCustomerSession } from '../utils/authSession'
import GoogleBtn from '../components/GoogleBtn'

export default function LoginCustomer() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')
  const [remember, setRemember] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      const data = await authAPI.customerLogin({ email: values.email, password: values.password })
      const token = extractToken(data)
      const user = extractUser(data)
      if (!token) throw new Error('لم يتم استلام رمز الدخول')
      saveCustomerSession(token, user, remember)
      navigate('/home/customer')
    } catch (err) {
      setApiError(err.response?.data?.data?.message || err.response?.data?.message || err.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setApiError('')
    setGoogleLoading(true)
    try {
      await authenticateCustomerWithGoogle(credentialResponse.credential, remember)
      navigate('/home/customer')
    } catch (err) {
      setApiError(err.message || 'فشل تسجيل الدخول بجوجل')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <FormCard>
      <CardHeader icon={<>🏪 <span>يا هلا بعودتك!</span> 😄</>} subtitle="تسوق من حيث توقفت" />
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
