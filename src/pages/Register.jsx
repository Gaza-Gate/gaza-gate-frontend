 import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { validateRegisterForm } from "../utils/validators"

export default function Register() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    password: "", confirmPassword: "", storeName: "", storeDescription: ""
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: "" }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateRegisterForm(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/auth/seller/local/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          storeName: form.storeName,
          storeDescription: form.storeDescription,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "حدث خطأ")
      navigate("/login")
    } catch (err) {
      setErrors({ general: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-orange-100 flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xl mb-1">🏪 أنشئ متجرك الآن</div>
          <p className="text-sm text-gray-400">عالمك التجاري ينتظر إبداعك اليوم!</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">الاسم الأول</label>
              <input name="firstName" onChange={handleChange} placeholder="الاسم الأول"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">الاسم الثاني</label>
              <input name="lastName" onChange={handleChange} placeholder="الاسم الثاني"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">البريد الإلكتروني</label>
            <input name="email" type="email" onChange={handleChange} placeholder="name@gmail.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">كلمة المرور</label>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} onChange={handleChange} placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                {showPass ? "إخفاء" : "إظهار"}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">تأكيد كلمة المرور</label>
            <input name="confirmPassword" type="password" onChange={handleChange} placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">اسم متجرك</label>
            <input name="storeName" onChange={handleChange} placeholder="مثال: متجر سمير"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            {errors.storeName && <p className="text-red-500 text-xs mt-1">{errors.storeName}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">وصف المتجر</label>
            <input name="storeDescription" onChange={handleChange} placeholder="اكتب وصفاً مختصراً لمتجرك"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            {errors.storeDescription && <p className="text-red-500 text-xs mt-1">{errors.storeDescription}</p>}
          </div>

          {errors.general && <div className="text-red-500 text-sm text-center">{errors.general}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition">
            {loading ? "جاري الإنشاء..." : "إنشاء حسابي"}
          </button>
        </form>

        <div className="flex items-center gap-2 my-4 text-gray-300 text-sm">
          <div className="flex-1 h-px bg-gray-200" />أو<div className="flex-1 h-px bg-gray-200" />
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          عندك حساب؟{" "}
          <span onClick={() => navigate("/login")} className="text-orange-500 font-semibold cursor-pointer">
            تسجيل دخول
          </span>
        </p>
      </div>
    </div>
  )
}