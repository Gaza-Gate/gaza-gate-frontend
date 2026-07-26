import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingBag,
  Star,
  Package,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Inbox,
  Filter,
  X,
  ExternalLink,
  Calendar,
  Clock,
  Eye,
} from "lucide-react";

import {
  getCustomerNotifications,
  markCustomerNotificationRead,
  markAllCustomerNotificationsRead,
} from "../services/notificationService";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

import "./NotificationsPage.css";

// ── Constants ──────────────────────────────────────────────
// 4 أنواع الإشعارات بالـ API (بالحروف الكبيرة): ORDER, SYSTEM, PROMOTIONAL, GENERAL
const TYPE_META = {
  ORDER: {
    key: "ORDER",
    label: "طلبات",
    icon: ShoppingBag,
    color: "#2563eb",
    bg: "#dbeafe",
  },
  SYSTEM: {
    key: "SYSTEM",
    label: "النظام",
    icon: Settings,
    color: "#475569",
    bg: "#f1f5f9",
  },
  PROMOTIONAL: {
    key: "PROMOTIONAL",
    label: "عروض",
    icon: Star,
    color: "#f97316",
    bg: "#fff7ed",
  },
  GENERAL: {
    key: "GENERAL",
    label: "عام",
    icon: Bell,
    color: "#7c3aed",
    bg: "#f3e8ff",
  },
};

// تطبيع الـ type (الباك إند يبعت uppercase، نحنا بدنا lowercase للـ grouping)
const normType = (t) => (t ? String(t).toUpperCase() : "GENERAL");

const TABS = [
  { key: "all", label: "الكل" },
  { key: "ORDER", label: "الطلبات" },
  { key: "PROMOTIONAL", label: "العروض" },
  { key: "SYSTEM", label: "النظام" },
  { key: "GENERAL", label: "عام" },
];

