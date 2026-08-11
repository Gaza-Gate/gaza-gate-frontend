// src/pages/SellerNotifications.jsx
//
// صفحة إشعارات البائع — تستخدم endpoint البائع الصحيح من Postman.
//   GET /api/seller/notification?page=1&limit=10
//
// Response shape (من Postman):
//   {
//     status: "success",
//     data: {
//       notifications: [{ id, type, title, content, actionUrl, isRead, sentAt,
//                          sender: {id, name}, order: {id, orderNumber, status} }],
//       stats: { total, order, general, system, promotional, unRead },
//       pagination: { currentPage, totalPages, totalItems, pageSize,
//                      hasNextPage, hasPreviousPage }
//     }
//   }
//
// ✅ ملاحظات:
//   - لا يوجد filter صارم هنا — الباك يفصل الدور من الـ endpoint
//   - نتعامل مع 4 types: ORDER, SYSTEM, PROMOTIONAL, GENERAL
//   - socket event: "notification:new"

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
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
  Eye,
  Trash2,
} from "lucide-react";

import {
  getSellerNotifications,
  markSellerNotificationRead,
  markAllSellerNotificationsRead,
  deleteSellerNotification,
  extractNotifications,
  extractStats,
  extractPagination,
} from "../services/notificationService";

import { connectSocket } from "../utils/socket";
import { resolveNotificationRoute } from "../utils/notificationRoutes";
import { isSellerNotification } from "../utils/notificationRoleFilter";

import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../utils/errorHelper";
import { useSwipeToDismiss } from "../hooks/useSwipeToDismiss";

import "./NotificationsPage.css";

const NEW_NOTIFICATION_EVENT = "notification:new";

/* ── Constants ────────────────────────────────────────────── */
// 4 أنواع الإشعارات (من Postman) — بالحروف الكبيرة
// ✅ فقط لونين: أزرق + برتقالي
const TYPE_META = {
  ORDER:       { key: "ORDER",       label: "طلبات",  icon: ShoppingBag, color: "#2563eb", bg: "#dbeafe" },
  SYSTEM:      { key: "SYSTEM",      label: "النظام",  icon: Settings,    color: "#2563eb", bg: "#dbeafe" },
  PROMOTIONAL: { key: "PROMOTIONAL", label: "عروض",    icon: Star,        color: "#f97316", bg: "#fff7ed" },
  GENERAL:     { key: "GENERAL",     label: "عام",     icon: Bell,        color: "#2563eb", bg: "#dbeafe" },
};

const normType = (t) => (t ? String(t).toUpperCase() : "GENERAL");

const TABS = [
  { key: "all",         label: "الكل" },
  { key: "ORDER",       label: "الطلبات" },
  { key: "PROMOTIONAL", label: "العروض" },
  { key: "SYSTEM",      label: "النظام" },
  { key: "GENERAL",     label: "عام" },
];

/* ── Helpers ──────────────────────────────────────────────── */

