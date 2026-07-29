import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationsPage.css";
import api from "../utils/api";
import SellerNavbar from "../components/SellerNavbar";
import { connectSocket } from "../utils/socket";
import { resolveNotificationRoute } from "../utils/notificationRoutes";
import {
  isSellerNotification,
  shouldAcceptSellerSocketEvent,
} from "../utils/notificationRoleFilter";
import { useAuth } from "../context/AuthContext";
import LoadingState from "../components/LoadingState";

const IS_API_READY = !!import.meta.env.VITE_API_URL;

// الاسم الصحيح لحدث الإشعار الجديد القادم من السيرفر (تأكدنا منه من الـ Console)
const NEW_NOTIFICATION_EVENT = "notification:new";

// ── Icons ──
const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#f97316" stroke="#f97316" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const MessageIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const FunnelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

//   أيقونة حذف (سلة مهملات) للإشعار الواحد
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ── نوع الإشعار → لون وأيقونة ──
const TYPE_META = {
  order:   { icon: <CartIcon />,    bg: "#dbeafe", color: "#2563eb", label: "طلبات" },
  rating:  { icon: <StarIcon />,    bg: "#fff7ed", color: "#f97316", label: "تقييمات" },
  message: { icon: <MessageIcon />, bg: "#f0fdf4", color: "#16a34a", label: "رسائل" },
  alert:   { icon: <AlertIcon />,   bg: "#fef3c7", color: "#d97706", label: "تنبيهات" },
};

const TABS = [
  { key: "all",     label: "الكل" },
  { key: "order",   label: "الطلبات" },
  { key: "rating",  label: "التقييمات" },
  { key: "message", label: "الرسائل" },
  { key: "alert",   label: "المنتجات" },
];

// ── ترجمة أنواع الباك اند الحقيقية إلى مفاتيح الواجهة (TABS / TYPE_META) ──
const BACKEND_TYPE_MAP = {
  order: "order",
  orders: "order",
  review: "rating",
  reviews: "rating",
  rating: "rating",
  ratings: "rating",
  message: "message",
  messages: "message",
  chat: "message",
  product: "alert",
  products: "alert",
  system: "alert",
  general: "alert",
  promotional: "alert",
  alert: "alert",
  // ✅ vendor-specific types
  new_order: "order",
  new_review: "rating",
  new_message: "message",
  new_product: "alert",
  new_rating: "rating",
  order_update: "order",
  low_stock: "alert",
  new_customer: "alert",
};

/**
 * ✅ بنثق بنوع الباك — بدون title-based fallback.
 * إذا الباك بعث type مش معروف (مثل "GENERAL" أو null)، بنصنّفها كـ "alert".
 * هذا يضمن إنو الإشعارات تظهر بنوعها الصحيح حسب ما الباك بعث.
 */
const resolveNotifType = (n) => {
  const rawType = (n?.type ?? n?.category ?? n?.subType ?? "").toLowerCase().trim();
  if (!rawType) return "alert";
  return BACKEND_TYPE_MAP[rawType] ?? "alert";
};

//   مسارات احتياطية (fallback) حسب نوع الإشعار، تُستخدم فقط لو الإشعار
// ما إلوش actionUrl جاي من الباك اند (متل بعض إشعارات "GENERAL" القديمة).
// عدّل هاد المسارات إذا بدك توجيه مختلف.
const FALLBACK_ROUTE_BY_TYPE = {
  order:   "/seller/orders",
  rating:  "/seller/ratings",
  message: "/seller/messages",
  alert:   "/seller/products",
};

