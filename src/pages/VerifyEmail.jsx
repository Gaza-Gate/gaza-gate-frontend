import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Formik, Form } from 'formik'
import { FormCard, CardHeader, PrimaryBtn, ApiError } from '../components/FormCard'
import InputField from '../components/InputField'
import { verifyEmailSchema } from '../utils/validationSchemas'
import { authAPI } from '../utils/api'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [apiError, setApiError] = useState('')
  const [resendMsg, setResendMsg] = useState('')

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setApiError('')
      await authAPI.verifyEmail({ email: values.email, code: values.code })
      navigate('/')
    } catch (err) {
      setApiError(err.response?.data?.message || 'كود غير صحيح، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    try {
      await authAPI.resendCode({ email })
      setResendMsg('تم إرسال كود جديد إلى بريدك الإلكتروني')
    } catch {
      setResendMsg('حدث خطأ أثناء إرسال الكود')
    }
  }

  return (
    <FormCard>
      <CardHeader icon="📧" subtitle={`أدخل كود التحقق المرسل إلى ${email}`} />
      <Formik
        initialValues={{ email, code: '' }}
        validationSchema={verifyEmailSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form noValidate>
            <ApiError message={apiError} />
            {resendMsg && <p style={{ fontSize: 13, color: '#16A34A', marginBottom: '1rem', textAlign: 'right' }}>{resendMsg}</p>}
            <InputField name="email" type="email" label="البريد الإلكتروني" placeholder="name@gmail.com" icon="email" />
            <InputField name="code" type="text" label="كود التحقق (6 أرقام)" placeholder="123456" />
            <PrimaryBtn loading={isSubmitting}>تحقق من الحساب</PrimaryBtn>
          </Form>
        )}
      </Formik>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        لم يصلك الكود؟{' '}
        <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: 'var(--orange)', fontWeight: 600, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 13 }}>
          أعد الإرسال
        </button>
      </div>
    </FormCard>
  )
}
