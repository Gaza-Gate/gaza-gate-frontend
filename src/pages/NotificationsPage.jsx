import { useState, useRef, useEffect, useCallback } from "react";
import "./NotificationsPage.css";
import api from "../utils/api";
import SellerNavbar from "../components/SellerNavbar";
import { connectSocket } from "../utils/socket";

const IS_API_READY = !!import.meta.env.VITE_API_URL;

// ✅ الاسم الصحيح لحدث الإشعار الجديد القادم من السيرفر (تأكدنا منه من الـ Console)
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

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ✅ أيقونة حذف (سلة مهملات) للإشعار الواحد
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
  review: "rating",
  rating: "rating",
  message: "message",
  product: "alert",
  system: "alert",
  general: "alert",
  promotional: "alert",
  alert: "alert",
};

// ✅ حل مؤقت (Patch): الباك اند حالياً عم يبعت type: "GENERAL" لإشعارات
// الرسائل الجديدة بدل "message"، فمنفرّق حسب العنوان كـ fallback.
// ⚠️ هاد حل مؤقت فقط - لازم يترصلح من الأساس عند الباك اند (نور) بحيث
// يبعت type: "message" الصحيح لهاد النوع من الإشعارات، وبعدها ممكن
// نشيل هاد الـ fallback ونرجع نعتمد فقط على BACKEND_TYPE_MAP.
const resolveNotifType = (n) => {
  const rawType = (n?.type ?? "").toLowerCase();
  const isMessageByTitle = /new message|رسالة جديدة/i.test(n?.title ?? "");
  if (isMessageByTitle) return "message";
  return BACKEND_TYPE_MAP[rawType] ?? "alert";
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
// ✅ صارت تدعم رقم الصفحة، وترجع كمان معلومات pagination
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
    type: resolveNotifType(n), // ✅ يستخدم الدالة الجديدة (type + fallback بالعنوان)
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
  const [notifs, setNotifs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // ✅ تحميل صفحة إضافية
  const [page, setPage]           = useState(1);          // ✅ الصفحة الحالية المحمّلة
  const [hasMore, setHasMore]     = useState(false);      // ✅ هل يوجد صفحات إضافية
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotif, setSelectedNotif] = useState(null); // ← الإشعار المفتوح بالـ Modal
  const [deletingId, setDeletingId] = useState(null); // ✅ يمنع دبل-كليك على نفس زر الحذف أثناء التنفيذ
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
    setLoading(true);
    try {
      if (IS_API_READY) {
        const { notifications, pagination } = await fetchNotifications(1);
        setNotifs(Array.isArray(notifications) ? notifications : []);
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
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // ── تحميل المزيد (الصفحة التالية) ──
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { notifications, pagination } = await fetchNotifications(nextPage);

      setNotifs((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const existingIds = new Set(list.map((n) => n._id));
        const fresh = notifications.filter((n) => !existingIds.has(n._id));
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
    const socket = connectSocket();

    console.log("🔌 [NotificationsPage] socket connected:", socket.connected, "id:", socket.id);
    socket.on("connect", () => console.log("✅ [NotificationsPage] connected:", socket.id));
    socket.on("connect_error", (err) => console.log("❌ [NotificationsPage] connect_error:", err.message));

    const handleNewNotification = (payload) => {
      console.log("🔔 [NotificationsPage] new notification:", payload);

      // ✅ الـ payload الحقيقي جاي بالشكل: { notification: {...}, stats: {...} }
      const notif = payload?.notification ?? payload;

      const mapped = {
        ...notif,
        _id: notif?._id ?? notif?.id,
        type: resolveNotifType(notif), // ✅ يستخدم الدالة الجديدة (type + fallback بالعنوان)
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
  }, []);

  // إغلاق الـ Modal بزر Escape
  useEffect(() => {
    if (!selectedNotif) return;
    const onKey = (e) => { if (e.key === "Escape") setSelectedNotif(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedNotif]);

  const safeNotifs = Array.isArray(notifs) ? notifs : [];
  const visible = safeNotifs.filter((n) => activeTab === "all" || n.type === activeTab);

  const markRead = async (id) => {
    try {
      if (IS_API_READY) await markOneRead(id);
      setNotifs((prev) => (Array.isArray(prev) ? prev : []).map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("فشل تعيين كمقروء:", err);
    }
  };

  const openNotif = (n) => {
    setSelectedNotif(n);
    if (!n.isRead) markRead(n._id);
  };

  const closeModal = () => setSelectedNotif(null);

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
      setSelectedNotif(null);
      setHasMore(false);
    } catch (err) {
      console.error("فشل حذف الإشعارات:", err);
    }
  };

  // ✅ حذف إشعار واحد — بيوقف انتشار الحدث حتى ما يفتح الـ Modal معه
  const deleteOne = async (id, e) => {
    if (e) e.stopPropagation();
    if (deletingId === id) return; // منع الضغط المتكرر أثناء التنفيذ
    setDeletingId(id);
    try {
      if (IS_API_READY) await deleteOneAPI(id);
      setNotifs((prev) => (Array.isArray(prev) ? prev : []).filter((n) => n._id !== id));
      // لو كان الإشعار المحذوف مفتوح حالياً بالـ Modal، سكّره
      setSelectedNotif((prev) => (prev && prev._id === id ? null : prev));
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
          <div className="rm-state-center">
            <div className="od-spinner" />
            <p>جاري تحميل الإشعارات…</p>
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
                  <div className="np-item-title">{n.title}</div>
                  <div className="np-item-desc">{n.body ?? n.content}</div>
                </div>
                <div className="np-item-right">
                  <span className="np-item-time">{n.time ?? n.sentAt?.slice(0, 10) ?? n.createdAt?.slice(0, 10)}</span>
                  {!n.isRead && <span className="np-unread-dot"></span>}
                  {/* ✅ زر حذف الإشعار الواحد */}
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

        {/* ✅ زر تحميل المزيد — يظهر فقط لو في صفحات إضافية ولسنا بتبويب مفلتر بحيث القائمة المعروضة قد لا تعكس كل البيانات بعد */}
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

        {/* ── Modal تفاصيل الإشعار ── */}
        {selectedNotif && (
          <div className="np-modal-backdrop" onClick={closeModal}>
            <div
              className="np-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="np-modal-close" onClick={closeModal} aria-label="إغلاق">
                <CloseIcon />
              </button>

              <div
                className="np-modal-icon"
                style={{
                  background: (TYPE_META[selectedNotif.type] ?? TYPE_META.alert).bg,
                  color: (TYPE_META[selectedNotif.type] ?? TYPE_META.alert).color,
                }}
              >
                {(TYPE_META[selectedNotif.type] ?? TYPE_META.alert).icon}
              </div>

              <h2 className="np-modal-title">{selectedNotif.title}</h2>
              <p className="np-modal-desc">{selectedNotif.body ?? selectedNotif.content}</p>

              <div className="np-modal-meta">
                <span className="np-modal-time">
                  {selectedNotif.time
                    ?? selectedNotif.sentAt?.slice(0, 10)
                    ?? selectedNotif.createdAt?.slice(0, 10)}
                </span>
                <span className="np-modal-read-badge">تم التعليم كمقروء</span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}