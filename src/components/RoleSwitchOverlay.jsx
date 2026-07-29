import { useEffect, useState } from "react";
import { Loader2, Sparkles, ShieldCheck, ShoppingBag } from "lucide-react";
import "./RoleSwitchOverlay.css";

/**
 * RoleSwitchOverlay
 * ─────────────────────────────────────────────────────────
 * Overlay كامل الشاشة يظهر أثناء تبديل الدور (customer ↔ seller).
 *
 * الفلسفة:
 *   - مش spinner بسيط — skeleton يحاكي الـ layout الجديد (customer أو seller)
 *     عشان الـ transition يطلع سلس بدون layout shift.
 *   - `role="customer"` يعرض skeleton فيه بطاقة بروفايل، ليست طلبات، إلخ.
 *   - `role="seller"` يعرض skeleton فيه stats grid + chart placeholders.
 *   - يمنع أي تداخل بصري مع الصفحة القديمة — الصفحة الأصلية بتتلاشى
 *     بـ fade-out خفيف (130ms) والـ overlay بيظهر.
 *   - aria-busy=true + role="status" — قارئ الشاشة بيعرف إنه loading.
 *
 * الاستخدام:
 *   <RoleSwitchOverlay active role="seller" />
 */
export default function RoleSwitchOverlay({ active, role = "customer" }) {
  const [show, setShow] = useState(active);

  // ✅ نعطي الـ fade-out فرصة (130ms) قبل ما نخفي الـ overlay من الـ DOM
  useEffect(() => {
    if (active) {
      setShow(true);
    } else {
      const t = setTimeout(() => setShow(false), 180);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!show) return null;

  const isCustomer = role === "customer";
  const title = isCustomer ? "جاري التحويل لوضع المشتري" : "جاري التحويل لوضع البائع";
  const subtitle = isCustomer
    ? "نحضّر لك واجهة المشتري ومحادثاتك وسلتك…"
    : "نحضّر لك لوحة البائع، طلباتك وإشعاراتك…";

  return (
    <div
      className={`rso-overlay ${active ? "rso-overlay--enter" : "rso-overlay--exit"}`}
      role="status"
      aria-live="polite"
      aria-busy={active ? "true" : "false"}
      dir="rtl"
    >
      {/* ── Top progress bar (شريط رفيع متحرك) ── */}
      <div className="rso-progress" aria-hidden="true">
        <div className="rso-progress-bar" />
      </div>

      {/* ── Status badge (Spinner + Title) ── */}
      <div className="rso-status">
        <div className="rso-status-icon">
          {isCustomer ? (
            <ShoppingBag size={20} strokeWidth={2.2} />
          ) : (
            <ShieldCheck size={20} strokeWidth={2.2} />
          )}
          <div className="rso-spinner-ring" aria-hidden="true">
            <Loader2 size={28} className="rso-spinner" />
          </div>
        </div>
        <div className="rso-status-text">
          <h2 className="rso-title">
            {title}
            <span className="rso-title-dots" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </h2>
          <p className="rso-subtitle">{subtitle}</p>
        </div>
      </div>

      {/* ── Skeleton preview يحاكي الـ layout الجديد ── */}
      {isCustomer ? <CustomerSkeleton /> : <SellerSkeleton />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Skeleton variants
   ───────────────────────────────────────────────────────── */

function CustomerSkeleton() {
  return (
    <div className="rso-skel rso-skel--customer" aria-hidden="true">
      {/* header strip — يحاكي الـ navbar */}
      <div className="rso-skel-header">
        <div className="rso-skel-logo" />
        <div className="rso-skel-nav">
          <div className="rso-skel-pill" />
          <div className="rso-skel-pill" />
          <div className="rso-skel-pill" />
        </div>
        <div className="rso-skel-actions">
          <div className="rso-skel-icon" />
          <div className="rso-skel-icon" />
          <div className="rso-skel-avatar-sm" />
        </div>
      </div>

      {/* hero — يحاكي الـ home page */}
      <div className="rso-skel-hero">
        <div className="rso-skel-hero-text">
          <div className="rso-skel-line rso-skel-line--title" />
          <div className="rso-skel-line rso-skel-line--sub" />
          <div className="rso-skel-buttons">
            <div className="rso-skel-btn rso-skel-btn--primary" />
            <div className="rso-skel-btn" />
          </div>
        </div>
        <div className="rso-skel-hero-image" />
      </div>

      {/* categories row */}
      <div className="rso-skel-section-title" />
      <div className="rso-skel-categories">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="rso-skel-category" key={i} />
        ))}
      </div>

      {/* products grid */}
      <div className="rso-skel-section-title" style={{ width: "30%" }} />
      <div className="rso-skel-products">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="rso-skel-product" key={i}>
            <div className="rso-skel-product-img" />
            <div className="rso-skel-product-line" />
            <div className="rso-skel-product-line rso-skel-product-line--short" />
            <div className="rso-skel-product-footer">
              <div className="rso-skel-product-price" />
              <div className="rso-skel-product-icon" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SellerSkeleton() {
  return (
    <div className="rso-skel rso-skel--seller" aria-hidden="true">
      {/* header strip — يحاكي الـ seller navbar */}
      <div className="rso-skel-header rso-skel-header--seller">
        <div className="rso-skel-logo" />
        <div className="rso-skel-nav">
          <div className="rso-skel-pill" />
          <div className="rso-skel-pill" />
          <div className="rso-skel-pill" />
          <div className="rso-skel-pill" />
        </div>
        <div className="rso-skel-actions">
          <div className="rso-skel-icon" />
          <div className="rso-skel-icon" />
          <div className="rso-skel-avatar-sm" />
        </div>
      </div>

      {/* page title */}
      <div className="rso-skel-page-title">
        <div className="rso-skel-line rso-skel-line--title" />
        <div className="rso-skel-line rso-skel-line--sub" />
      </div>

      {/* stats grid — 4 cards */}
      <div className="rso-skel-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="rso-skel-stat" key={i}>
            <div className="rso-skel-stat-icon" />
            <div className="rso-skel-stat-lines">
              <div className="rso-skel-line" style={{ width: "55%", height: 18 }} />
              <div className="rso-skel-line rso-skel-line--sub" />
            </div>
          </div>
        ))}
      </div>

      {/* two-column: orders list + recent reviews */}
      <div className="rso-skel-columns">
        <div className="rso-skel-panel">
          <div className="rso-skel-panel-title" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="rso-skel-order" key={i}>
              <div className="rso-skel-order-img" />
              <div className="rso-skel-order-body">
                <div className="rso-skel-line" style={{ width: "40%" }} />
                <div className="rso-skel-line rso-skel-line--sub" />
              </div>
              <div className="rso-skel-pill rso-skel-pill--small" />
            </div>
          ))}
        </div>
        <div className="rso-skel-panel">
          <div className="rso-skel-panel-title" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div className="rso-skel-review" key={i}>
              <div className="rso-skel-avatar-sm" />
              <div className="rso-skel-review-body">
                <div className="rso-skel-line" style={{ width: "50%" }} />
                <div className="rso-skel-line rso-skel-line--sub" />
                <div className="rso-skel-line" style={{ width: "85%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
