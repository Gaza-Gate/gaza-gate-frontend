import { AlertCircle, Inbox } from "lucide-react";
import "./StateView.css";
import "./Skeleton.css";

/* ──────────────────────────────────────────────────────────
   Skeleton primitives (شيمر زي باقي العناصر)
   ────────────────────────────────────────────────────────── */

export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  circle = false,
  className = "",
  style = {},
}) {
  return (
    <span
      className={`skel ${circle ? "skel-circle" : ""} ${className}`.trim()}
      style={{
        width: circle ? height : width,
        height,
        borderRadius: circle ? "50%" : radius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, lastWidth = "60%", gap = 8 }) {
  const widths = ["100%", "90%", lastWidth, "75%", "85%"];
  return (
    <div className="skel-stack" style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={widths[i] || "80%"}
          height={i === 0 ? 16 : 12}
        />
      ))}
    </div>
  );
}

export function SkeletonBlock({
  width = "100%",
  height = 120,
  radius = 14,
  className = "",
}) {
  return (
    <Skeleton
      width={width}
      height={height}
      radius={radius}
      className={className}
    />
  );
}

/* ──────────────────────────────────────────────────────────
   Page-specific skeleton layouts
   ────────────────────────────────────────────────────────── */

/** شبكة منتجات — تستعمل في صفحة المنتجات/المتجر */
export function ProductGridSkeleton({ count = 6, columns = 4 }) {
  return (
    <div
      className="skel-grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-product-card" key={i}>
          <div className="skel skel-product-img" />
          <div className="skel-product-body">
            <Skeleton width="40%" height={10} />
            <Skeleton width="85%" height={13} />
            <div className="skel-product-footer">
              <Skeleton width="40%" height={14} />
              <div className="skel skel-icon-btn" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** كارد متجر — يستعمل في صفحة المتجر */
export function StoreProfileSkeleton() {
  return (
    <div className="skel-stack" style={{ gap: 20 }}>
      {/* hero */}
      <div className="skel-hero">
        <div className="skel skel-avatar" />
        <div className="skel-stack" style={{ gap: 10, flex: 1 }}>
          <Skeleton width="40%" height={22} />
          <Skeleton width="70%" height={12} />
          <div className="skel-row" style={{ gap: 8 }}>
            <Skeleton width={80} height={22} radius={999} />
            <Skeleton width={70} height={22} radius={999} />
            <Skeleton width={90} height={22} radius={999} />
          </div>
        </div>
      </div>
      {/* trust strip */}
      <div className="skel-trust-strip">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="skel-trust-item" key={i}>
            <div className="skel skel-icon" />
            <div className="skel-stack" style={{ gap: 4, flex: 1 }}>
              <Skeleton width="50%" height={12} />
              <Skeleton width="80%" height={10} />
            </div>
          </div>
        ))}
      </div>
      {/* tabs */}
      <div className="skel-tabs">
        <Skeleton width="33%" height={40} radius={12} />
        <Skeleton width="33%" height={40} radius={12} />
        <Skeleton width="33%" height={40} radius={12} />
      </div>
      {/* product grid */}
      <ProductGridSkeleton count={6} columns={4} />
    </div>
  );
}