// ── Static fallback ──
const STATIC_NOTIFS = [
  { _id: "1", type: "order",   title: "طلب جديد",            body: "أحمد محمد أرسل طلباً جديداً بقيمة ₪150",     time: "منذ 5 دقائق",  isRead: false },
  { _id: "2", type: "rating",  title: "تقييم جديد",          body: "فاطمة علي قيّمت منتج 'زيت زيتون' بـ 4 نجوم", time: "منذ 20 دقيقة", isRead: false },
  { _id: "3", type: "message", title: "رسالة جديدة",         body: "محمود حسن: هل يوجد خصم للكميات الكبيرة؟",    time: "منذ ساعة",     isRead: false },
  { _id: "4", type: "order",   title: "تم تأكيد الطلب",      body: "الطلب ORD-002 تم قبوله من قبل الزبون",       time: "منذ 3 ساعات",  isRead: true  },
  { _id: "5", type: "alert",   title: "منتج على وشك النفاد", body: "مخزون 'زيت الزيتون' وصل إلى 3 قطع فقط",     time: "منذ 5 ساعات",  isRead: true  },
];

const PAGE_SIZE = 20; // عدد الإشعارات المطلوبة بكل صفحة

// ── API Helpers ──
//   صارت تدعم رقم الصفحة، وترجع كمان معلومات pagination
const fetchNotifications = async (page = 1) => {
  const res = await api.get(
    `/api/seller/notification?page=${page}&limit=${PAGE_SIZE}`
  );

  const list =
    res.data?.data?.notifications ??
    res.data?.notifications ??
    [];
  const arr = Array.isArray(list) ? list : [];

  const mapped = arr.map((n) => ({
    ...n,
    _id: n._id ?? n.id,
    type: resolveNotifType(n), //   يستخدم الدالة الجديدة (type + fallback بالعنوان)
  }));

  const pagination =
    res.data?.data?.pagination ?? res.data?.pagination ?? null;

  return { notifications: mapped, pagination };
};

const markOneRead = async (id) => {
  await api.patch(`/api/seller/notification/${id}/read`);
};

const markAllReadAPI = async () => {
  await api.patch("/api/seller/notification/read-all");
};

const deleteAllAPI = async () => {
  await api.delete("/api/seller/notification");
};

// حذف إشعار واحد بالتحديد
const deleteOneAPI = async (id) => {
  await api.delete(`/api/seller/notification/${id}`);
};

