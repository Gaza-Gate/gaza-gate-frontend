import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ShoppingBag, Sparkles, Mail } from "lucide-react";
import api from "../utils/api";
import "../styles/chatbot.css";
import "./CustomerChatWidget.css";

/**
 * ═══════════════════════════════════════════════════════════════
 *  CustomerChatWidget
 *  ─────────────────────────────────────────────────────────────
 *  زرار شات عائم (FAB) + نافذة محادثة مربوطة بالـ API الحقيقي:
 *
 *    POST /api/customer/chatbot/ask
 *    body  : { question: string }
 *    reply : { status: "success", data: { found, answer,
 *                                         matchedQuestion?, source,
 *                                         unansweredQuestionId?,
 *                                         supportEmail? } }
 *
 *  مصدر الرد (`source`) بيكون:
 *    • "knowledge_base"  → سؤال من قاعدة المعرفة
 *    • "ai"              → رد مولّد بالذكاء الاصطناعي
 *    • "fallback"        → ما لقى إجابة، بيسجّل unansweredQuestionId
 *                          وبيعرض supportEmail
 *
 *  ✅ نفس الـ Design System الموحّد مع Seller Chatbot (styles/chatbot.css)
 *  ✅ Dark Theme + RTL Support
 * ═══════════════════════════════════════════════════════════════
 */

// الـ api instance في utils/api.js بيستخدم VITE_API_URL أو بيقع على Render
// — فدايماً فيه باك-end شغال. هاد الـ flag للـ demo فقط (لما يكون بدون API).
const IS_API_READY = true;

const WELCOME_MESSAGE = {
  id: "welcome",
  from: "bot",
  text: "أهلاً! أنا مساعد GAZA GATE 👋\nاسألني عن منتجاتنا، التوصيل، أو طلباتك.",
  time: formatNow(),
};

