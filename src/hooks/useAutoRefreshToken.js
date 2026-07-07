import { useEffect, useRef } from "react";
import { refreshAccessToken, saveRefreshedToken } from "../services/authService";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 دقائق

export function useAutoRefreshToken() {
  const intervalRef = useRef(null);

  useEffect(() => {
    async function silentRefresh() {
      const hasSession =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!hasSession) return;

      try {
        const newToken = await refreshAccessToken();
        const remember = Boolean(localStorage.getItem("token"));
        saveRefreshedToken(newToken, remember);
      } catch (err) {
        // ❌ ما منسجل خروج هون أبداً
        // التجديد بالخلفية ممكن يفشل لأسباب مؤقتة (شبكة، تأخير سيرفر...)
        // تسجيل الخروج الفعلي بيصير بس لما طلب حقيقي (API call) يرجع 401
        // وهذا موجود أصلاً بـ api.js و orderService.js و productService.js
        console.warn("فشل التجديد الاستباقي للتوكن (سيُعاد المحاولة لاحقاً):", err.message);
      }
    }

    intervalRef.current = setInterval(silentRefresh, REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        silentRefresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}