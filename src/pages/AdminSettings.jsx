 import { useEffect, useState } from 'react'
import { FiBell, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import ToggleSwitch from '../components/ToggleSwitch'
import { SidebarProvider } from '../components/SidebarContext'
import { settingsAPI } from '../services/settingsService'
import './AdminSettings.css'

const NOTIFICATION_FIELDS = [
  {
    key: 'emailNotifications',
    label: 'إشعارات البريد الإلكتروني',
    hint: 'استلام تنبيهات عبر البريد',
  },
  {
    key: 'pushNotifications',
    label: 'الإشعارات الفورية',
    hint: 'تنبيهات المتصفح',
  },
  {
    key: 'orderAlerts',
    label: 'إشعارات الطلبات',
    hint: 'عند استلام طلب جديد',
  },
  {
    key: 'promotions',
    label: 'العروض الترويجية',
    hint: 'تنبيهات المنتجات والخصومات',
  },
  {
    key: 'systemAlerts',
    label: 'تنبيهات النظام',
    hint: 'تحديثات النظام والصيانة',
  },
]

export default function AdminSettings() {
  return (
    <SidebarProvider>
      <AdminSettingsContent />
    </SidebarProvider>
  )
}

function AdminSettingsContent() {
  const [notifications, setNotifications] = useState(null)
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [savingKey, setSavingKey] = useState(null)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await settingsAPI.getNotificationSettings()
        setNotifications(res.data.data)
      } catch (err) {
        console.error('فشل تحميل إعدادات الإشعارات', err)
        // قيم افتراضية لو فشل الطلب، عشان الواجهة تضل شغالة
        setNotifications({
          emailNotifications: true,
          pushNotifications: false,
          orderAlerts: true,
          promotions: false,
          systemAlerts: true,
        })
      } finally {
        setLoadingNotifications(false)
      }
    }
    fetchNotifications()
  }, [])

  const handleToggle = async (key, value) => {
    const previous = notifications
    setNotifications((prev) => ({ ...prev, [key]: value }))
    setSavingKey(key)
    try {
      await settingsAPI.updateNotificationSettings({ [key]: value })
    } catch (err) {
      console.error('فشل تحديث الإعداد', err)
      setNotifications(previous) // رجّعها زي ما كانت لو فشل الحفظ
    } finally {
      setSavingKey(null)
    }
  }

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
    setPasswordError('')
    setPasswordSuccess('')
  }

  const toggleShowPassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleCancel = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordError('')
    setPasswordSuccess('')
  }

  const handleSavePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('الرجاء تعبئة جميع الحقول')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين')
      return
    }

    setSavingPassword(true)
    setPasswordError('')
    try {
      await settingsAPI.changePassword({ currentPassword, newPassword })
      setPasswordSuccess('تم تغيير كلمة المرور بنجاح')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة المرور')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="admin-settings-page">
      <AdminTopbar />

      <div className="admin-settings-page__body">
        <AdminSidebar />

        <main className="admin-settings-page__content">
          <h1 className="admin-settings-page__title">الاعدادات</h1>

          <section className="settings-card">
            <div className="settings-card__header">
              <FiBell className="settings-card__header-icon" />
              <h2>إعدادات الإشعارات</h2>
            </div>

            {loadingNotifications || !notifications ? (
              <p className="settings-card__loading">جاري التحميل...</p>
            ) : (
              <div className="settings-card__rows">
                {NOTIFICATION_FIELDS.map(({ key, label, hint }) => (
                  <div className="settings-row" key={key}>
                    <div>
                      <p className="settings-row__label">{label}</p>
                      <p className="settings-row__hint">{hint}</p>
                    </div>
                    <ToggleSwitch
                      checked={!!notifications[key]}
                      disabled={savingKey === key}
                      onChange={(value) => handleToggle(key, value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="settings-card">
            <div className="settings-card__header">
              <FiLock className="settings-card__header-icon" />
              <h2>كلمة المرور</h2>
            </div>

            <div className="password-form">
              <PasswordField
                label="كلمة المرور الحالية"
                fieldName="currentPassword"
                value={passwordForm.currentPassword}
                visible={showPassword.currentPassword}
                onToggleVisible={() => toggleShowPassword('currentPassword')}
                onChange={(v) => handlePasswordChange('currentPassword', v)}
              />
              <PasswordField
                label="كلمة المرور الجديدة"
                fieldName="newPassword"
                value={passwordForm.newPassword}
                visible={showPassword.newPassword}
                onToggleVisible={() => toggleShowPassword('newPassword')}
                onChange={(v) => handlePasswordChange('newPassword', v)}
              />
              <PasswordField
                label="تأكيد كلمة المرور"
                fieldName="confirmPassword"
                value={passwordForm.confirmPassword}
                visible={showPassword.confirmPassword}
                onToggleVisible={() => toggleShowPassword('confirmPassword')}
                onChange={(v) => handlePasswordChange('confirmPassword', v)}
              />

              {passwordError && <p className="password-form__error">{passwordError}</p>}
              {passwordSuccess && <p className="password-form__success">{passwordSuccess}</p>}

              <div className="password-form__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleSavePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" className="btn btn--outline" onClick={handleCancel}>
                  إلغاء
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function PasswordField({ label, fieldName, value, visible, onToggleVisible, onChange }) {
  return (
    <div className="password-field">
      <label className="password-field__label">{label}</label>
      <div className="password-field__input-wrap">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          name={`admin-pwd-${fieldName}`}
        />
        <button
          type="button"
          className="password-field__eye"
          onClick={onToggleVisible}
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        >
          {visible ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
    </div>
  )
}