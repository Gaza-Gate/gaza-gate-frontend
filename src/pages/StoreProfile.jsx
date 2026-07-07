import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StoreProfile.css";
import logo from "../assets/logo.png";
import ChangePasswordModal from "./ChangePasswordModal";
import SellerNavbar from "../components/SellerNavbar";
import { getSellerProfile } from "../services/profileService";
import { getAuthToken } from "../services/authService";

const FALLBACK_STORE_DATA = {
  storeName: "متجر فلسطين",
  storeDesc: "متخصص في المنتجات المحلية الفلسطينية عالي الجودة",
  memberSince: "يناير 2025",
  memberDuration: "17 شهر",
  memberStatus: "عضو نشط",
  rating: 4.5,
  ratingLabel: "مرك نجوم",
  totalOrders: 156,
  ordersLabel: "طلب مكتمل",
  address: "غير المرا",
  productDesc: "منتجات محلية فلسطينية عالية الجودة",
  ownerName: "احمد محمد",
  phone: "+970999123456",
  email: "seller@gaza-gate.com",
  passwordLastChanged: "لم تحديث منذ 3 أشهر",
};

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

const normalizeProfile = (apiResponseData) => {
  const profile =
    apiResponseData?.data?.profile ??
    apiResponseData?.profile ??
    apiResponseData ??
    {};

  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  const months = profile.membershipMonths ?? 0;

  return {
    storeName: profile.storeName ?? FALLBACK_STORE_DATA.storeName,
    storeDesc: profile.storeDescription ?? profile.storeDesc ?? FALLBACK_STORE_DATA.storeDesc,
    memberSince: formatMemberSince(profile.memberSince) ?? FALLBACK_STORE_DATA.memberSince,
    memberDuration: `${months} شهر`,
    memberStatus: STATUS_LABELS[profile.status] ?? FALLBACK_STORE_DATA.memberStatus,
    rating: profile.rating !== undefined ? Number(profile.rating) : FALLBACK_STORE_DATA.rating,
    ratingLabel: FALLBACK_STORE_DATA.ratingLabel,
    totalOrders: profile.totalOrders ?? FALLBACK_STORE_DATA.totalOrders,
    ordersLabel: FALLBACK_STORE_DATA.ordersLabel,
    address: profile.street ?? profile.address ?? "",
     productDesc: profile.storeDescription ?? FALLBACK_STORE_DATA.productDesc,
    ownerName: fullName || FALLBACK_STORE_DATA.ownerName,
    phone: profile.phone ?? "غير متوفر",
    email: profile.email ?? FALLBACK_STORE_DATA.email,
    passwordLastChanged: profile.passwordMonthsAgo
      ? `لم تحديث منذ ${profile.passwordMonthsAgo} أشهر`
      : "غير معروف",
  };
};

const StoreProfile = () => {
  const navigate = useNavigate();
  const token = getAuthToken();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [storeData, setStoreData] = useState(FALLBACK_STORE_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getSellerProfile(token);
        setStoreData(normalizeProfile(res.data ?? res));
      } catch {
        setStoreData(FALLBACK_STORE_DATA);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="sp-root" dir="rtl">
      <SellerNavbar />

      <main className="sp-main">

        {/* Header - full width */}
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

        {/* Identity - full width */}
        <div className="sp-identity">
          <h2 className="sp-store-name">{loading ? "..." : storeData.storeName}</h2>
          <p className="sp-store-desc">{storeData.storeDesc}</p>
          <span className="sp-member-badge">عضو منذ {storeData.memberSince}</span>
        </div>

        {/* Stats - full width */}
        <div className="sp-stats-wrapper">
          <div className="sp-stats">
            <div className="sp-stat-card">
              <p className="sp-stat-label">إجمالي الطلبات</p>
              <p className="sp-stat-value">{loading ? "—" : storeData.totalOrders}</p>
              <p className="sp-stat-sub">{storeData.ordersLabel}</p>
            </div>
            <div className="sp-stat-card">
              <p className="sp-stat-label">تقييم المتجر</p>
              <p className="sp-stat-value">{loading ? "—" : storeData.rating}</p>
              <p className="sp-stat-sub">{storeData.ratingLabel}</p>
            </div>
            <div className="sp-stat-card">
              <p className="sp-stat-label">مدة العضوية</p>
              <p className="sp-stat-value">{loading ? "—" : storeData.memberDuration}</p>
              <p className="sp-stat-sub">{storeData.memberStatus}</p>
            </div>
          </div>
        </div>

        {/* Info Cards - centered */}
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
                <button className="sp-btn-inline-edit">
                  <span>تعديل</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <div className="sp-info-rows">
                <div className="sp-info-row">
                  <span className="sp-info-value">{storeData.ownerName}</span>
                  <span className="sp-info-key">الاسم الكامل</span>
                </div>
                <div className="sp-info-row">
                  <span className="sp-info-value">{storeData.phone}</span>
                  <span className="sp-info-key">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    رقم الهاتف
                  </span>
                </div>
                <div className="sp-info-row">
                  <span className="sp-info-value">{storeData.email}</span>
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
                <button className="sp-btn-inline-edit">
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
                  <span className="sp-info-value">{storeData.productDesc}</span>
                  <span className="sp-info-key">وصف المنتج</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security - full width */}
        <div className="sp-security-wrapper">
          <div className="sp-security-card">
            <div className="sp-info-header">
              <div className="sp-info-title">
                <span>الأمان</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{color: 'var(--orange)'}}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <button className="sp-btn-inline-edit">
                <span>تعديل</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
            <div className="sp-security-row">
              <div className="sp-pass-info">
                <span className="sp-pass-label">كلمة المرور</span>
                <span className="sp-pass-sub">{storeData.passwordLastChanged}</span>
              </div>
             <button className="sp-btn-change-pass" onClick={() => setShowPasswordModal(true)}>
                تغيير كلمة المرور
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
     );
   };

export default StoreProfile;