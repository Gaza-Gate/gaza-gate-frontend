// pages/AuthSuccess.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthSuccess() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('token', token)
      navigate('/dashboard/customer')
    } else {
      navigate('/')
    }
  }, [])

  return <div style={{textAlign:'center', padding:'3rem'}}>جاري تسجيل الدخول...</div>
}