/** صفوف طلبات — تستعمل في صفحات الطلبات */
export function OrderListSkeleton({ count = 4 }) {
  return (
    <div className="skel-stack" style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-order-card" key={i}>
          <div className="skel skel-order-img" />
          <div className="skel-stack" style={{ gap: 8, flex: 1 }}>
            <Skeleton width="40%" height={14} />
            <Skeleton width="70%" height={12} />
            <div className="skel-row" style={{ gap: 8 }}>
              <Skeleton width={70} height={20} radius={999} />
              <Skeleton width={50} height={12} />
            </div>
          </div>
          <div className="skel-stack" style={{ gap: 6, alignItems: "flex-end" }}>
            <Skeleton width={60} height={16} />
            <Skeleton width={40} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** جدول بيانات — للوحات الأدمن/البائع */
export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="skel-table-card">
      <div className="skel-table-head">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="70%" height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skel-table-row" key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              width={c === 0 ? "60%" : "80%"}
              height={12}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** كروت إحصائيات — للأدمن داشبورد */
export function StatsGridSkeleton({ count = 4 }) {
  return (
    <div className="skel-stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-stat-card" key={i}>
          <div className="skel skel-icon" />
          <div className="skel-stack" style={{ gap: 8, flex: 1 }}>
            <Skeleton width="50%" height={10} />
            <Skeleton width="35%" height={20} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** ليست إشعارات */
export function NotificationListSkeleton({ count = 5 }) {
  return (
    <div className="skel-stack" style={{ gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-notif-row" key={i}>
          <div className="skel skel-icon" />
          <div className="skel-stack" style={{ gap: 6, flex: 1 }}>
            <Skeleton width="65%" height={12} />
            <Skeleton width="85%" height={10} />
          </div>
          <Skeleton width={40} height={10} />
        </div>
      ))}
    </div>
  );
}

/** كارد تفاصيل منتج */
export function ProductDetailsSkeleton() {
  return (
    <div className="skel-pd-wrap">
      <div className="skel skel-pd-img" />
      <div className="skel-stack" style={{ gap: 14, flex: 1 }}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="80%" height={24} />
        <div className="skel-row" style={{ gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skel skel-mini-icon" />
          ))}
          <Skeleton width={50} height={12} />
        </div>
        <Skeleton width="40%" height={28} />
        <Skeleton width="100%" height={10} />
        <Skeleton width="95%" height={10} />
        <Skeleton width="90%" height={10} />
        <div className="skel-row" style={{ gap: 10, marginTop: 8 }}>
          <Skeleton width="50%" height={44} radius={12} />
          <Skeleton width="50%" height={44} radius={12} />
        </div>
      </div>
    </div>
  );
}

/** كارد تفاصيل طلب */
export function OrderDetailsSkeleton() {
  return (
    <div className="skel-stack" style={{ gap: 18 }}>
      <div className="skel-row" style={{ gap: 12 }}>
        <Skeleton width={120} height={12} />
        <Skeleton width={80} height={22} radius={999} />
      </div>
      <div className="skel-stack" style={{ gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="skel-order-card" key={i}>
            <div className="skel skel-order-img" />
            <div className="skel-stack" style={{ gap: 6, flex: 1 }}>
              <Skeleton width="50%" height={13} />
              <Skeleton width="80%" height={10} />
            </div>
            <Skeleton width={50} height={14} />
          </div>
        ))}
      </div>
      <div className="skel-block-card">
        <Skeleton width="35%" height={12} />
        <Skeleton width="60%" height={18} style={{ marginTop: 6 }} />
        <Skeleton width="50%" height={18} style={{ marginTop: 6 }} />
        <Skeleton width="100%" height={1} style={{ marginTop: 12 }} />
        <Skeleton width="40%" height={20} style={{ marginTop: 12 }} />
      </div>
    </div>
  );
}

/** بروفايل شخصي */
export function ProfileSkeleton() {
  return (
    <div className="skel-stack" style={{ gap: 16 }}>
      <div className="skel-profile-head">
        <div className="skel skel-avatar" />
        <div className="skel-stack" style={{ gap: 8, flex: 1 }}>
          <Skeleton width="35%" height={18} />
          <Skeleton width="55%" height={12} />
        </div>
      </div>
      <div className="skel-block-card">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="skel-row" style={{ gap: 12, marginBottom: 12 }} key={i}>
            <Skeleton width={90} height={10} />
            <Skeleton width="60%" height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   EmptyState + ErrorState (نفس الستايل الموحد)
   ────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon = Inbox,
  title = "لا توجد بيانات",
  description,
  action,
  variant = "page",
  className = "",
}) {
  return (
    <div className={`sv-wrap sv-${variant} ${className}`.trim()}>
      <div className="sv-inner sv-empty" role="status">
        <div className="sv-art">
          <Icon size={42} strokeWidth={1.4} />
        </div>
        <h3 className="sv-title">{title}</h3>
        {description && <p className="sv-desc">{description}</p>}
        {action && <div className="sv-action">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({
  icon: Icon = AlertCircle,
  title = "حدث خطأ",
  message,
  onRetry,
  retryLabel = "إعادة المحاولة",
  variant = "page",
  className = "",
}) {
  return (
    <div className={`sv-wrap sv-${variant} ${className}`.trim()}>
      <div className="sv-inner sv-error" role="alert">
        <div className="sv-art sv-art-error">
          <Icon size={42} strokeWidth={1.5} />
        </div>
        <h3 className="sv-title">{title}</h3>
        {message && <p className="sv-desc">{message}</p>}
        {onRetry && (
          <button className="sv-retry" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   LoadingState — متوافق مع الاستعمال القديم (default: shimmer)
   ────────────────────────────────────────────────────────── */

export default function LoadingState({ variant = "page", className = "" }) {
  return (
    <div className={`sv-wrap sv-${variant} ${className}`.trim()}>
      <div className="sv-inner">
        <div className="skel-shimmer-stack">
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={11} />
        </div>
      </div>
    </div>
  );
}