// ── Component ──
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { currentRole, isBootstrapping } = useAuth();
  // 🔒 حارس صارم: هذه الصفحة للبائع فقط
  const isSellerMode = currentRole === "seller";

  const [notifs, setNotifs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); //   تحميل صفحة إضافية
  const [page, setPage]           = useState(1);          //   الصفحة الحالية المحمّلة
  const [hasMore, setHasMore]     = useState(false);      //  هل يوجد صفحات إضافية
  const [activeTab, setActiveTab] = useState("all");
  const [deletingId, setDeletingId] = useState(null); //   يمنع دبل-كليك على نفس زر الحذف أثناء التنفيذ
  const moreRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {}
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── تحميل أول صفحة (أول فتح للصفحة) ──
  const loadNotifications = useCallback(async () => {
    // 🔒 حماية: لو مش بوضعية البائع، ما نطلب شي
    if (!isSellerMode) return;
    setLoading(true);
    try {
      if (IS_API_READY) {
        const { notifications, pagination } = await fetchNotifications(1);
        // 🔒 فلتر أمان: نضمن إنها إشعارات بائع فقط
        const safe = (Array.isArray(notifications) ? notifications : []).filter(
          isSellerNotification
        );
        setNotifs(safe);
        setPage(1);
        setHasMore(
          pagination ? pagination.currentPage < pagination.totalPages : false
        );
      } else {
        setNotifs(STATIC_NOTIFS);
        setHasMore(false);
      }
    } catch (err) {
      console.error("فشل جلب الإشعارات:", err);
      setNotifs(STATIC_NOTIFS);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [isSellerMode]);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!isSellerMode) {
      setNotifs([]);
      setHasMore(false);
      return;
    }
    loadNotifications();
  }, [loadNotifications, isSellerMode, isBootstrapping]);

  // ── تحميل المزيد (الصفحة التالية) ──
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    if (!isSellerMode) return; // 🔒
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { notifications, pagination } = await fetchNotifications(nextPage);

      // 🔒 فلتر أمان: بس إشعارات البائع
      const safe = (Array.isArray(notifications) ? notifications : []).filter(
        isSellerNotification
      );

      setNotifs((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const existingIds = new Set(list.map((n) => n._id));
        const fresh = safe.filter((n) => !existingIds.has(n._id));
        return [...list, ...fresh];
      });

      setPage(nextPage);
      setHasMore(
        pagination ? pagination.currentPage < pagination.totalPages : false
      );
    } catch (err) {
      console.error("فشل تحميل المزيد من الإشعارات:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── الاستماع لإشعار جديد جاي من السوكت (real-time، بدون ريفريش) ──
  useEffect(() => {
    // 🔒 ما نشترك بالـ socket إلا بوضعية البائع
    if (!isSellerMode) return undefined;
    const socket = connectSocket();

    socket.on("connect", () => console.log("✅ [NotificationsPage] connected:", socket.id));
    socket.on("connect_error", (err) => console.log("❌ [NotificationsPage] connect_error:", err.message));

    const handleNewNotification = (payload) => {
      // 🔒 فلتر صارم: لو الإشعار للمشتري، نتجاهله فوراً
      if (!shouldAcceptSellerSocketEvent(payload)) {
        return;
      }

      //   الـ payload الحقيقي جاي بالشكل: { notification: {...}, stats: {...} }
      const notif = payload?.notification ?? payload;
      if (!notif) return;

      // 🔒 Defense in depth: فلتر ثاني على مستوى العنصر
      if (!isSellerNotification(notif)) return;

      const mapped = {
        ...notif,
        _id: notif?._id ?? notif?.id,
        type: resolveNotifType(notif), //   يستخدم الدالة الجديدة (type + fallback بالعنوان)
        isRead: false,
      };

      setNotifs((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some((n) => n._id === mapped._id)) return list;
        return [mapped, ...list];
      });
    };

    socket.on(NEW_NOTIFICATION_EVENT, handleNewNotification);

    return () => {
      socket.off(NEW_NOTIFICATION_EVENT, handleNewNotification);
    };
  }, [isSellerMode]);

  // 🔒 Defense in depth: نطبّق الفلتر على القائمة قبل العرض
  const safeNotifs = (Array.isArray(notifs) ? notifs : []).filter(
    isSellerNotification
  );
  const visible = safeNotifs.filter((n) => activeTab === "all" || n.type === activeTab);

  const markRead = async (id) => {
    try {
      if (IS_API_READY) await markOneRead(id);
      setNotifs((prev) => (Array.isArray(prev) ? prev : []).map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("فشل تعيين كمقروء:", err);
    }
  };

  //   فتح الإشعار: بيوديك دايماً على صفحته (actionUrl لو موجود، وإلا مسار
  // احتياطي حسب نوع الإشعار من FALLBACK_ROUTE_BY_TYPE) — بدون أي Modal.
const openNotif = (n) => {
  if (!n.isRead) markRead(n._id);

  // ✅ مصدر الحقيقة الموحّد: utils/notificationRoutes.js
  //    (postman contract: /api/seller/notification, /api/customer/notification)
  const resolved = resolveNotificationRoute(n, "seller");
  const target = resolved?.path || "/seller/dashboard";

  console.log("🔎 openNotif →", { type: n.type, actionUrl: n.actionUrl, target });
  navigate(target);
};
  const markAllRead = async () => {
    try {
      if (IS_API_READY) await markAllReadAPI();
      setNotifs((prev) => (Array.isArray(prev) ? prev : []).map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("فشل تعيين الكل كمقروء:", err);
    }
  };

  const deleteAll = async () => {
    try {
      if (IS_API_READY) await deleteAllAPI();
      setNotifs([]);
      setHasMore(false);
    } catch (err) {
      console.error("فشل حذف الإشعارات:", err);
    }
  };

  //   حذف إشعار واحد — بيوقف انتشار الحدث حتى ما يفتح الإشعار معه
  const deleteOne = async (id, e) => {
    if (e) e.stopPropagation();
    if (deletingId === id) return; // منع الضغط المتكرر أثناء التنفيذ
    setDeletingId(id);
    try {
      if (IS_API_READY) await deleteOneAPI(id);
      setNotifs((prev) => (Array.isArray(prev) ? prev : []).filter((n) => n._id !== id));
    } catch (err) {
      console.error("فشل حذف الإشعار:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const tabCount = (key) => {
    const list = key === "all" ? safeNotifs : safeNotifs.filter((n) => n.type === key);
    return list.filter((n) => !n.isRead).length;
  };

  if (loading) {
    return (
      <div className="np-root" dir="rtl">
        <SellerNavbar />
        <main className="np-main">
          <LoadingState message="جاري تحميل الإشعارات…" />
        </main>
      </div>
    );
  }

  // 🔒 حارس العرض: لو اليوزر مو بوضعية البائع
  if (!isBootstrapping && !isSellerMode) {
    return (
      <div className="np-root" dir="rtl">
        <SellerNavbar />
        <main className="np-main">
          <div className="np-empty" style={{ paddingTop: 80 }}>
            <h3>إشعارات البائع فقط</h3>
            <p>
              هذه الصفحة تعرض إشعاراتك كـ <strong>بائع</strong> فقط.
              <br />
              بدّل لوضع البائع لعرض الإشعارات الخاصة بمتجرك.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="np-root" dir="rtl">
      <SellerNavbar />
      <main className="np-main">

        <div className="np-header">
          <h1 className="np-page-title">التنبيهات</h1>
          <div className="np-header-actions">
            <button className="np-btn-mark-all" onClick={markAllRead}>
              تعيين الكل كمقروء
            </button>
            <button className="np-btn-dismiss-all" onClick={deleteAll}>
              حذف الكل
            </button>
          </div>
        </div>

        <div className="np-tabs">
          {TABS.map((tab) => {
            const count = tabCount(tab.key);
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
          <div className="np-tabs-filter"><FunnelIcon /></div>
        </div>

        <div className="np-list">
          {visible.length === 0 && (
            <div className="np-empty">لا توجد إشعارات</div>
          )}
          {visible.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.alert;
            return (
              <div
                key={n._id}
                className={`np-item ${!n.isRead ? "np-item-unread" : ""}`}
                onClick={() => openNotif(n)}
              >
                <div className="np-item-icon" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>
                <div className="np-item-body">
                 <div className="np-item-title">
                  {n.title}
                  {n.type === "message" && n.sender?.name && ` - ${n.sender.name}`}
                </div>
                  <div className="np-item-desc">{n.body ?? n.content}</div>
                </div>
                <div className="np-item-right">
                  <span className="np-item-time">{n.time ?? n.sentAt?.slice(0, 10) ?? n.createdAt?.slice(0, 10)}</span>
                  {!n.isRead && <span className="np-unread-dot"></span>}
                  {/*  زر حذف الإشعار الواحد */}
                  <button
                    className="np-item-delete-btn"
                    onClick={(e) => deleteOne(n._id, e)}
                    disabled={deletingId === n._id}
                    aria-label="حذف الإشعار"
                    title="حذف الإشعار"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/*   زر تحميل المزيد — يظهر فقط لو في صفحات إضافية ولسنا بتبويب مفلتر بحيث القائمة المعروضة قد لا تعكس كل البيانات بعد */}
        {hasMore && (
          <div className="np-load-more-wrap" style={{ textAlign: "center", padding: "16px" }}>
            <button
              className="np-btn-load-more"
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: "8px 24px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                background: loadingMore ? "#f3f4f6" : "#fff",
                cursor: loadingMore ? "default" : "pointer",
              }}
            >
              {loadingMore ? "جاري التحميل…" : "تحميل المزيد"}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}