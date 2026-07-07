import { io } from "socket.io-client";
import { getAuthToken } from "../services/authService";
import { authAPI } from "./api";

// ✅ نشيل أي /api أو /api/ من آخر الرابط، لأنه Socket.io بده الـ origin فقط
const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const SOCKET_URL = rawApiUrl.replace(/\/api\/?$/, "");

let socket = null;
let isRefreshingForSocket = false;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: getAuthToken() }),
      autoConnect: false,
      // ✅ 2️⃣ إضافة polling كـ fallback لو الـ websocket فشل (بروكسي، فايروول...الخ)
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect_error", async (err) => {
      const msg = err?.message || "";
      const isAuthError =
        msg.toLowerCase().includes("token") ||
        msg.toLowerCase().includes("auth") ||
        msg.toLowerCase().includes("unauthorized");

      if (!isAuthError || isRefreshingForSocket) return;

      isRefreshingForSocket = true;
      try {
        const res = await authAPI.refreshToken();
        const newToken = res?.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem("token", newToken);
          socket.connect();
        }
      } catch (refreshErr) {
        console.error("فشل تجديد التوكن لإعادة اتصال السوكيت:", refreshErr);
      } finally {
        isRefreshingForSocket = false;
      }
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}