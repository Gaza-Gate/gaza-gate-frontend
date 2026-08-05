// src/components/NotificationDropdown.jsx
//
// ✅ نافذة الإشعارات المنبثقة (Dropdown Overlay) — بدل صفحة منفصلة
// ─────────────────────────────────────────────────────────────────
// ✅ تنبثق فوق الواجهة عند الضغط على جرس الإشعارات
// ✅ بدون "بوكسات" ضخمة أو ترويسات كبيرة — نظيفة ومباشرة
// ✅ أزرار صغيرة أنيقة (مقروء، حذف)
// ✅ على الموبايل: السحب لليسار (RTL) يحذف الإشعار
// ✅ عند الضغط على إشعار تقييم (Review / Rating):
//    - الزبون: → /product/:id?reviewId=... (صفحة المنتج مع highlight)
//    - البائع: → /seller/products?productId=... (يفتح ProductDetailsModal تلقائياً)
//    - Fallback بدون productId: → /seller/ratings (قسم التقييمات الرئيسي)
// ✅ عند النقر:
//    1) تعليم الإشعار كمقروء (PATCH .../read)
//    2) استخراج productId/reviewId من الإشعار
//    3) حلّ المسار عبر resolveNotificationRoute
//    4) إغلاق الـ dropdown + التنقل
// ✅ تعتمد على:
//     - notificationService.js  (Postman endpoints)
//     - notificationRoleFilter.js (role isolation)
//     - notificationRoutes.js (resolved target path + extractors)
//     - useSwipeToDismiss.js  (mobile swipe)

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingBag,
  Star,
  Package,
  Settings,
  AlertCircle,
  Loader2,
  Inbox,
  Trash2,
  ExternalLink,
  X,
  RefreshCw,
} from "lucide-react";

import {
  getCustomerNotifications,
  getSellerNotifications,
  markCustomerNotificationRead,
  markSellerNotificationRead,
  markAllCustomerNotificationsRead,
  markAllSellerNotificationsRead,
  deleteCustomerNotification,
  deleteSellerNotification,
  extractNotifications,
  extractStats,
  extractPagination,
} from "../services/notificationService";
import {
  resolveNotificationRoute,
  isNotificationForRole,
  extractProductIdFromNotification,
  extractReviewIdFromNotification,
  isReviewNotification,
} from "../utils/notificationRoutes";
import {
  isCustomerNotification,
  isSellerNotification,
  shouldAcceptCustomerSocketEvent,
  shouldAcceptSellerSocketEvent,
  extractNotificationFromPayload,
} from "../utils/notificationRoleFilter";
import { connectSocket } from "../utils/socket";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../utils/errorHelper";
import { useSwipeToDismiss } from "../hooks/useSwipeToDismiss";
import ThemeToggle from "./ThemeToggle";
import "./NotificationDropdown.css";

/* ── Constants ──────────────────────────────────────────────
   ✅ فقط لونين: أزرق (#2563eb) و برتقالي (#f97316)
   - الأزرق = طلبات، نظام، رسائل، محادثات، عام
   - البرتقالي = تقييمات، عروض، تنبيهات
*/
const TYPE_META = {
  ORDER:       { label: "طلبات",     Icon: ShoppingBag, color: "#2563eb", bg: "#dbeafe" },
  SYSTEM:      { label: "النظام",     Icon: Settings,    color: "#2563eb", bg: "#dbeafe" },
  PROMOTIONAL: { label: "عروض",       Icon: Star,        color: "#f97316", bg: "#fff7ed" },
  GENERAL:     { label: "عام",        Icon: Bell,        color: "#2563eb", bg: "#dbeafe" },
  // تقييمات → برتقالي
  REVIEW:      { label: "تقييم",      Icon: Star,        color: "#f97316", bg: "#fff7ed" },
  RATING:      { label: "تقييم",      Icon: Star,        color: "#f97316", bg: "#fff7ed" },
  REVIEW_REPLY:{ label: "رد على تقييم", Icon: Star,     color: "#f97316", bg: "#fff7ed" },
  // رسائل/محادثات → أزرق
  MESSAGE:     { label: "رسالة",      Icon: Bell,        color: "#2563eb", bg: "#dbeafe" },
  CONVERSATION:{ label: "محادثة",     Icon: Bell,        color: "#2563eb", bg: "#dbeafe" },
  // تنبيهات → برتقالي
  ALERT:       { label: "تنبيه",      Icon: AlertCircle, color: "#f97316", bg: "#fff7ed" },
};

