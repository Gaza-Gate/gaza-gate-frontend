import { useState, useEffect } from "react";
import { Copy, Check, Phone, Truck } from "lucide-react";
import SellerNavbar from "../components/SellerNavbar";
import { customerAPI } from "../utils/api";
import "./DeliverySettings.css";

/**
 * DeliverySettings — صفحة إعدادات شركة التوصيل المفضلة للبائع.
 *
 * ⚠️ النافبار مش مضمّن هون — SellerNavbar (نفس نافبار صفحات المنتجات/المحفظة).
 *
 * البيانات:
 *   شركات التوصيل (id, name, phone) تُجلب من:
 *   GET /api/customer/contact-directory
 *   الاستجابة المتوقعة:
 *   { status: "success", data: { contacts: [{ id, deliveryName, phone }] } }
 *
 * props:
 *   defaultCompanyId
 *   onSave
 */

export default function DeliverySettings({ defaultCompanyId, onSave }) {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(defaultCompanyId ?? null);
  const [copiedId, setCopiedId] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchCompanies = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await customerAPI.getContactDirectory();
        const json = res.data;

        if (json?.status !== "success") {
          throw new Error(json?.message || "تعذر تحميل شركات التوصيل");
        }

        const contacts = (json?.data?.contacts ?? []).map((contact) => ({
          id: contact.id,
          name: contact.deliveryName,
          phone: contact.phone,
        }));

        if (!isMounted) return;

        setCompanies(contacts);
        setSelectedId((prev) => prev ?? defaultCompanyId ?? contacts[0]?.id ?? null);
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || "حدث خطأ أثناء تحميل شركات التوصيل";
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCompanies();
    return () => {
      isMounted = false;
    };
  }, [defaultCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedId);

  const handleCopy = async (id, phone) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // تجاهل بصمت لو الكليبورد مش متاح
    }
  };

  const handleSave = () => {
    if (!selectedCompany) return;
    if (onSave) return onSave({ companyId: selectedCompany.id, phone: selectedCompany.phone });
    // 🆕 [مؤقت للمعاينة] لسا ما في ربط فعلي بالباك إند للحفظ — بس نعرض تأكيد بصري
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="ds-root" dir="rtl">
      <SellerNavbar />

      <main className="ds-main">
        {/* ترويسة الصفحة */}
        <header className="ds-page-header">
          <div className="ds-page-icon">
            <Truck size={20} color="#f97316" />
          </div>
          <div className="ds-page-titles">
            <h1 className="ds-page-title">إعدادات التوصيل</h1>
            <p className="ds-page-subtitle">
              أدِر شركة التوصيل التي يتم عرض رقمها للمشتري عند إتمام الطلب
            </p>
          </div>
          <span className="ds-done-badge">
            <Check size={13} strokeWidth={3} />
            تم الإعداد
          </span>
        </header>

        {/* قسم شركة التوصيل المفضلة */}
        <section className="ds-delivery-card">
          <div className="ds-delivery-header">
            <h2 className="ds-delivery-title">شركة التوصيل المفضلة</h2>
          </div>
          <p className="ds-delivery-subtitle">
            اختر شركة التوصيل التي تتعامل معها — سيظهر رقمها للمشتري عند طلبه
          </p>

          {isLoading && <p className="ds-state-msg">جاري تحميل شركات التوصيل...</p>}

          {!isLoading && error && (
            <p className="ds-state-msg ds-state-msg--error">{error}</p>
          )}

          {!isLoading && !error && companies.length === 0 && (
            <p className="ds-state-msg">لا توجد شركات توصيل متاحة حاليًا</p>
          )}

          {!isLoading && !error && companies.length > 0 && (
            <div className="ds-companies-grid">
              {companies.map((company) => {
                const isSelected = selectedId === company.id;
                const isDefault = company.id === defaultCompanyId;
                return (
                  <label
                    key={company.id}
                    className={`ds-company-card ${isSelected ? "ds-company-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="delivery-company"
                      className="ds-company-radio"
                      checked={isSelected}
                      onChange={() => setSelectedId(company.id)}
                    />

                    <div className="ds-company-info">
                      <div className="ds-company-name-row">
                        <span className="ds-company-name">{company.name}</span>
                        {isDefault && <span className="ds-default-badge">الافتراضية</span>}
                      </div>

                      <span className="ds-company-phone">
                        <Phone size={13} />
                        {company.phone}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="ds-copy-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCopy(company.id, company.phone);
                      }}
                      aria-label="نسخ الرقم"
                    >
                      {copiedId === company.id ? (
                        <Check size={14} color="#16a34a" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {/* ملخص الشركة المختارة */}
        {selectedCompany && (
          <section className="ds-summary-card">
            <div className="ds-summary-info">
              <p className="ds-summary-label">الشركة المختارة حاليًا</p>
              <div className="ds-summary-name-row">
                <span className="ds-summary-name">{selectedCompany.name}</span>
                <span className="ds-default-badge ds-default-badge--outline">
                  الشركة الافتراضية
                </span>
              </div>
              <span className="ds-company-phone">
                <Phone size={13} />
                {selectedCompany.phone}
              </span>
            </div>

            <button
              type="button"
              className="ds-copy-btn ds-copy-btn--summary"
              onClick={() => handleCopy("summary", selectedCompany.phone)}
              aria-label="نسخ الرقم"
            >
              {copiedId === "summary" ? (
                <Check size={16} color="#16a34a" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </section>
        )}

        <button
          type="button"
          className="ds-save-btn"
          onClick={handleSave}
          disabled={!selectedCompany}
        >
          {saved ? "تم الحفظ ✓" : "حفظ التغييرات"}
        </button>
      </main>
    </div>
  );
}