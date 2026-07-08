import { io } from "socket.io-client";
import { getAuthToken } from "./authService";

const SOCKET_URL = import.meta.env.VITE_API_URL || "https://gaza-gate-backend-f9hf.onrender.com";

let socket = null;

// ⚠️ عدّلي أسماء الـ events هون لتطابق الباك إند بالضبط
export const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "join_conversation",
  LEAVE_CONVERSATION: "leave_conversation",
  SEND_MESSAGE: "send_message",
  NEW_MESSAGE: "new_message",
  MESSAGE_READ: "message_read",
  TYPING: "typing",
  STOP_TYPING: "stop_typing",
};

export function connectSocket() {
  if (socket?.connected) return socket;

  const token = getAuthToken();

  socket = io(SOCKET_URL, {
    // ⚠️ عدّلي طريقة إرسال التوكن حسب توقع الباك إند
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("✅ Socket متصل:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ فشل اتصال Socket:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.warn("⚠️ انقطع اتصال Socket:", reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function joinConversation(conversationId) {
  socket?.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId });
}

export function leaveConversation(conversationId) {
  socket?.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, { conversationId });
}

// ✅ رجّعنا Promise حتى تقدري تعرفي فعلياً هل الرسالة وصلت للسيرفر أو لأ
// بيستخدم acknowledgment callback من socket.io + timeout لتجنب الانتظار للأبد
export function emitSendMessage(conversationId, content, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      reject(new Error("لا يوجد اتصال مباشر بالسيرفر حالياً، تحقق من اتصالك بالإنترنت"));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("لم يصل تأكيد استلام الرسالة من السيرفر (انتهت المهلة)"));
    }, timeoutMs);

    // ⚠️ لازم الباك إند يستقبل callback ثالث بالـ event handler ويستدعيه، مثلاً:
    // socket.on("send_message", (data, callback) => { ... callback({ success: true, message }); });
    socket.emit(
      SOCKET_EVENTS.SEND_MESSAGE,
      { conversationId, content, messageType: "text" },
      (response) => {
        clearTimeout(timer);
        if (response?.success === false || response?.status === "fail") {
          reject(new Error(response?.message || "فشل إرسال الرسالة"));
        } else {
          resolve(response);
        }
      }
    );
  });
}

export function emitTyping(conversationId, isTyping) {
  socket?.emit(isTyping ? SOCKET_EVENTS.TYPING : SOCKET_EVENTS.STOP_TYPING, { conversationId });
}