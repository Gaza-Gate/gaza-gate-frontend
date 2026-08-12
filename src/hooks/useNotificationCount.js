// src/hooks/useNotificationCount.js
//
// هوك مركزي لجلب وعدّ الإشعارات غير المقروءة مع عزل صارم حسب الدور.
//
// 🔑 المشكلة اللي بيحلها:
//   قبلاً كل navbar (CustomerNavbar / SellerNavbar) كان عنده logic مستقل
//   لجلب وعدّ الإشعارات، وبيعمل fetch + socket listener بشكل منفصل.
//   أي خطأ بسيط (مثلاً missing dependency) كان بيخلي العداد يخلط بين الأدوار.
//
// ✅ الحل:
//   - هوك واحد `useNotificationCount(role)` → بيدير العداد لدور معيّن
//   - عزل تام: لو الدور المطلوب ≠ الـ currentRole → Count = 0 دائماً
//   - مصدر الحقيقة الوحيد: endpoint الخاص بالدور
//     (/api/customer/notification vs /api/seller/notification)
//   - الـ socket events بتتم تصفيتها بدقة حسب الدور —
//     الإشعارات اللي مش تخص الدور الحالي بتتجاهل فوراً.
//
// 🚀 الأداء:
//   - Fetch واحد عند mount (ولو الدور تغيّر)
//   - Socket listener واحد لكل هوك instance
//   - عند تغيير الـ role: العداد بيصفر فوراً، ثم fetch جديد
//   - Optimistic update: عند قراءة إشعار، العداد بينقص بدون await
//
// 🔗 يعتمد على الفلتر الموحّد `notificationRoleFilter.js` (نفس الـ logic
//    المستخدم بصفحات الإشعارات) — لتجنب تكرار الكود وضمان تطابق السلوك.

import { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";
import { connectSocket } from "../utils/socket";
import { useAuth } from "../context/AuthContext";
import {
  isNotificationForRole,
  extractNotificationFromPayload,
} from "../utils/notificationRoleFilter";

// ✅ اسم الحدث اللي بيطلقه AuthContext بعد أي role switch
//    (نفس المعرّف المُعرَّف بـ AuthContext.jsx لازم يكون متطابق)
const ROLE_CACHE_CLEAR_EVENT = "gaza-gate-role-cache-clear";

/**
 * هوك جلب عدد الإشعارات غير المقروءة لدور معيّن.
 *
 * @param {"customer" | "seller"} role - الدور المطلوب
 * @returns {{
 *   count: number,
 *   loading: boolean,
 *   refresh: () => Promise<void>,
 *   decrement: (by?: number) => void
 * }}
 *
 * 🔒 ضمانات العزل:
 *   - لو currentRole !== role → count دائماً = 0 (لا fetch، لا socket listener)
 *   - socket events الخاصة بدور آخر بتتجاهل فوراً
 *   - الفلتر بيشتغل بـ 4 طبقات (type, actionUrl, recipient, keywords)
 */
export function useNotificationCount(role) {
  const { currentRole } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  const isActive = currentRole === role;

  const endpoint = role === "seller" ? "/api/seller/notification" : "/api/customer/notification";

  /**
   * ✅ عدّ الإشعارات غير المقروءة من اللائحة بعد فلترتها حسب الدور.
   *
   * 🔑 السبب الرئيسي للإصلاح:
   *    الباك بيرجّع `res.data.data.stats.unRead` بدون فلترة دقيقة حسب الـ
   *    role الحالي — مثلاً إشعار "new order on your product" (نوعه ORDER
   *    وموجود بكلا الدورين) ممكن يطلع بالـ count حتى لو الـ user بـ customer
   *    mode. الحل: نحسب من اللائحة بعد ما نطبّق عليها نفس فلتر الـ
   *    NotificationDropdown → التطابق بين العداد واللائحة 100%.
   */
  const countUnread = useCallback((rawList) => {
    if (!Array.isArray(rawList)) return 0;
    // ✅ فلترة حسب الدور (نفس الفلتر اللي بيستخدمه NotificationDropdown)
    const filtered = rawList.filter((n) => isNotificationForRole(n, role));
    return filtered.filter((n) => !n.isRead).length;
  }, [role]);

  const refresh = useCallback(async () => {
    if (!isActive) {
      setCount(0);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(endpoint);
      // ✅ نحسب من اللائحة المُفلترة — مش من stats.unRead مباشرة
      //    عشان نضمن تطابق العداد مع NotificationDropdown
      const list =
        res.data?.data?.notifications ?? res.data?.notifications ?? [];
      if (Array.isArray(list) && list.length > 0) {
        if (isMountedRef.current) setCount(countUnread(list));
        return;
      }
      // Fallback: لو الباك ما بعتش list (نادراً) → نثق بـ stats.unRead
      const statsUnread = res.data?.data?.stats?.unRead;
      if (typeof statsUnread === "number") {
        if (isMountedRef.current) setCount(statsUnread);
        return;
      }
      if (isMountedRef.current) setCount(0);
    } catch (err) {
      // 401/403 → تبديل دور متوقع، ما نسجل خطأ
      const status = err?.response?.status;
      if (status !== 401 && status !== 403) {
        // ignore — hook صامت
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [endpoint, isActive, countUnread]);

  // ⬇️ تخفيض محلي (optimistic) عند قراءة إشعار
  const decrement = useCallback((by = 1) => {
    setCount((prev) => Math.max(0, prev - by));
  }, []);

  // ⬇️ إعادة ضبط + جلب عند تغيّر الدور
  useEffect(() => {
    isMountedRef.current = true;
    if (!isActive) {
      // عزل صارم: لو مش الدور المطلوب → صفر دائماً
      setCount(0);
      return;
    }
    setCount(0);
    refresh();
    return () => {
      isMountedRef.current = false;
    };
  }, [isActive, refresh]);

  // ⬇️ ✅ safety net: الاستماع لحدث gaza-gate-role-cache-clear
  //    (بيطلقه AuthContext بعد كل role switch ناجح عبر clearRoleCaches).
  //    الهدف: reset فوري للعداد → 0 لحظة التبديل، ثم الـ useEffect فوق
  //    بيعمل re-fetch لما الـ React state يلتقط الـ currentRole الجديد.
  //    بدون هذا الـ listener ممكن يظهر الـ badge بقيمة قديمة لـ tick واحد.
  useEffect(() => {
    function onRoleCacheClear() {
      if (!isMountedRef.current) return;
      // ✅ reset فوري — الـ useEffect فوق رح يعمل refresh تلقائياً
      setCount(0);
    }
    window.addEventListener(ROLE_CACHE_CLEAR_EVENT, onRoleCacheClear);
    return () => {
      window.removeEventListener(ROLE_CACHE_CLEAR_EVENT, onRoleCacheClear);
    };
  }, []);

  // ⬇️ socket listener (بس إذا نشط + نشتري على نفس الـ role)
  useEffect(() => {
    if (!isActive) return undefined;

    const socket = connectSocket();

    const NEW_EVENTS = ["newNotification", "notification:new", "notification"];
    const READ_EVENTS = ["notification:read", "notification:readAll", "notificationsUpdated"];

    const handleNew = (payload) => {
      if (!isMountedRef.current) return;
      // ✅ فلترة حسب الدور — هذا السطر هو اللي بيعزل العداد
      //    (نفس الفلتر المستخدم بصفحات الإشعارات)
      if (!isNotificationForRole(extractNotificationFromPayload(payload), role)) {
        return;
      }
      setCount((prev) => prev + 1);
    };

    const handleRead = () => {
      // إعادة جلب من الباك عشان نضمن العداد دقيق
      refresh();
    };

    NEW_EVENTS.forEach((evt) => socket.on(evt, handleNew));
    READ_EVENTS.forEach((evt) => socket.on(evt, handleRead));

    return () => {
      NEW_EVENTS.forEach((evt) => socket.off(evt, handleNew));
      READ_EVENTS.forEach((evt) => socket.off(evt, handleRead));
    };
  }, [isActive, role, refresh]);

  return { count, loading, refresh, decrement };
}
