import { useState } from 'react'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, FooterLink, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { forgotPasswordSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'

export default function ForgotPassword() {
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      await authAPI.forgotPassword({ email: values.email })
      setSuccess(true)
    } catch (err) {
      setApiError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <FormCard>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>📨</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: '.5rem' }}>تم الإرسال!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور.</p>
        </div>
        <FooterLink text="تذكرت كلمة المرور؟" linkText="تسجيل دخول" to="/" />
      </FormCard>
    )
  }

  return (
    <FormCard>
      <CardHeader icon="🔐" subtitle="أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة" />
      <Formik initialValues={{ email: '' }} validationSchema={forgotPasswordSchema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={apiError} />
            <InputField name="email" type="email" label="البريد الإلكتروني" placeholder="name@gmail.com" icon="email" />
            <PrimaryBtn loading={isSubmitting}>إرسال رابط الاستعادة</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <FooterLink text="تذكرت كلمة المرور؟" linkText="تسجيل دخول" to="/" />
    </FormCard>
  )
}
