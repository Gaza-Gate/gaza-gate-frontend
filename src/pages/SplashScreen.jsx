 import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding')
    }, 2000) // ثانيتين قبل التحويل

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div style={{
      background: 'var(--bg-page)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <img src={logo} alt="بوابة غزة" style={{ width: 180, height: 'auto' }} />
    </div>
  )
}