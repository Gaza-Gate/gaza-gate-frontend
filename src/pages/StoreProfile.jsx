import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import "./StoreProfile.css";
import logo from "../assets/logo.png";
import ChangePasswordModal from "./ChangePasswordModal";
import SellerNavbar from "../components/SellerNavbar";
import { getSellerProfile } from "../services/profileService";

const STATUS_LABELS = {
  active: "عضو نشط",
  inactive: "غير نشط",
  suspended: "موقوف",
};

const formatMemberSince = (isoDate) => {
  if (!isoDate) return null;
  try {
    const date = new Date(isoDate);
    const months = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return null;
  }
};

/**
 * تطبيع شكل الـ response من الباك.
 * ✅ بنتوقع: { status: "success", data: { profile: { storeName, ... } } }
 * بندعم كمان: { profile: {...} } أو { storeName: "..." } لأي تعقيدات محتملة.
 */
const normalizeProfile = (apiResponseData) => {
  const profile =
    apiResponseData?.data?.profile ??
    apiResponseData?.profile ??
    apiResponseData?.data ??
    apiResponseData ??
    null;

  if (!profile || typeof profile !== "object") return null;

  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  const months = Number(profile.membershipMonths ?? 0);

  return {
    // ⚠️ المهم: ما بنحط fallback مضلّل زي "متجر فلسطين" — لو ما في اسم، نرجع null
    //    والـ UI بيعرض "—" بدالها
    storeName: profile.storeName?.trim() || null,
    storeDesc: profile.storeDescription?.trim() || profile.storeDesc?.trim() || null,
    memberSince: formatMemberSince(profile.memberSince),
    memberDuration: months > 0 ? `${months} شهر` : null,
    memberStatus: STATUS_LABELS[profile.status] || null,
    rating: profile.rating !== undefined && profile.rating !== null
      ? Number(profile.rating)
      : null,
    totalOrders: profile.totalOrders !== undefined && profile.totalOrders !== null
      ? Number(profile.totalOrders)
      : null,
    address: profile.address?.trim() || profile.street?.trim() || null,
    productDesc: profile.storeDescription?.trim() || null,
    ownerName: fullName || null,
    phone: profile.phone?.trim() || null,
    email: profile.email?.trim() || null,
    avatar: profile.avatar?.trim() || null,
    passwordLastChanged: profile.passwordMonthsAgo
      ? `لم تحديث منذ ${profile.passwordMonthsAgo} أشهر`
      : null,
  };
};

/**
 * قيمة عرض آمنة — لو null/undefined/empty، يرمز "—"
 * ولما يكون فاضي قصداً (null حقيقي من الباك)، نعرض نفس الرمز بدل
 * ما نعرض default data مضلّل.
 */
const display = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  if (typeof value === "number" && Number.isNaN(value)) return fallback;
  return value;
};

