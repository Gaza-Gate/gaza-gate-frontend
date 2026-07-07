import { useEffect, useState } from 'react'
import { FiUser, FiMail, FiPhone, FiInfo, FiEdit2 } from 'react-icons/fi'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import { SidebarProvider } from '../components/SidebarContext'
import { getAdminProfile, updateAdminProfile } from '../services/adminService'
import './AdminProfile.css'

export default function AdminProfile() {
  return (
    <SidebarProvider>
      <AdminProfileContent />
    </SidebarProvider>
  )
}

function AdminProfileContent() {
  const [profile, setProfile] = useState(null)
  const [originalProfile, setOriginalProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getAdminProfile()
        setProfile(res.data)
        setOriginalProfile(res.data)
      } catch (err) {
        console.error('فشل تحميل الملف الشخصي', err)
        // قيم افتراضية لو فشل الطلب، عشان الواجهة تضل شغالة
        const fallback = {
          fullName: 'محمود يوسف',
          role: 'مسؤول النظام',
          email: 'mahmoud@gazagate.ps',
          phone: '+970 59 123 4567',
          bio: '',
          isActive: true,
        }
        setProfile(fallback)
        setOriginalProfile(fallback)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const handleCancel = () => {
    setProfile(originalProfile)
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateAdminProfile({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        bio: profile.bio,
      })
      setOriginalProfile(profile)
      setSuccess('تم حفظ التغييرات بنجاح')
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء حفظ التغييرات')
    } finally {
      setSaving(false)
    }
  }

  const initial = profile?.fullName?.trim().charAt(0) || '؟'

  return (
    <div className="admin-profile-page">
      <AdminTopbar />

      <div className="admin-profile-page__body">
        <AdminSidebar />

        <main className="admin-profile-page__content">
          <h1 className="admin-profile-page__title">الملف الشخصي</h1>

          {loading || !profile ? (
            <p className="profile-loading">جاري التحميل...</p>
          ) : (
            <>
              <section className="profile-header-card">
                <div className="profile-header-card__info">
                  <h3 className="profile-header-card__name">{profile.fullName}</h3>
                  <p className="profile-header-card__role">{profile.role}</p>
                  <span className="profile-header-card__status">
                    <span className="status-dot" />
                    {profile.isActive ? 'حساب نشط' : 'حساب غير نشط'}
                  </span>
                </div>
                <div className="profile-header-card__avatar">{initial}</div>
              </section>

              <section className="settings-card">
                <div className="settings-card__header">
                  <FiEdit2 className="settings-card__header-icon" />
                  <h2>معلومات الحساب</h2>
                </div>

                <div className="profile-form">
                  <div className="profile-form__grid">
                    <div className="profile-field">
                      <label>
                        <FiUser className="profile-field__icon" />
                        الاسم الكامل
                      </label>
                      <input
                        type="text"
                        value={profile.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                      />
                    </div>

                    <div className="profile-field">
                      <label>
                        <FiInfo className="profile-field__icon" />
                        الدور الوظيفي
                      </label>
                      <input type="text" value={profile.role} disabled readOnly />
                    </div>
                  </div>

                  <div className="profile-field profile-field--full">
                    <label>
                      <FiMail className="profile-field__icon" />
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>

                  <div className="profile-field profile-field--full">
                    <label>
                      <FiPhone className="profile-field__icon" />
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="profile-field profile-field--full">
                    <label>
                      <FiEdit2 className="profile-field__icon" />
                      نبذة شخصية
                    </label>
                    <textarea
                      rows={4}
                      value={profile.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      placeholder="اكتب نبذة مختصرة عنك..."
                    />
                  </div>

                  {error && <p className="password-form__error">{error}</p>}
                  {success && <p className="password-form__success">{success}</p>}

                  <div className="profile-form__actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                    <button type="button" className="btn btn--outline" onClick={handleCancel}>
                      إلغاء
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}