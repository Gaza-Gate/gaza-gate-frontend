import * as Yup from 'yup'

const passwordRules = Yup.string()
  .required('كلمة المرور مطلوبة')
  .min(8, 'كلمة المرور يجب أن تكون 8 خانات على الأقل')
  .matches(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
  .matches(/[a-z]/, 'يجب أن تحتوي على حرف صغير')
  .matches(/[0-9]/, 'يجب أن تحتوي على رقم')
  .matches(/[@$!%*?&]/, 'يجب أن تحتوي على رمز خاص (@$!%*?&)')

const baseRegisterSchema = {
  firstName: Yup.string()
    .required('الاسم الأول مطلوب')
    .min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل')
    .max(50, 'الاسم الأول يجب ألا يتجاوز 50 حرفاً'),
  lastName: Yup.string()
    .required('الاسم الثاني مطلوب')
    .min(2, 'الاسم الثاني يجب أن يكون حرفين على الأقل')
    .max(50, 'الاسم الثاني يجب ألا يتجاوز 50 حرفاً'),
  email: Yup.string()
    .required('البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: passwordRules,
  confirmPassword: Yup.string()
    .required('تأكيد كلمة المرور مطلوب')
    .oneOf([Yup.ref('password')], 'كلمتا المرور غير متطابقتين'),
}

export const customerRegisterSchema = Yup.object(baseRegisterSchema)

export const sellerRegisterSchema = Yup.object({
  ...baseRegisterSchema,
  storeName: Yup.string()
    .required('اسم المتجر مطلوب')
    .min(2, 'اسم المتجر يجب أن يكون حرفين على الأقل')
    .max(100, 'اسم المتجر يجب ألا يتجاوز 100 حرف'),
  storeDescription: Yup.string()
    .max(500, 'وصف المتجر يجب ألا يتجاوز 500 حرف'),
})

export const loginSchema = Yup.object({
  email: Yup.string()
    .required('البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: Yup.string()
    .required('كلمة المرور مطلوبة'),
})

export const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .required('البريد الإلكتروني مطلوب')
    .email('صيغة البريد الإلكتروني غير صحيحة'),
})

export const verifyEmailSchema = Yup.object({
  email: Yup.string().required('البريد الإلكتروني مطلوب').email(),
  code: Yup.string()
    .required('كود التحقق مطلوب')
    .length(6, 'الكود يجب أن يكون 6 أرقام')
    .matches(/^[0-9]+$/, 'الكود يجب أن يكون أرقاماً فقط'),
})

export const resetPasswordSchema = Yup.object({
  newPassword: passwordRules,
  confirmPassword: Yup.string()
    .required('تأكيد كلمة المرور مطلوب')
    .oneOf([Yup.ref('newPassword')], 'كلمتا المرور غير متطابقتين'),
})