const normType = (t) => (t ? String(t).toUpperCase() : "GENERAL");
const getMeta = (type) => TYPE_META[normType(type)] || TYPE_META.GENERAL;

const NEW_NOTIFICATION_EVENT = "notification:new";

/* ── Helpers ──────────────────────────────────────────────── */
function getId(n) {
  return n?.id ?? n?._id;
}
function isRead(n) {
  return Boolean(n?.isRead ?? n?.read ?? n?.read_at);
}
function getTitle(n) {
  return n?.title || "";
}
function getContent(n) {
  return n?.content || n?.body || n?.message || "";
}
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

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function NotificationDropdown({
  isOpen,
  onClose,
  role,
  anchorRef = null, // ref to the bell — for positioning (optional)
}) {
  const navigate = useNavigate();
  const { currentRole, isBootstrapping } = useAuth();

  // 🔒 حارس: لا نعرض القائمة إذا الـ role مش متطابق
  const isAuthorized = currentRole === role;

  // refs
  const dropdownRef = useRef(null);

  // state
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [removingId, setRemovingId] = useState(null); // للـ swipe-out animation
  const inFlightRef = useRef(false);

  const isCustomer = role === "customer";

  /* ── Service helpers (حسب الدور) ── */
  const svc = useMemo(
    () => ({
      fetch: isCustomer
        ? () => getCustomerNotifications({ page: 1, limit: 20 })
        : () => getSellerNotifications({ page: 1, limit: 20 }),
      markOne: isCustomer ? markCustomerNotificationRead : markSellerNotificationRead,
      markAll: isCustomer
        ? markAllCustomerNotificationsRead
        : markAllSellerNotificationsRead,
      deleteOne: isCustomer
        ? deleteCustomerNotification
        : deleteSellerNotification,
    }),
    [isCustomer]
  );

  /* ── Fetch notifications ── */
  const load = useCallback(async () => {
    if (!isAuthorized || !isOpen) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const data = await svc.fetch();
      const rawList = extractNotifications(data);
      // Defense in depth: فلتر حسب الدور
      const list = isCustomer
        ? rawList.filter(isCustomerNotification)
        : rawList.filter(isSellerNotification);
      setNotifs(list);
    } catch (err) {
      const info = formatApiError(err, "تعذر جلب الإشعارات");
      setError(info.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [isAuthorized, isOpen, svc, isCustomer]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  /* ── Real-time: socket listener ── */
  useEffect(() => {
    if (!isOpen || !isAuthorized) return undefined;
    const socket = connectSocket();

    const handleNew = (payload) => {
      // فلتر حسب الدور
      const shouldAccept = isCustomer
        ? shouldAcceptCustomerSocketEvent(payload)
        : shouldAcceptSellerSocketEvent(payload);
      if (!shouldAccept) return;

      const notif = extractNotificationFromPayload(payload);
      if (!notif) return;
      const id = getId(notif);
      if (!id) return;

      // Defense in depth
      if (!isNotificationForRole(notif, role)) return;

      setNotifs((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        // تجنّب التكرار
        if (list.some((n) => getId(n) === id)) {
          return list.map((n) => (getId(n) === id ? { ...n, ...notif } : n));
        }
        // نضيف الجديد في الأعلى
        return [{ ...notif, isRead: false }, ...list].slice(0, 50); // max 50
      });
    };

    socket.on(NEW_NOTIFICATION_EVENT, handleNew);
    return () => socket.off(NEW_NOTIFICATION_EVENT, handleNew);
  }, [isOpen, isAuthorized, isCustomer, role]);

  /* ── Click outside + ESC ── */
  useEffect(() => {
    if (!isOpen) return undefined;

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    function onPointer(e) {
      const target = e.target;
      // تجاهل النقر داخل الـ dropdown نفسه أو على الـ anchor (الجرس)
      if (dropdownRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose?.();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [isOpen, onClose, anchorRef]);

  /* ── Mark single as read (optimistic) ── */
  const markOneRead = useCallback(
    async (n) => {
      if (!n) return;
      const id = getId(n);
      if (!id || isRead(n)) return;
      setNotifs((prev) =>
        prev.map((x) => (getId(x) === id ? { ...x, isRead: true, read: true } : x))
      );
      try {
        await svc.markOne(id);
      } catch (err) {
        // rollback
        setNotifs((prev) =>
          prev.map((x) => (getId(x) === id ? { ...x, isRead: false, read: false } : x))
        );
      }
    },
    [svc]
  );

  /* ── Mark all as read ── */
  const markAll = useCallback(async () => {
    if (markingAll) return;
    const unread = notifs.filter((n) => !isRead(n));
    if (unread.length === 0) return;
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    try {
      await svc.markAll();
    } catch (err) {
      // rollback
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: false, read: false })));
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, notifs, svc]);

  /* ── Delete one ── */
  const deleteOne = useCallback(
    async (id) => {
      if (!id || deletingId) return;
      setDeletingId(id);
      // حفظ snapshot
      const snapshot = notifs;
      setNotifs((prev) => prev.filter((n) => getId(n) !== id));
      // تشغيل الأنيميشن
      setRemovingId(id);
      setTimeout(() => setRemovingId(null), 300);

      try {
        await svc.deleteOne(id);
      } catch (err) {
        // rollback
        setNotifs(snapshot);
      } finally {
        setDeletingId(null);
      }
    },
    [notifs, deletingId, svc]
  );

  /* ── Handle click on notification ──
     ✅ الخطوات:
        1) تعليم الإشعار كمقروء (PATCH .../read) — optimistic
        2) استخراج المعرّفات (productId, reviewId) من الإشعار للتشخيص
        3) حلّ المسار عبر resolveNotificationRoute
           - للزبون تقييم: /product/:id?reviewId=...
           - للبائع تقييم: /seller/products?productId=... (يفتح ProductDetailsModal)
           - fallback: /seller/ratings أو /seller/dashboard
        4) إغلاق الـ dropdown + التنقل
  */
  const handleItemClick = useCallback(
    (n) => {
      if (!n) return;

      // 1) ✅ تعليم كمقروء (optimistic — حتى لو فشل التنقل، يبقى مقروء)
      markOneRead(n);

      // 2) استخراج المعرّفات (للتشخيص + ضمان إنو الباك فعلاً بعتهم)
      const productId = extractProductIdFromNotification(n);
      const reviewId = extractReviewIdFromNotification(n);
      const isReview = isReviewNotification(n);

      if (isReview) {
        // eslint-disable-next-line no-console
        console.log("🔎 [NotificationDropdown] review click →", {
          role,
          productId,
          reviewId,
          rawType: n.type,
        });
      }

      // 3) حلّ المسار — الـ resolver بيشتغل حسب الدور + النوع
      const resolved = resolveNotificationRoute(n, role);
      const target = resolved?.path || (isCustomer ? "/home/customer" : "/seller/dashboard");

      if (isReview) {
        // eslint-disable-next-line no-console
        console.log("🔎 [NotificationDropdown] review target →", {
          target,
          label: resolved?.label,
          key: resolved?.key,
        });
      }

      // 4) إغلاق الـ dropdown + التنقل
      onClose?.();
      navigate(target);
    },
    [markOneRead, navigate, role, isCustomer, onClose]
  );

  /* ── Derived ── */
  const unreadCount = useMemo(
    () => notifs.filter((n) => !isRead(n)).length,
    [notifs]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* overlay خفيف للإغلاق (ما بـ blur — يبقى المحتوى باين) */}
      <div
        className="ndd-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dropdownRef}
        className="ndd-root glass-card-strong"
        role="dialog"
        aria-label="الإشعارات"
        dir="rtl"
      >
        {/* ── Header صغير (بدون بوكسات ضخمة) ── */}
        <header className="ndd-header">
          <div className="ndd-header-left">
            <h3 className="ndd-title">
              <Bell size={16} />
              الإشعارات
              {unreadCount > 0 && (
                <span className="ndd-count-badge">{unreadCount}</span>
              )}
            </h3>
          </div>
          <div className="ndd-header-right">
            <button
              type="button"
              className="ndd-icon-btn"
              onClick={load}
              disabled={loading}
              aria-label="تحديث"
              title="تحديث"
            >
              <RefreshCw size={14} className={loading ? "ndd-spin" : ""} />
            </button>
            <ThemeToggle variant="compact" size={14} />
            <button
              type="button"
              className="ndd-icon-btn ndd-icon-btn--close"
              onClick={onClose}
              aria-label="إغلاق"
              title="إغلاق"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        {/* ── Mark-all row (يظهر فقط لو في غير مقروء) ── */}
        {unreadCount > 0 && !loading && (
          <div className="ndd-mark-all-row">
            <button
              type="button"
              className="ndd-link-btn"
              onClick={markAll}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 size={12} className="ndd-spin" />
              ) : (
                <CheckCheck size={12} />
              )}
              تعيين الكل كمقروء ({unreadCount})
            </button>
          </div>
        )}

        {/* ── List ── */}
        <div className="ndd-list" role="list">
          {loading ? (
            <div className="ndd-loading">
              {[1, 2, 3, 4].map((i) => (
                <div className="ndd-skel-item" key={i}>
                  <div className="ndd-skel-icon" />
                  <div className="ndd-skel-lines">
                    <div className="ndd-skel-line w70" />
                    <div className="ndd-skel-line w40" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="ndd-empty">
              <div className="ndd-empty-art" style={{ background: "#fef2f2", color: "#ef4444" }}>
                <AlertCircle size={28} />
              </div>
              <p>{error}</p>
              <button className="ndd-retry-btn" onClick={load}>
                <RefreshCw size={12} /> إعادة
              </button>
            </div>
          ) : notifs.length === 0 ? (
            <div className="ndd-empty">
              <div className="ndd-empty-art">
                <Inbox size={28} />
              </div>
              <p>لا توجد إشعارات</p>
              <span>ستظهر هنا كل التحديثات الجديدة</span>
            </div>
          ) : (
            notifs.map((n) => (
              <NotificationItem
                key={getId(n)}
                notif={n}
                onClick={() => handleItemClick(n)}
                onDelete={() => deleteOne(getId(n))}
                onMarkRead={() => markOneRead(n)}
                isRemoving={removingId === getId(n)}
              />
            ))
          )}
        </div>

        {/* ── Footer — view all ── */}
        <footer className="ndd-footer">
          <button
            type="button"
            className="ndd-view-all"
            onClick={() => {
              onClose?.();
              navigate(isCustomer ? "/notifications" : "/seller/notifications");
            }}
          >
            <span>عرض كل الإشعارات</span>
            <ExternalLink size={12} />
          </button>
        </footer>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NotificationItem — السطر الواحد
   ─────────────────────────────────────────────────────────
   ✅ أزرار صغيرة: مقروء + حذف (تظهر عند الـ hover / focus)
   ✅ Swipe-to-delete على الموبايل
   ✅ يعرض: أيقونة + عنوان + وصف + وقت + نوع
   ═══════════════════════════════════════════════════════════════ */
function NotificationItem({ notif, onClick, onDelete, onMarkRead, isRemoving }) {
  const meta = getMeta(notif.type);
  const Icon = meta.Icon;
  const id = getId(notif);
  const read = isRead(notif);
  const title = getTitle(notif);
  const content = getContent(notif);
  const date = getNotifDate(notif);

  // ✅ Swipe-to-delete — يعمل في كلا الاتجاهين على الموبايل
  //    "both" = السحب لليسار أو لليمين كلاهما يحذف
  //    (الـ useSwipeToDismiss.js يدعم "left" / "right" / "both" / "auto")
  const swipe = useSwipeToDismiss({
    onDismiss: () => onDelete?.(),
    enabled: true,
    direction: "both", // ✅ السحب بكلا الاتجاهين
  });

  return (
    <div
      className={`ndd-item-wrap ${!read ? "ndd-item-unread" : ""} ${
        isRemoving ? "ndd-item-removing" : ""
      }`}
    >
      {/* ── Background red layer (يظهر مع السحب) ── */}
      <div className="ndd-item-bg" style={swipe.bgStyle} aria-hidden="true">
        <Trash2 size={16} />
      </div>

      {/* ── The item itself ── */}
      <div
        {...swipe.bind()}
        className="ndd-item"
        onClick={onClick}
        style={swipe.style}
        role="listitem"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={title || "إشعار"}
      >
        <div
          className="ndd-item-icon"
          style={{ background: meta.bg, color: meta.color }}
        >
          <Icon size={14} strokeWidth={2} />
        </div>
        <div className="ndd-item-body">
          {title && <div className="ndd-item-title">{title}</div>}
          {content && <div className="ndd-item-desc">{content}</div>}
          <div className="ndd-item-meta">
            <span
              className="ndd-item-tag"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>
            {date && <span className="ndd-item-time">{timeAgo(date)}</span>}
          </div>
        </div>

        <div className="ndd-item-actions">
          {!read && (
            <button
              type="button"
              className="ndd-mini-btn ndd-mini-btn--read"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead?.();
              }}
              aria-label="تعليم كمقروء"
              title="تعليم كمقروء"
            >
              <Check size={12} />
            </button>
          )}
          <button
            type="button"
            className="ndd-mini-btn ndd-mini-btn--delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            aria-label="حذف"
            title="حذف"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {!read && <span className="ndd-unread-dot" aria-label="غير مقروء" />}
      </div>
    </div>
  );
}