const StoreProfile = () => {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // ✅ state يبدأ null — ما في داعي نعرض بيانات وهمية قبل ما الـ API يرد
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSellerProfile();
      const normalized = normalizeProfile(res);
      // ⚠️ لو الـ API رجّع 200 بس الـ profile ناقص (ما في storeName مثلاً)
      //    نعتبره "بيانات ناقصة" ونعرض للـ user رسالة بدل ما نخترع اسم
      if (!normalized || !normalized.storeName) {
        setStoreData(normalized); // نخزّن اللي رجع (ممكن يكون فيه حقول ثانية)
        setError("لم نستطع تحميل بيانات متجرك. حاول مرة أخرى أو حدّث معلومات متجرك من صفحة التعديل.");
      } else {
        setStoreData(normalized);
        setError(null);
      }
    } catch (err) {
      console.error("[StoreProfile] failed to load:", err);
      // ✅ ما بنخترع "متجر فلسطين" — بنعرض الخطأ الفعلي للمستخدم
      const msg =
        err?.response?.data?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "تعذّر تحميل ملف المتجر. تحقق من الاتصال بالإنترنت أو حاول مرة أخرى.";
      setError(msg);
      setStoreData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ── Loading state — skeleton placeholders ── */
  if (loading) {
    return (
      <div className="sp-root" dir="rtl">
        <SellerNavbar />
        <main className="sp-main">
          <div className="sp-header">
            <div className="sp-header-info">
              <h1 className="sp-page-title">ملف المتجر</h1>
              <p className="sp-page-subtitle">جاري التحميل…</p>
            </div>
          </div>
          <div className="sp-loading-center">
            <Loader2 size={36} className="sp-spin" />
            <p>جاري تحميل بيانات متجرك…</p>
          </div>
        </main>
      </div>
    );
  }

  /* ── Error state — show message + retry button ── */
  if (error && !storeData) {
    return (
      <div className="sp-root" dir="rtl">
        <SellerNavbar />
        <main className="sp-main">
          <div className="sp-header">
            <div className="sp-header-info">
              <h1 className="sp-page-title">ملف المتجر</h1>
              <p className="sp-page-subtitle">تعذّر التحميل</p>
            </div>
          </div>
          <div className="sp-error-state">
            <AlertCircle size={48} className="sp-error-icon" />
            <h2>تعذّر تحميل ملف المتجر</h2>
            <p>{error}</p>
            <div className="sp-error-actions">
              <button type="button" className="sp-retry-btn" onClick={loadProfile}>
                <RefreshCw size={16} />
                إعادة المحاولة
              </button>
              <button
                type="button"
                className="sp-edit-link-btn"
                onClick={() => navigate("/seller/profile/edit")}
              >
                تعديل ملف المتجر
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── Partial data — loaded but missing storeName ── */
  if (error && storeData && !storeData.storeName) {
    return (
      <div className="sp-root" dir="rtl">
        <SellerNavbar />
        <main className="sp-main">
          <div className="sp-header">
            <div className="sp-header-info">
              <h1 className="sp-page-title">ملف المتجر</h1>
              <p className="sp-page-subtitle">بيانات المتجر غير مكتملة</p>
            </div>
            <button
              className="sp-btn-edit-profile"
              onClick={() => navigate("/seller/profile/edit")}
            >
              <span>إكمال البيانات</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          <div className="sp-error-state sp-error-state--inline">
            <AlertCircle size={36} className="sp-error-icon" />
            <h2>متجرك ما عندوش اسم بعد</h2>
            <p>{error}</p>
            <div className="sp-error-actions">
              <button
                type="button"
                className="sp-retry-btn"
                onClick={() => navigate("/seller/profile/edit")}
              >
                إضافة اسم المتجر
              </button>
              <button
                type="button"
                className="sp-edit-link-btn"
                onClick={loadProfile}
              >
                <RefreshCw size={14} />
                إعادة التحميل
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── Normal state — data is good ── */
  return (
    <div className="sp-root" dir="rtl">
      <SellerNavbar />

      <main className="sp-main">

        <div className="sp-header">
          <div className="sp-header-info">
            <h1 className="sp-page-title">ملف المتجر</h1>
            <p className="sp-page-subtitle">عرض معلومات المتجر والحساب الشخصي</p>
          </div>
          <button className="sp-btn-edit-profile" onClick={() => navigate("/seller/profile/edit")}>
            <span>تعديل الملف</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        <div className="sp-identity">
          <h2 className="sp-store-name">{display(storeData.storeName)}</h2>
          <p className="sp-store-desc">
            {display(storeData.storeDesc, "لا يوجد وصف للمتجر بعد.")}
          </p>
          {storeData.memberSince && (
            <span className="sp-member-badge">عضو منذ {storeData.memberSince}</span>
          )}
        </div>

        <div className="sp-stats-wrapper">
          <div className="sp-stats">
            <div className="sp-stat-card">
              <p className="sp-stat-label">إجمالي الطلبات</p>
              <p className="sp-stat-value">{display(storeData.totalOrders)}</p>
              <p className="sp-stat-sub">طلب مكتمل</p>
            </div>
            <div className="sp-stat-card">
              <p className="sp-stat-label">تقييم المتجر</p>
              <p className="sp-stat-value">{display(storeData.rating?.toFixed?.(1) ?? storeData.rating)}</p>
              <p className="sp-stat-sub">نجوم</p>
            </div>
            <div className="sp-stat-card">
              <p className="sp-stat-label">مدة العضوية</p>
              <p className="sp-stat-value">{display(storeData.memberDuration)}</p>
              <p className="sp-stat-sub">{display(storeData.memberStatus, "غير معروف")}</p>
            </div>
          </div>
        </div>

        <div className="sp-info-grid-wrapper">
          <div className="sp-info-grid">
            {/* Personal Info */}
            <div className="sp-info-card">
              <div className="sp-info-header">
                <div className="sp-info-title">
                  <span>المعلومات الشخصية</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <button
                  className="sp-btn-inline-edit"
                  onClick={() => navigate("/seller/profile/edit")}
                >
                  <span>تعديل</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <div className="sp-info-rows">
                <div className="sp-info-row">
                  <span className="sp-info-value">{display(storeData.ownerName)}</span>
                  <span className="sp-info-key">الاسم الكامل</span>
                </div>
                <div className="sp-info-row">
                  <span className="sp-info-value">{display(storeData.phone)}</span>
                  <span className="sp-info-key">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    رقم الهاتف
                  </span>
                </div>
                <div className="sp-info-row">
                  <span className="sp-info-value">{display(storeData.email)}</span>
                  <span className="sp-info-key">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    البريد الإلكتروني
                  </span>
                </div>
              </div>
            </div>

            {/* Store Info */}
            <div className="sp-info-card">
              <div className="sp-info-header">
                <div className="sp-info-title">
                  <span>معلومات المتجر</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <button
                  className="sp-btn-inline-edit"
                  onClick={() => navigate("/seller/profile/edit")}
                >
                  <span>تعديل</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <div className="sp-info-rows">
                {storeData.address && (
                  <div className="sp-info-row">
                    <span className="sp-info-value">{storeData.address}</span>
                    <span className="sp-info-key">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      العنوان
                    </span>
                  </div>
                )}
                <div className="sp-info-row">
                  <span className="sp-info-value">
                    {display(storeData.productDesc, "لا يوجد وصف للمتجر بعد.")}
                  </span>
                  <span className="sp-info-key">وصف المنتج</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sp-security-wrapper">
          <div className="sp-security-card">
            <div className="sp-info-header">
              <div className="sp-info-title">
                <span>الأمان</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ color: "var(--orange)" }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
            <div className="sp-security-row">
              <div className="sp-pass-info">
                <span className="sp-pass-label">كلمة المرور</span>
                <span className="sp-pass-sub">{display(storeData.passwordLastChanged, "غير معروف")}</span>
              </div>
              <button className="sp-btn-change-pass" onClick={() => setShowPasswordModal(true)}>
                تغيير كلمة المرور
              </button>
            </div>
          </div>
        </div>

      </main>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

export default StoreProfile;
