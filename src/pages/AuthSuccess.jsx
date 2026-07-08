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
      navigate('/seller/dashboard')
    } else {
      navigate('/home/customer')
    }
  }, [])

  return <div style={{textAlign:'center', padding:'3rem'}}>جاري تسجيل الدخول...</div>
}