
export const validateEmail = (email) => {
  if (!email.trim()) return "البريد الإلكتروني مطلوب"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "البريد الإلكتروني غير صحيح"
  return ""
}

export const validatePassword = (password) => {
  if (!password) return "كلمة المرور مطلوبة"
  if (password.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
  if (!/[A-Z]/.test(password)) return "يجب أن تحتوي على حرف كبير"
  if (!/[a-z]/.test(password)) return "يجب أن تحتوي على حرف صغير"
  if (!/[0-9]/.test(password)) return "يجب أن تحتوي على رقم"
  if (!/[^A-Za-z0-9]/.test(password)) return "يجب أن تحتوي على رمز مثل @ # $"
  return ""
}

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return "تأكيد كلمة المرور مطلوب"
  if (password !== confirmPassword) return "كلمتا المرور غير متطابقتين"
  return ""
}

export const validateName = (value, label) => {
  if (!value.trim()) return `${label} مطلوب`
  if (value.trim().length < 2 || value.trim().length > 50)
    return `${label} يجب أن يكون بين 2 و50 حرفاً`
  return ""
}

export const validateStoreName = (value) => {
  if (!value.trim()) return "اسم المتجر مطلوب"
  if (value.trim().length < 2 || value.trim().length > 100)
    return "اسم المتجر يجب أن يكون بين 2 و100 حرف"
  return ""
}

export const validateStoreDescription = (value) => {
  if (value && value.trim().length > 500)
    return "وصف المتجر يجب أن لا يتجاوز 500 حرف"
  return ""
}

// ====== دوال جاهزة لكل صفحة ======

export const validateRegisterForm = (form) => {
  const errors = {}
  const firstName = validateName(form.firstName, "الاسم الأول")
  const lastName = validateName(form.lastName, "الاسم الثاني")
  const email = validateEmail(form.email)
  const password = validatePassword(form.password)
  const confirmPassword = validateConfirmPassword(form.password, form.confirmPassword)
  const storeName = validateStoreName(form.storeName)
  const storeDescription = validateStoreDescription(form.storeDescription)

  if (firstName) errors.firstName = firstName
  if (lastName) errors.lastName = lastName
  if (email) errors.email = email
  if (password) errors.password = password
  if (confirmPassword) errors.confirmPassword = confirmPassword
  if (storeName) errors.storeName = storeName
  if (storeDescription) errors.storeDescription = storeDescription

  return errors
}

export const validateLoginForm = ({ email, password }) => {
  const errors = {}
  const emailErr = validateEmail(email)
  if (emailErr) errors.email = emailErr
  if (!password) errors.password = "كلمة المرور مطلوبة"
  return errors
}

export const validateResetPasswordForm = ({ newPassword, confirmPassword }) => {
  const errors = {}
  const passwordErr = validatePassword(newPassword)
  const confirmErr = validateConfirmPassword(newPassword, confirmPassword)
  if (passwordErr) errors.password = passwordErr
  if (confirmErr) errors.confirmPassword = confirmErr
  return errors
}