function getNotifDate(n) {
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
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

function getMeta(type) {
  return TYPE_META[normType(type)] || TYPE_META.GENERAL;
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
  return n?.content || n?.body || n?.message || "";
}

function getSender(n) {
  return n?.sender || null;
}

function getOrder(n) {
  if (!n) return null;
  if (n.order) return n.order;
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

function getOrderId(n) {
  const order = getOrder(n);
  return (
    order?.id || order?._id || order?.orderId ||
    n?.orderId || n?.order_id || null
  );
}

function getReview(n) {
  if (!n) return null;
  if (n.review && typeof n.review === "object") return n.review;
  const id = n.reviewId || n.review_id || n?.data?.reviewId;
  if (id) return { id };
  return null;
}

function getProduct(n) {
  if (!n) return null;
  if (n.product && typeof n.product === "object" && n.product.id) return n.product;
  const directId = n.productId || n.product_id || n?.data?.productId;
  if (directId) return { id: directId };
  const review = getReview(n);
  if (review) {
    if (review.productId || review.product_id) return { id: review.productId || review.product_id };
    if (review.product?.id) return review.product;
  }
  const order = getOrder(n);
  if (order) {
    if (order.product?.id) return order.product;
    if (order.productId) return { id: order.productId };
  }
  return null;
}

function isReviewReply(n) {
  if (!n) return false;
  if (n.reviewId || n.review_id || n.review) return true;
  if (n.productId || n.product_id || n.product) return true;
  if (n?.data?.reviewId || n?.data?.productId) return true;
  const title = String(getTitle(n) || "").toLowerCase();
  const content = String(getContent(n) || "").toLowerCase();
  const kws = [
    "رد على تقييم", "رد على مراجعة", "رد على تقييمك", "رد على مراجعتك",
    "replied to your review", "replied to your rating", "review reply",
  ];
  return kws.some((kw) => title.includes(kw) || content.includes(kw));
}

/**
 * اشتقاق الـ action button من الإشعار — للبائع فقط
 */
function getNotificationActions(n) {
  if (!n) return [];

  // 1) review reply → روح على المنتج
  if (isReviewReply(n)) {
    const product = getProduct(n);
    const review = getReview(n);
    if (product?.id) {
      const params = new URLSearchParams();
      if (review?.id) params.set("reviewId", review.id);
      const query = params.toString();
      return [{
        key: "view-review-reply",
        label: "عرض الرد على التقييم",
        icon: ExternalLink,
        type: normType(n.type),
        path: `/product/${product.id}${query ? `?${query}` : ""}`,
      }];
    }
  }

  // 2) Resolver الموحد
  const resolved = resolveNotificationRoute(n, "seller");
  if (resolved) {
    return [{
      key: resolved.key,
      label: resolved.label,
      icon: ExternalLink,
      type: normType(n.type),
      path: resolved.path,
    }];
  }

  // 3) Fallback من actionUrl الجاهز من الباك
  if (n.actionUrl) {
    let target = n.actionUrl;
    if (target.startsWith("/orders/") && !target.startsWith("/seller/orders/")) {
      target = `/seller/orders${target.replace(/^\/orders/, "")}`;
    }
    let label = "عرض التفاصيل";
    if (normType(n.type) === "ORDER") label = "عرض تفاصيل الطلب";
    return [{ key: "primary", label, icon: ExternalLink, type: normType(n.type), path: target }];
  }

  // 4) Fallback أخير من order id
  const orderId = getOrderId(n);
  if (orderId) {
    return [{
      key: "view-order",
      label: "عرض تفاصيل الطلب",
      icon: ShoppingBag,
      type: "ORDER",
      path: `/seller/orders/${orderId}`,
    }];
  }

  return [];
}

function formatFullDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABELS = {
  pending_review: "قيد المراجعة",
  approved: "تم القبول",
  accepted: "مقبول",
  in_production: "قيد الإنتاج",
  preparing: "قيد التحضير",
  ready: "جاهز",
  shipped: "قيد الشحن",
  delivered: "تم التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  canceled: "ملغي",
  rejected: "مرفوض",
  pending: "قيد الانتظار",
};
function getStatusLabel(s) {
  return STATUS_LABELS[s] || s;
}

/* ── Main Component ───────────────────────────────────────── */

export default function SellerNotifications() {
  const navigate = useNavigate();
  const { currentRole, isBootstrapping } = useAuth();
  const isSellerMode = currentRole === "seller";

  const [notifs, setNotifs] = useState([]);
  const [stats, setStats] = useState({
    total: 0, order: 0, general: 0, system: 0, promotional: 0, unRead: 0,
  });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const inFlightRef = useRef(false);

  /* ── جلب الإشعارات ── */
  const load = useCallback(
    async (pageNum = 1, append = false) => {
      if (inFlightRef.current) return;
      if (!isSellerMode) return;
      inFlightRef.current = true;

      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        const data = await getSellerNotifications({ page: pageNum, limit: 20 });
        const list = extractNotifications(data);
        // Defense in depth: لو الباك رجّع إشعار غلط من الدور الثاني
        const safe = list.filter(isSellerNotification);

        setStats(extractStats(data, safe.length));
        setPagination(extractPagination(data));
        setPage(pageNum);

        if (append) setNotifs((prev) => [...prev, ...safe]);
        else setNotifs(safe);
      } catch (err) {
        console.error("Notifications error:", err);
        const info = formatApiError(err, "تعذر جلب الإشعارات");
        setError(info.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        inFlightRef.current = false;
      }
    },
    [isSellerMode]
  );

  useEffect(() => {
    if (isBootstrapping) return;
    if (!isSellerMode) {
      setNotifs([]);
      setStats({ total: 0, order: 0, general: 0, system: 0, promotional: 0, unRead: 0 });
      return;
    }
    load(1);
  }, [load, isSellerMode, isBootstrapping]);

  /* ── socket listener ── */
  useEffect(() => {
    if (!isSellerMode) return undefined;
    const socket = connectSocket();

    const handleNew = (payload) => {
      const notif = payload?.notification ?? payload;
      if (!notif || !isSellerNotification(notif)) return;
      const id = getId(notif);
      if (!id) return;

      setNotifs((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some((n) => getId(n) === id)) {
          return list.map((n) => (getId(n) === id ? { ...n, ...notif } : n));
        }
        return [{ ...notif, isRead: false }, ...list];
      });
      setStats((prev) => ({
        ...prev,
        total: (prev.total ?? 0) + 1,
        unRead: (prev.unRead ?? 0) + 1,
      }));
    };

    socket.on(NEW_NOTIFICATION_EVENT, handleNew);
    return () => socket.off(NEW_NOTIFICATION_EVENT, handleNew);
  }, [isSellerMode]);

  /* ── Mark single as read (optimistic) ── */
  const markOneRead = useCallback(async (id) => {
    if (!id) return;
    setNotifs((prev) =>
      prev.map((n) => (getId(n) === id ? { ...n, isRead: true, read: true } : n))
    );
    setStats((prev) => ({ ...prev, unRead: Math.max(0, prev.unRead - 1) }));

    try {
      await markSellerNotificationRead(id);
    } catch (err) {
      console.error("Mark read error:", err);
      // rollback
      setNotifs((prev) =>
        prev.map((n) => (getId(n) === id ? { ...n, isRead: false, read: false } : n))
      );
      setStats((prev) => ({ ...prev, unRead: prev.unRead + 1 }));
    }
  }, []);

  /* ── Mark all as read ── */
  const markAll = useCallback(async () => {
    if (markingAll || stats.unRead === 0) return;
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    const prevUnread = stats.unRead;
    setStats((prev) => ({ ...prev, unRead: 0 }));

    try {
      await markAllSellerNotificationsRead();
    } catch (err) {
      console.error("Mark all read error:", err);
      setStats((prev) => ({ ...prev, unRead: prevUnread }));
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: false, read: false })));
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, stats.unRead]);

  /* ── Delete one ── */
  const deleteOne = useCallback(async (id) => {
    if (!id || deletingId) return;
    setDeletingId(id);
    const snapshot = notifs;
    const target = snapshot.find((n) => getId(n) === id);
    setNotifs((prev) => prev.filter((n) => getId(n) !== id));
    setStats((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
      unRead: target && !isRead(target) ? Math.max(0, prev.unRead - 1) : prev.unRead,
    }));

    try {
      await deleteSellerNotification(id);
    } catch (err) {
      console.error("Delete one error:", err);
      // rollback
      setNotifs(snapshot);
      setStats(extractStats({ stats: extractStats(snapshot, snapshot.length) }, snapshot.length));
    } finally {
      setDeletingId(null);
    }
  }, [notifs, deletingId]);

  /* ── Tabs (filtering) ── */
  const visible = useMemo(() => {
    if (activeTab === "all") return notifs;
    return notifs.filter((n) => normType(n.type) === activeTab);
  }, [notifs, activeTab]);

  const tabCounts = useMemo(() => {
    const local = { all: notifs.filter((n) => !isRead(n)).length };
    TABS.forEach((t) => {
      if (t.key === "all") return;
      const c = notifs.filter((n) => normType(n.type) === t.key && !isRead(n)).length;
      local[t.key] = c;
    });
    return local;
  }, [notifs]);

  /* ── Modal handlers ── */
  const openNotif = useCallback(
    async (n) => {
      if (!n) return;
      setSelectedNotif(n);
      const id = getId(n);
      if (id && !isRead(n)) markOneRead(id);
    },
    [markOneRead]
  );

  const closeNotif = useCallback(() => setSelectedNotif(null), []);

  const handleActionClick = useCallback(
    (action) => {
      if (!action?.path) return;
      if (selectedNotif && !isRead(selectedNotif)) {
        markOneRead(getId(selectedNotif));
      }
      closeNotif();
      navigate(action.path);
    },
    [selectedNotif, navigate, markOneRead, closeNotif]
  );

  /* ── حارس العرض: لو مش بوضعية البائع ── */
  if (!isBootstrapping && !isSellerMode) {
    return (
      <div className="np-root" dir="rtl">
        <main className="np-main">
          <div className="np-empty" style={{ paddingTop: 80 }}>
            <div className="np-empty-art" style={{ background: "#fef3c7", color: "#d97706" }}>
              <Bell size={42} />
            </div>
            <h3>إشعارات البائع فقط</h3>
            <p>هذه الصفحة تعرض إشعاراتك كـ <strong>بائع</strong> فقط.<br />بدّل لوضع البائع لعرض الإشعارات الخاصة بك.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="np-root" dir="rtl">
      <main className="np-main">
        {/* ── Header ── */}
        <div className="np-header">
          <div className="np-header-info">
            <h1 className="np-page-title">
              <Bell size={22} />
              إشعارات البائع
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
              {markingAll ? <Loader2 size={15} className="np-spin" /> : <CheckCheck size={15} />}
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

        {/* ── Tabs ── */}
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
                <RefreshCw size={15} /> إعادة المحاولة
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="np-empty">
              <div className="np-empty-art"><Bell size={42} /></div>
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
            visible.map((n) => (
              <NotificationRow
                key={getId(n)}
                n={n}
                onOpen={() => openNotif(n)}
                onDelete={() => deleteOne(getId(n))}
                deletingId={deletingId}
              />
            ))
          )}

          {/* ── Pagination ── */}
          {!loading && pagination && pagination.totalPages > 1 && (
            <div className="np-pagination">
              <button
                className="np-page-btn"
                disabled={!pagination.hasPreviousPage || loadingMore}
                onClick={() => load(page - 1)}
              >
                <ChevronRight size={15} /> السابق
              </button>
              <span className="np-page-info">
                صفحة {pagination.currentPage} من {pagination.totalPages}
              </span>
              <button
                className="np-page-btn"
                disabled={!pagination.hasNextPage || loadingMore}
                onClick={() => load(page + 1)}
              >
                التالي <ChevronLeft size={15} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Detail Modal ── */}
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

/* ── Detail Modal ────────────────────────────────────────── */
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

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="np-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="np-modal" dir="rtl" role="dialog" aria-modal="true">
        <div
          className="np-modal-header"
          style={{ background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}dd 100%)` }}
        >
          <button type="button" className="np-modal-close" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
          <div className="np-modal-header-info">
            <h2 className="np-modal-title">{title || "إشعار"}</h2>
            <div className="np-modal-type-badge" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Icon size={12} /> {meta.label}
            </div>
          </div>
          <div className="np-modal-header-icon" style={{ background: "rgba(255,255,255,0.2)" }}>
            <Icon size={22} />
          </div>
        </div>

        <div className="np-modal-body">
          {content && (
            <div className="np-modal-content"><p>{content}</p></div>
          )}

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
                    <span className="np-modal-order-value">{getStatusLabel(order.status)}</span>
                  </div>
                )}
                {order.totalPrice != null && (
                  <div className="np-modal-order-item">
                    <span className="np-modal-order-label">المبلغ</span>
                    <span className="np-modal-order-value">{order.totalPrice} ₪</span>
                  </div>
                )}
              </div>
            </div>
          )}

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

          <div className="np-modal-read-status">
            <span className={`np-modal-read-dot ${read ? "read" : "unread"}`} />
            <span>{read ? "تمت القراءة" : "لم تتم القراءة بعد"}</span>
          </div>
        </div>

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
            <button type="button" className="np-modal-btn-close" onClick={onClose}>إغلاق</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── NotificationRow ────────────────────────────────────────
   ✅ Swipe-to-delete (mobile) + tap-to-open (desktop).
      استبدلنا زر الحذف الصريح (np-item-delete + window.confirm) بـ swipe gesture
      بديهية — تطابق تجربة CustomerNotifications.
────────────────────────────────────────────────────────── */
function NotificationRow({ n, onOpen, onDelete, deletingId }) {
  const id = getId(n);
  const meta = getMeta(n.type);
  const Icon = meta.icon;
  const read = isRead(n);
  const title = getTitle(n);
  const content = getContent(n);
  const sender = getSender(n);
  const order = getOrder(n);
  const date = getNotifDate(n);
  const isDeleting = deletingId === id;

  // ✅ السحب (RTL/LTR aware) لحذف الإشعار
  const swipe = useSwipeToDismiss({
    onDismiss: () => {
      if (!isDeleting) onDelete?.();
    },
    direction: "both",
    enabled: !isDeleting,
  });

  return (
    <div className={`np-item-wrap ${!read ? "np-item-unread" : ""}`}>
      {/* الخلفية الحمراء (تظهر مع السحب) */}
      <div className="np-item-bg" style={swipe.bgStyle} aria-hidden="true">
        <Trash2 size={18} />
      </div>

      <button
        type="button"
        className="np-item"
        onClick={onOpen}
        {...swipe.bind()}
        style={swipe.style}
        disabled={isDeleting}
        aria-label={title || "إشعار"}
      >
        <div
          className="np-item-icon"
          style={{ background: meta.bg, color: meta.color }}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="np-item-body">
          {title && <div className="np-item-title">{title}</div>}
          {content && <div className="np-item-desc">{content}</div>}
          <div className="np-item-meta">
            <span
              className="np-item-type-tag"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>
            {order?.orderNumber && (
              <span className="np-item-order-tag">{order.orderNumber}</span>
            )}
            {date && <span className="np-item-time">{timeAgo(date)}</span>}
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
    </div>
  );
}
