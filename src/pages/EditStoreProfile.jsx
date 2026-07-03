import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Editstoreprofile.css";
import { validateName, validateStoreName, validateStoreDescription } from "../utils/validators";
import { getSellerProfile, updateSellerProfile } from "../services/profileService";

// ── Icons ──
const StoreIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const ShopIcon = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);

const BackArrow = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.15 1.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.86-.86a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const WarnIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// رقم فلسطيني لازم يبلش بـ 059 أو 056
function validatePhone(phone) {
  if (!phone) return ""; // اختياري
  const cleaned = phone.trim();
  if (!/^(059|056)\d{7}$/.test(cleaned)) {
    return "رقم الهاتف يجب أن يبدأ بـ 059 أو 056 ويتكون من 10 أرقام";
  }
  return "";
}

export default function EditStoreProfile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(null); // للعرض فقط
  const [avatarFile, setAvatarFile] = useState(null); // الملف الفعلي للرفع

  const [form, setForm] = useState({
    storeName: "",
    storeDescription: "",
    street: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [success, setSuccess] = useState("");

  // ── جلب بيانات البروفايل الحقيقية عند فتح الصفحة ──
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const res = await getSellerProfile();
        const profile = res?.data?.profile;
        if (!profile || !isMounted) return;

        setForm({
          storeName: profile.storeName || "",
          storeDescription: profile.storeDescription || "",
          street: profile.address || "", // الـ GET بيرجعها address، الـ PUT بياخدها street
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          email: profile.email || "",
          phone: profile.phone || "",
        });

        if (profile.avatar) setAvatarPreview(profile.avatar);
      } catch (err) {
        if (isMounted) setErrors({ general: "تعذر تحميل بيانات المتجر، حاول تحديث الصفحة" });
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadProfile();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccess("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs = {};
    const storeNameErr = validateStoreName(form.storeName);
    const descErr = validateStoreDescription(form.storeDescription);
    const fullNameErr = validateName(form.firstName, "الاسم الأول");
    const phoneErr = validatePhone(form.phone);
    if (storeNameErr) errs.storeName = storeNameErr;
    if (descErr) errs.storeDescription = descErr;
    if (fullNameErr) errs.firstName = fullNameErr;
    if (phoneErr) errs.phone = phoneErr;
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setSuccess("");
    try {
      await updateSellerProfile({
        storeName: form.storeName,
        storeDescription: form.storeDescription,
        street: form.street,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        avatarFile,
      });
      setSuccess("تم حفظ التغييرات بنجاح ✅");
    } catch (err) {
      const backendMsg = err?.response?.data?.data?.message
        || err?.response?.data?.data?.errors?.[0]?.message
        || "حدث خطأ أثناء الحفظ، حاول مرة أخرى";
      setErrors({ general: backendMsg });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="esp-wrapper"><p>جاري تحميل بيانات المتجر...</p></div>;
  }

  return (
    <div className="esp-wrapper">

      {/* Breadcrumb */}
      <button className="esp-breadcrumb" onClick={() => navigate(-1)}>
        <span>العودة للملف الشخصي</span>
        <BackArrow />
      </button>

      {/* Page Header */}
      <div className="esp-page-header">
        <h1>تعديل ملف المتجر</h1>
        <p>قم بتحديث معلومات متجرك والبيانات الشخصية</p>
      </div>

      {/* ── صورة المتجر ── */}
      <div className="esp-section">
        <div className="esp-section-title">
          <span>صورة المتجر</span>
          <StoreIcon />
        </div>
        <div className="esp-img-row">
          <button className="esp-upload-btn" onClick={() => fileRef.current?.click()}>
            <UploadIcon />
            تحميل صورة جديدة
          </button>
          <div className="esp-img-box">
            {avatarPreview ? <img src={avatarPreview} alt="store" /> : <ShopIcon />}
          </div>
          <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleImageChange} />
        </div>
      </div>

      {/* ── معلومات المتجر ── */}
      <div className="esp-section">
        <div className="esp-section-title">
          <span>معلومات المتجر</span>
          <StoreIcon />
        </div>

        <div className="esp-field">
          <label>اسم المتجر *</label>
          <input name="storeName" value={form.storeName} onChange={handleChange} placeholder="متجر فلسطين" />
          {errors.storeName && <span className="esp-error">{errors.storeName}</span>}
        </div>

        <div className="esp-field">
          <label>وصف المتجر</label>
          <textarea name="storeDescription" value={form.storeDescription} onChange={handleChange} placeholder="وصف المتجر" />
          {errors.storeDescription && <span className="esp-error">{errors.storeDescription}</span>}
        </div>

        <div className="esp-field">
          <div className="esp-field-label-icon">
            <span>العنوان</span>
            <LocationIcon />
          </div>
          <input name="street" value={form.street} onChange={handleChange} placeholder="شارع فلسطين، غزة" />
          {errors.street && <span className="esp-error">{errors.street}</span>}
        </div>
      </div>

      {/* ── المعلومات الشخصية ── */}
      <div className="esp-section">
        <div className="esp-section-title">
          <span>المعلومات الشخصية</span>
          <UserIcon />
        </div>

        <div className="esp-field">
          <label>الاسم الأول *</label>
          <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="محمد" />
          {errors.firstName && <span className="esp-error">{errors.firstName}</span>}
        </div>

        <div className="esp-field">
          <label>الاسم الأخير</label>
          <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="أحمد" />
          {errors.lastName && <span className="esp-error">{errors.lastName}</span>}
        </div>

        <div className="esp-field">
          <div className="esp-field-label-icon">
            <span>البريد الإلكتروني</span>
            <MailIcon />
          </div>
          <input name="email" type="email" value={form.email} disabled />
          <div className="esp-field-note">
            <WarnIcon />
            <span>لا يمكن تغيير البريد الإلكتروني لأسباب أمنية</span>
          </div>
        </div>

        <div className="esp-field">
          <div className="esp-field-label-icon">
            <span>رقم الهاتف</span>
            <PhoneIcon />
          </div>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="0599123456" />
          {errors.phone && <span className="esp-error">{errors.phone}</span>}
        </div>
      </div>

      {/* Messages */}
      {errors.general && <div className="esp-error">{errors.general}</div>}
      {success && <div className="esp-success">{success}</div>}

      {/* Actions */}
      <div className="esp-actions">
        <button className="esp-btn-save" onClick={handleSubmit} disabled={loading}>
          {loading ? <span className="esp-spinner" /> : <SaveIcon />}
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
        <button className="esp-btn-cancel" onClick={() => navigate(-1)}>إلغاء</button>
      </div>

    </div>
  );
}