// ── Helpers ────────────────────────────────────────────────
function getNotifDate(n) {
  // الـ API الحقيقي بيستعمل "sentAt"
  return n?.sentAt || n?.createdAt || n?.created_at;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${days} يوم`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;
  return d.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
  });
}

function getMeta(type) {
  const key = normType(type);
  return TYPE_META[key] || TYPE_META.GENERAL;
}

function isRead(n) {
  return Boolean(n?.isRead ?? n?.read ?? n?.read_at);
}

function getId(n) {
  return n?.id ?? n?._id;
}

function getTitle(n) {
  return n?.title || "";
}

function getContent(n) {
  // الـ API الحقيقي بيستعمل "content" (مش body)
  return n?.content || n?.body || n?.message || "";
}

function getSender(n) {
  return n?.sender || null;
}

/**
 * استخراج بيانات الـ order من الإشعار — بيدعم أكثر من shape من الباك
 * (في كل backend response shape مختلف شوي)
 */
function getOrder(n) {
  if (!n) return null;
  if (n.order) return n.order;

  // ── Flat shape: orderId / order_id / orderNumber مباشر على الإشعار ──
  const flatId = n.orderId || n.order_id || n.orderID;
  if (flatId) {
    return {
      id: flatId,
      orderNumber: n.orderNumber || n.order_number,
      status: n.orderStatus || n.order_status || n.status,
      totalPrice: n.orderTotal ?? n.order_total ?? n.totalPrice,
    };
  }
  return null;
}

/**
 * استخراج order ID من الإشعار — حتى لو الـ order object كامل مش موجود
 */
function getOrderId(n) {
  const order = getOrder(n);
  if (order?.id) return order.id;
  if (order?._id) return order._id;
  if (order?.orderId) return order.orderId;
  if (n?.orderId) return n.orderId;
  if (n?.order_id) return n.order_id;
  return null;
}

/**
 * استخراج بيانات الـ review من الإشعار — بيدعم أكثر من shape من الباك
 * (reviewId, review_id, review object, data.review)
 */
function getReview(n) {
  if (!n) return null;
  if (n.review && typeof n.review === "object") return n.review;
  const id = n.reviewId || n.review_id || n?.data?.reviewId;
  if (id) return { id };
  return null;
}

/**
 * استخراج بيانات الـ product من الإشعار — بيدعم أكثر من shape من الباك
 * (productId, product_id, product object, review.product, order.product, data.product)
 */
function getProduct(n) {
  if (!n) return null;
  // 1) مباشر على الإشعار
  if (n.product && typeof n.product === "object" && n.product.id) return n.product;
  const directId = n.productId || n.product_id || n?.data?.productId;
  if (directId) return { id: directId };

  // 2) جوّا الـ review object
  const review = getReview(n);
  if (review) {
    if (review.productId || review.product_id) {
      return { id: review.productId || review.product_id };
    }
    if (review.product?.id) return review.product;
  }

  // 3) جوّا الـ order object
  const order = getOrder(n);
  if (order) {
    if (order.product?.id) return order.product;
    if (order.productId) return { id: order.productId };
  }

  return null;
}

/**
 * كشف إذا الإشعار عن "رد على تقييم" — بيستخدم:
 * 1) الحقول الصريحة (reviewId, productId, review, product)
 * 2) كلمات مفتاحية بالـ title/content
 */
function isReviewReply(n) {
  if (!n) return false;
  // 1) لو في review/product fields مباشرة
  if (n.reviewId || n.review_id || n.review) return true;
  if (n.productId || n.product_id || n.product) return true;
  if (n?.data?.reviewId || n?.data?.productId) return true;

  // 2) كلمات مفتاحية بالـ title/content
  const title = String(getTitle(n) || "").toLowerCase();
  const content = String(getContent(n) || "").toLowerCase();
  const reviewKeywords = [
    "رد على تقييم",
    "رد على مراجعة",
    "رد على تقييمك",
    "رد على مراجعتك",
    "replied to your review",
    "replied to your rating",
    "review reply",
  ];
  return reviewKeywords.some(
    (kw) => title.includes(kw) || content.includes(kw)
  );
}

/**
 * اشتقاق الـ action button من الإشعار — بيجرب:
 * 1) إشعار "رد على تقييم" → روح على المنتج (مع reviewId لو متوفر)
 * 2) actionUrl الجاهز من الباك إند
 * 3) routes محسوبة من order.id
 * 4) رابط المتجر من sender.id
 */
function getNotificationActions(n) {
  if (!n) return [];
  const actions = [];
  const order = getOrder(n);
  const sender = getSender(n);

  // ── 1) إشعار "رد على تقييم" → روح على المنتج مباشرة ──
  if (isReviewReply(n)) {
    const product = getProduct(n);
    const review = getReview(n);
    if (product?.id) {
      const params = new URLSearchParams();
      if (review?.id) params.set("reviewId", review.id);
      const query = params.toString();
      actions.push({
        key: "view-review-reply",
        label: "عرض الرد على التقييم",
        icon: ExternalLink,
        type: normType(n.type),
        path: `/product/${product.id}${query ? `?${query}` : ""}`,
      });
      return actions;
    }
  }

  // ── 2) لو في actionUrl جاهز من الباك إند ──
  if (n.actionUrl) {
    let label = "عرض التفاصيل";
    if (normType(n.type) === "ORDER") label = "عرض تفاصيل الطلب";
    else if (normType(n.type) === "PROMOTIONAL") label = "عرض العرض";
    else if (normType(n.type) === "SYSTEM") label = "عرض التفاصيل";
    actions.push({
      key: "primary",
      label,
      icon: ExternalLink,
      type: normType(n.type),
      path: n.actionUrl,
    });
    return actions; // الباك إند وفّر الرابط الجاهز
  }

  // ── 3) fallback: اشتق من order object أو orderId المباشر ──
  const orderId = getOrderId(n);
  if (orderId) {
    actions.push({
      key: "view-order",
      label: "عرض تفاصيل الطلب",
      icon: ShoppingBag,
      type: "ORDER",
      path: `/my-orders/${orderId}`,
    });
  }

  // ── 4) رابط المتجر من sender.id (لو البائع) ──
  const senderId = sender?.id || sender?._id || n?.senderId;
  if (senderId && normType(n.type) === "ORDER") {
    actions.push({
      key: "view-store",
      label: "عرض المتجر",
      icon: ExternalLink,
      type: "GENERAL",
      path: `/customer/store/${senderId}`,
    });
  }

  return actions;
}

function formatFullDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Main Component ─────────────────────────────────────────
export default function CustomerNotifications() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  const [notifs, setNotifs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    order: 0,
    general: 0,
    system: 0,
    promotional: 0,
    unRead: 0,
  });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const inFlightRef = useRef(false);

  // ── جلب الإشعارات (مع pagination) ──
  const load = useCallback(
    async (pageNum = 1, append = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        const data = await getCustomerNotifications(pageNum);
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        const s = data?.stats ?? {};
        const p = data?.pagination ?? null;

        setStats({
          total: s.total ?? list.length,
          order: s.order ?? 0,
          general: s.general ?? 0,
          system: s.system ?? 0,
          promotional: s.promotional ?? 0,
          unRead: s.unRead ?? 0,
        });
        setPagination(p);
        setPage(pageNum);

        if (append) {
          setNotifs((prev) => [...prev, ...list]);
        } else {
          setNotifs(list);
        }
      } catch (err) {
        console.error("Notifications error:", err);
        setError(
          err?.response?.data?.message || err.message || "تعذر جلب الإشعارات"
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        inFlightRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // ── Mark single as read (optimistic) ──
  const markOneRead = useCallback(async (id) => {
    if (!id) return;
    setNotifs((prev) =>
      prev.map((n) => (getId(n) === id ? { ...n, isRead: true, read: true } : n))
    );
    setStats((prev) => ({ ...prev, unRead: Math.max(0, prev.unRead - 1) }));

    try {
      await markCustomerNotificationRead(id);
    } catch (err) {
      console.error("Mark read error:", err);
      // rollback على الفشل
      setNotifs((prev) =>
        prev.map((n) => (getId(n) === id ? { ...n, isRead: false, read: false } : n))
      );
      setStats((prev) => ({ ...prev, unRead: prev.unRead + 1 }));
    }
  }, []);

  // ── Mark all as read (optimistic) ──
  const markAll = useCallback(async () => {
    if (markingAll || stats.unRead === 0) return;
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    const prevUnread = stats.unRead;
    setStats((prev) => ({ ...prev, unRead: 0 }));

    try {
      await markAllCustomerNotificationsRead();
    } catch (err) {
      console.error("Mark all read error:", err);
      // rollback
      setStats((prev) => ({ ...prev, unRead: prevUnread }));
      setNotifs((prev) =>
        prev.map((n) => ({ ...n, isRead: false, read: false }))
      );
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, stats.unRead]);

  // ── Tabs (filtering) ──
  const visible = useMemo(() => {
    if (activeTab === "all") return notifs;
    return notifs.filter((n) => normType(n.type) === activeTab);
  }, [notifs, activeTab]);

  // عدادات الـ tabs (من اللوكال)
  const tabCounts = useMemo(() => {
    const local = { all: notifs.filter((n) => !isRead(n)).length };
    TABS.forEach((t) => {
      if (t.key === "all") return;
      const c = notifs.filter(
        (n) => normType(n.type) === t.key && !isRead(n)
      ).length;
      local[t.key] = c;
    });
    return local;
  }, [notifs]);

  // ── فتح التفاصيل + mark read (في نفس الوقت) ──
  const openNotif = useCallback(
    async (n) => {
      if (!n) return;
      setSelectedNotif(n);
      const id = getId(n);
      if (id && !isRead(n)) {
        markOneRead(id);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const closeNotif = useCallback(() => {
    setSelectedNotif(null);
  }, []);

  const handleActionClick = useCallback(
    (action) => {
      if (!action?.path) return;
      // تعليم كمقروء قبل التنقل
      if (selectedNotif && !isRead(selectedNotif)) {
        markOneRead(getId(selectedNotif));
      }
      closeNotif();
      navigate(action.path);
    },
    [selectedNotif, navigate] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const statCards = [
    { key: "total", label: "إجمالي الإشعارات", value: stats.total, icon: Inbox, accent: "#6b7280" },
    { key: "unRead", label: "غير مقروءة", value: stats.unRead, icon: Bell, accent: "#f97316" },
    { key: "order", label: "الطلبات", value: stats.order, icon: ShoppingBag, accent: "#2563eb" },
    { key: "system", label: "النظام", value: stats.system, icon: Settings, accent: "#475569" },
  ];

  return (
    <div className="np-root" dir="rtl">
      <main className="np-main">
        {/* ── Header ── */}
        <div className="np-header">
          <div className="np-header-info">
            <h1 className="np-page-title">
              <Bell size={22} />
              الإشعارات
            </h1>
            <p className="np-page-sub">
              {stats.unRead > 0
                ? `لديك ${stats.unRead} إشعار غير مقروء`
                : "كل الإشعارات مقروءة"}
            </p>
          </div>
          <div className="np-header-actions">
            <button
              className="np-btn-mark-all"
              onClick={markAll}
              disabled={markingAll || stats.unRead === 0}
            >
              {markingAll ? (
                <Loader2 size={15} className="np-spin" />
              ) : (
                <CheckCheck size={15} />
              )}
              تعيين الكل كمقروء
            </button>
            <button
              className="np-btn-refresh"
              onClick={() => load(1)}
              disabled={loading}
              aria-label="تحديث"
              title="تحديث"
            >
              <RefreshCw size={15} className={loading ? "np-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Stats cards ── */}
        <div className="np-stats">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div className="np-stat-card" key={s.key}>
                <div
                  className="np-stat-icon"
                  style={{
                    background: `${s.accent}15`,
                    color: s.accent,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="np-stat-info">
                  <span className="np-stat-value">{s.value}</span>
                  <span className="np-stat-label">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tabs + filters ── */}
        <div className="np-tabs">
          <div className="np-tabs-list">
            {TABS.map((tab) => {
              const count = tabCounts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  className={`np-tab ${activeTab === tab.key ? "np-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {count > 0 && <span className="np-tab-badge">{count}</span>}
                </button>
              );
            })}
          </div>
          <div className="np-tabs-filter" title="فلتر">
            <Filter size={14} />
          </div>
        </div>

        {/* ── List ── */}
        <div className="np-list">
          {loading ? (
            <div className="np-list-loading">
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="np-skel-item" key={i}>
                  <div className="np-skel-icon" />
                  <div className="np-skel-lines">
                    <div className="np-skel-line w70" />
                    <div className="np-skel-line w40" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="np-empty">
              <div className="np-empty-art" style={{ background: "#fef2f2", color: "#ef4444" }}>
                <AlertCircle size={42} />
              </div>
              <h3>تعذر جلب الإشعارات</h3>
              <p>{error}</p>
              <button className="np-retry-btn" onClick={() => load(1)}>
                <RefreshCw size={15} />
                إعادة المحاولة
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="np-empty">
              <div className="np-empty-art">
                <Bell size={42} />
              </div>
              <h3>
                {activeTab === "all"
                  ? "لا توجد إشعارات"
                  : `لا توجد إشعارات ${getMeta(activeTab).label.toLowerCase()}`}
              </h3>
              <p>
                {activeTab === "all"
                  ? "ستظهر هنا كل التحديثات على طلباتك ومنتجاتك وتقييماتك"
                  : "جرّب تبويب آخر أو ارجع لاحقاً"}
              </p>
            </div>
          ) : (
            visible.map((n) => {
              const id = getId(n);
              const meta = getMeta(n.type);
              const Icon = meta.icon;
              const read = isRead(n);
              const title = getTitle(n);
              const content = getContent(n);
              const sender = getSender(n);
              const order = getOrder(n);
              const date = getNotifDate(n);
              return (
                <button
                  key={id}
                  type="button"
                  className={`np-item ${!read ? "np-item-unread" : ""}`}
                  onClick={() => openNotif(n)}
                >
                  <div
                    className="np-item-icon"
                    style={{
                      background: meta.bg,
                      color: meta.color,
                    }}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div className="np-item-body">
                    {title && <div className="np-item-title">{title}</div>}
                    {content && (
                      <div className="np-item-desc">{content}</div>
                    )}
                    <div className="np-item-meta">
                      <span
                        className="np-item-type-tag"
                        style={{
                          background: meta.bg,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                      {order?.orderNumber && (
                        <span className="np-item-order-tag">
                          {order.orderNumber}
                        </span>
                      )}
                      {date && (
                        <span className="np-item-time">{timeAgo(date)}</span>
                      )}
                    </div>
                    {sender?.name && (
                      <div className="np-item-sender">من: {sender.name}</div>
                    )}
                  </div>
                  <div className="np-item-right">
                    {!read && <span className="np-unread-dot" aria-label="غير مقروء" />}
                    <Eye size={14} color="#cbd5e1" style={{ marginTop: 4 }} />
                  </div>
                </button>
              );
            })
          )}

          {/* ── Pagination ── */}
          {!loading && pagination && pagination.totalPages > 1 && (
            <div className="np-pagination">
              <button
                className="np-page-btn"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => load(page - 1)}
              >
                <ChevronRight size={15} />
                السابق
              </button>
              <span className="np-page-info">
                صفحة {pagination.currentPage} من {pagination.totalPages}
              </span>
              <button
                className="np-page-btn"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => load(page + 1)}
              >
                التالي
                <ChevronLeft size={15} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Notification detail modal ── */}
      {selectedNotif && (
        <NotificationDetailModal
          notif={selectedNotif}
          onClose={closeNotif}
          onAction={handleActionClick}
        />
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────
function NotificationDetailModal({ notif, onClose, onAction }) {
  const meta = getMeta(notif.type);
  const Icon = meta.icon;
  const title = getTitle(notif);
  const content = getContent(notif);
  const sender = getSender(notif);
  const order = getOrder(notif);
  const date = getNotifDate(notif);
  const actions = getNotificationActions(notif);
  const read = isRead(notif);

  // إغلاق بـ Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="np-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="np-modal" dir="rtl" role="dialog" aria-modal="true">
        {/* ── Header ── */}
        <div
          className="np-modal-header"
          style={{
            background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}dd 100%)`,
          }}
        >
          <button
            type="button"
            className="np-modal-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
          <div className="np-modal-header-info">
            <h2 className="np-modal-title">{title || "إشعار"}</h2>
            <div className="np-modal-type-badge" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Icon size={12} />
              {meta.label}
            </div>
          </div>
          <div
            className="np-modal-header-icon"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <Icon size={22} />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="np-modal-body">
          {/* Content */}
          {content && (
            <div className="np-modal-content">
              <p>{content}</p>
            </div>
          )}

          {/* Sender */}
          {sender?.name && (
            <div className="np-modal-row">
              <div className="np-modal-row-icon" style={{ background: meta.bg, color: meta.color }}>
                <Icon size={14} />
              </div>
              <div className="np-modal-row-info">
                <span className="np-modal-row-label">المرسل</span>
                <span className="np-modal-row-value">{sender.name}</span>
              </div>
            </div>
          )}

          {/* Order details */}
          {order && (
            <div className="np-modal-order">
              <div className="np-modal-order-head">
                <ShoppingBag size={16} color={meta.color} />
                <strong>تفاصيل الطلب</strong>
              </div>
              <div className="np-modal-order-grid">
                <div className="np-modal-order-item">
                  <span className="np-modal-order-label">رقم الطلب</span>
                  <span className="np-modal-order-value">
                    {order.orderNumber || order.id?.slice(0, 8) || "—"}
                  </span>
                </div>
                {order.status && (
                  <div className="np-modal-order-item">
                    <span className="np-modal-order-label">الحالة</span>
                    <span className="np-modal-order-value">
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                )}
                {order.totalPrice != null && (
                  <div className="np-modal-order-item">
                    <span className="np-modal-order-label">المبلغ</span>
                    <span className="np-modal-order-value">
                      {order.totalPrice} ₪
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date */}
          {date && (
            <div className="np-modal-row">
              <div className="np-modal-row-icon" style={{ background: meta.bg, color: meta.color }}>
                <Calendar size={14} />
              </div>
              <div className="np-modal-row-info">
                <span className="np-modal-row-label">تاريخ الإرسال</span>
                <span className="np-modal-row-value">{formatFullDate(date)}</span>
              </div>
            </div>
          )}

          {/* Read status */}
          <div className="np-modal-read-status">
            <span
              className={`np-modal-read-dot ${read ? "read" : "unread"}`}
            />
            <span>{read ? "تمت القراءة" : "لم تتم القراءة بعد"}</span>
          </div>
        </div>

        {/* ── Footer (actions) ── */}
        {actions.length > 0 && (
          <div className="np-modal-footer">
            {actions.map((a) => {
              const ActionIcon = a.icon;
              return (
                <button
                  key={a.key}
                  type="button"
                  className="np-modal-action-btn"
                  onClick={() => onAction(a)}
                >
                  <ActionIcon size={16} />
                  <span>{a.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="np-modal-btn-close"
              onClick={onClose}
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper بسيط لتحويل الـ order status → label (نفس الي بستعمله الباقي)
const STATUS_LABELS = {
  pending_review: "قيد المراجعة",
  approved: "تم القبول",
  preparing: "قيد التحضير",
  shipped: "قيد الشحن",
  delivered: "تم التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  canceled: "ملغي",
};
function getStatusLabel(s) {
  return STATUS_LABELS[s] || s;
}