// ردود سريعة تخص الكستمر (عربي) — بتنقر أي وحدة منها كأنها سؤال
const CUSTOMER_QUICK_REPLIES = [
  "ما هي طرق الدفع؟",
  "ما هي مناطق التوصيل؟",
  "كيف أتتبع طلبي؟",
  "كيف أتواصل مع الدعم؟",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── صيغة الوقت المختصرة (HH:MM) — نستخدمها لعرض وقت الرسالة ──
function formatNow() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CustomerChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // لو آخر رسالة جاية من البوت ما إلها إجابة (fallback)، نعرض hint بالإيميل
  const [fallbackInfo, setFallbackInfo] = useState(null);
  // لإخفاء الـ quick replies بعد أول تفاعل (لتجنب تكرارها في كل مرة)
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  // ── scroll تلقائي لآخر رسالة ──
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  // ── لما تنفتح النافذة، ركّز على الـ input ──
  useEffect(() => {
    if (open) {
      // تأخير بسيط حتى يخلص animation الفتح
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [open]);

  const pushUser = (text) => {
    setMessages((prev) => [...prev, { id: makeId(), from: "user", text, time: formatNow() }]);
    // بعد أول رسالة من المستخدم، نخفي الردود السريعة
    setShowQuickReplies(false);
  };

  const pushBot = (text, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), from: "bot", text, time: formatNow(), ...extra },
    ]);
  };

  const sendQuestion = async (text) => {
    const question = (text || "").trim();
    if (!question || sending) return;

    setInput("");
    setFallbackInfo(null);
    pushUser(question);
    setSending(true);

    try {
      if (!IS_API_READY) {
        // بدون باك محلي/remote — رد تجريبي مؤقت
        await new Promise((r) => setTimeout(r, 500));
        pushBot("هاد رد تجريبي مؤقت، رح يتربط بالـ API الحقيقي قريباً.");
        return;
      }

      const res = await api.post("/api/customer/chatbot/ask", { question });
      const data = res.data?.data ?? {};

      const answer =
        data.answer ||
        (data.found === false
          ? "ما قدرت ألاقي إجابة واضحة لسؤالك."
          : "تمام، تم استلام طلبك.");

      pushBot(answer);

      // لو fallback → نعرض hint بالدعم بالإيميل
      if (data.found === false || data.source === "fallback") {
        setFallbackInfo({
          supportEmail: data.supportEmail || "support@gazagate.com",
          unansweredId: data.unansweredQuestionId || null,
        });
      } else {
        setFallbackInfo(null);
      }
    } catch (err) {
      console.error("[CustomerChatWidget] فشل إرسال السؤال:", err);
      // fallback لو status 404 (الـ endpoint مش جاهز) أو أي خطأ شبكة
      const status = err?.response?.status;
      const msg =
        status === 404
          ? "خدمة الشات غير مفعّلة حالياً. حاول لاحقاً أو تواصل مع الدعم."
          : "صار خطأ أثناء إرسال سؤالك، حاول مرة ثانية.";
      pushBot(msg);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    sendQuestion(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (label) => {
    if (sending) return;
    sendQuestion(label);
  };

  return (
    <>
      {/* ── زر الشات العائم (FAB) ── */}
      <button
        type="button"
        className={`ccw-fab ${open ? "ccw-fab-open" : ""}`}
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "إغلاق المساعد" : "فتح المساعد"}
        title="مساعد GAZA GATE"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* ── نافذة المحادثة ── */}
      {open && (
        <div className="ccw-panel" dir="rtl" role="dialog" aria-label="نافذة المساعد">
          <div className="ccw-header">
            <button
              type="button"
              className="ccw-close"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
            <div className="ccw-header-info">
              <span className="ccw-title">مساعد GAZA GATE</span>
              <span className="ccw-status">
                <span className="ccw-status-dot" />
                متاح 24/7
              </span>
            </div>
            <span className="ccw-header-icon" aria-hidden="true">
              <ShoppingBag size={18} />
            </span>
          </div>

          <div className="ccw-body" ref={bodyRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.from === "bot" ? "ccw-bubble-wrap-bot" : "ccw-bubble-wrap-user"
                }
              >
                <div
                  className={
                    m.from === "bot" ? "ccw-bubble-bot" : "ccw-bubble-user"
                  }
                >
                  {m.from === "bot" && (
                    <Sparkles size={12} className="ccw-bubble-icon" aria-hidden="true" />
                  )}
                  <div>
                    <span>{m.text}</span>
                    {m.time && (
                      <span
                        className={
                          m.from === "bot"
                            ? "ccw-msg-time"
                            : "ccw-msg-time ccw-msg-time--user"
                        }
                      >
                        {m.time}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* مؤشر الكتابة */}
            {sending && (
              <div className="ccw-bubble-wrap-bot">
                <div className="ccw-bubble-bot ccw-typing" aria-label="يكتب الآن">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {/* hint بالدعم لما يكون fallback */}
            {!sending && fallbackInfo && (
              <div className="ccw-fallback-hint">
                <Mail size={13} />
                <span>
                  لو بتحب تتواصل مباشرة:&nbsp;
                  <a href={`mailto:${fallbackInfo.supportEmail}`}>
                    {fallbackInfo.supportEmail}
                  </a>
                </span>
              </div>
            )}
          </div>

          {/* ردود سريعة — تظهر فقط في البداية ولما ما في sending جاري */}
          {!sending && showQuickReplies && (
            <div className="ccw-quick-replies" role="list">
              {CUSTOMER_QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="ccw-quick-btn"
                  onClick={() => handleQuickReply(q)}
                  role="listitem"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="ccw-input-area">
            <input
              ref={inputRef}
              type="text"
              className="ccw-text-input"
              placeholder="اكتب سؤالك هنا..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              aria-label="اكتب سؤالك"
            />
            <button
              type="button"
              className="ccw-send-btn"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              aria-label="إرسال"
            >
              <Send size={16} style={{ transform: "scaleX(-1)" }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
