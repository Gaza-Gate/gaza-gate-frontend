import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCustomerOrderDetails, getAuthToken } from "../services/authService";
import "./ChatbotWidget.css";

const WELCOME_MESSAGE = {
  id: "welcome",
  from: "bot",
  text: "أهلاً! أنا مساعد GAZA GATE 👋 كيف أقدر أساعدك اليوم؟",
};

const QUICK_REPLIES = [
  { id: "track", label: "أين طلبي؟" },
  { id: "delivery", label: "مدة التوصيل" },
  { id: "return", label: "سياسة الإرجاع" },
  { id: "contact", label: "تواصل مع الدعم" },
];

function extractOrderNumber(text) {
  const match = text.match(/ORD-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const pushBotMessage = (text, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), from: "bot", text, ...extra },
    ]);
  };

  const pushUserMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), from: "user", text },
    ]);
  };

  const simulateTyping = (callback, delay = 700) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      callback();
    }, delay);
  };

  async function handleOrderLookup(orderNumber) {
    const token = getAuthToken();
    if (!token) {
      pushBotMessage("تحتاج/ي تسجيل الدخول أولاً حتى أقدر أتابع طلبك 🙏");
      return;
    }
    try {
      const order = await getCustomerOrderDetails(orderNumber, token);
      const status = order?.status || "غير معروف";
      pushBotMessage(
        `طلبك رقم ${orderNumber} حالته حالياً: "${status}". تقدر/ي تتابعي كل التفاصيل من صفحة طلباتي.`
      );
    } catch (err) {
      pushBotMessage(
        `ما قدرت ألاقي طلب بهذا الرقم. تأكدي من الرقم أو راجعي صفحة "طلباتي" مباشرة.`
      );
    }
  }

  function handleQuickReply(id, label) {
    pushUserMessage(label);
    simulateTyping(() => {
      switch (id) {
        case "track":
          pushBotMessage("تمام، ابعتيلي رقم الطلب (مثال: ORD-241220) وبتابعلك حالته 📦");
          break;
        case "delivery":
          pushBotMessage("مدة التوصيل عادة بين 1-2 يوم عمل حسب موقعك والمتجر.");
          break;
        case "return":
          pushBotMessage("تقدر/ي ترجعي أي منتج خلال 14 يوم من الاستلام إذا كان بحالته الأصلية.");
          break;
        case "contact":
          pushBotMessage("جاري تحويلك لصفحة المراسلات مع فريق الدعم...");
          setTimeout(() => {
            setOpen(false);
            navigate("/messages");
          }, 900);
          break;
        default:
          break;
      }
    });
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    pushUserMessage(text);
    setInput("");

    const orderNumber = extractOrderNumber(text);

    simulateTyping(() => {
      if (orderNumber) {
        handleOrderLookup(orderNumber);
      } else if (text.includes("توصيل") || text.includes("شحن")) {
        pushBotMessage("مدة التوصيل عادة بين 1-2 يوم عمل حسب موقعك والمتجر.");
      } else if (text.includes("ارجاع") || text.includes("إرجاع") || text.includes("استرجاع")) {
        pushBotMessage("تقدر/ي ترجعي أي منتج خلال 14 يوم من الاستلام إذا كان بحالته الأصلية.");
      } else {
        pushBotMessage(
          "ما قدرت أفهم سؤالك تماماً 🙏 تقدر/ي تختاري أحد الخيارات تحت، أو تتواصلي مباشرة مع فريق الدعم."
        );
      }
    });
  }

  return (
    <>
      {/* الزر العائم */}
      <button
        className="chatbot-fab"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="مساعد GAZA GATE"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* بانل الشات */}
      {open && (
        <div className="chatbot-panel" dir="rtl">
          <div className="chatbot-header">
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="إغلاق">
              <X size={18} />
            </button>
            <div className="chatbot-header-info">
              <span className="chatbot-title">مساعد GAZA GATE</span>
              <span className="chatbot-status">متاح 24/7</span>
            </div>
            <span className="chatbot-header-icon">
              <ShoppingBag size={18} />
            </span>
          </div>

          <div className="chatbot-body">
            {messages.map((m) =>
              m.from === "bot" ? (
                <div className="chatbot-bubble-wrap-bot" key={m.id}>
                  <div className="chatbot-bubble-bot">{m.text}</div>
                </div>
              ) : (
                <div className="chatbot-bubble-wrap-user" key={m.id}>
                  <div className="chatbot-bubble-user">{m.text}</div>
                </div>
              )
            )}

            {typing && (
              <div className="chatbot-bubble-wrap-bot">
                <div className="chatbot-bubble-bot chatbot-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="chatbot-quick-replies">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q.id}
                className="chatbot-quick-btn"
                onClick={() => handleQuickReply(q.id, q.label)}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="chatbot-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب رسالتك..."
              className="chatbot-text-input"
            />
            <button className="chatbot-send-btn" onClick={handleSend} disabled={!input.trim()}>
              <Send size={16} style={{ transform: "scaleX(-1)" }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}