import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { askChatbot, getAuthToken } from "../services/authService";
import "./ChatbotWidget.css";

const WELCOME_MESSAGE = {
  id: "welcome",
  from: "bot",
  text: "أهلاً! أنا مساعد GAZA GATE 👋 كيف أقدر أساعدك اليوم؟",
};

const QUICK_REPLIES = [
  { id: "track", label: "أين طلبي؟" },
  { id: "delivery", label: "مناطق التوصيل" },
  { id: "payment", label: "طرق الدفع" },
  { id: "contact", label: "تواصل مع الدعم" },
];

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const pushBotMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), from: "bot", text },
    ]);
  };

  const pushUserMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), from: "user", text },
    ]);
  };

  async function sendQuestion(question) {
    pushUserMessage(question);
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await askChatbot(question, token);
      const answer = res?.data?.answer || res?.answer;

      if (answer) {
        pushBotMessage(answer);
      } else {
        pushBotMessage("ما قدرت ألاقي جواب على سؤالك، جرب تصيغيه بطريقة تانية أو تواصلي مع الدعم.");
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      pushBotMessage("صار خطأ بالاتصال، حاولي مرة ثانية بعد شوي 🙏");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickReply(id, label) {
    if (id === "contact") {
      pushUserMessage(label);
      pushBotMessage("جاري تحويلك لصفحة المراسلات مع فريق الدعم...");
      setTimeout(() => {
        setOpen(false);
        navigate("/messages");
      }, 900);
      return;
    }
    sendQuestion(label);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    sendQuestion(text);
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

            {loading && (
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
                disabled={loading}
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
              placeholder="اكتب سؤالك..."
              className="chatbot-text-input"
              disabled={loading}
            />
            <button className="chatbot-send-btn" onClick={handleSend} disabled={!input.trim() || loading}>
              <Send size={16} style={{ transform: "scaleX(-1)" }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}