import { useState, useRef, useEffect } from "react";
import "./FloatingChatWidget.css";
import api from "../utils/api";

// ══════════════════════════════════════════════════
//  ⚙️  متوافق مع الـ API الحقيقي (حسب Postman collection):
//
//  POST /api/seller/chatbot/chat
//    - نص فقط:  body JSON  { message, sessionId? }
//    - نص + صورة: body form-data { message, productImage (File), sessionId? }
//    → { status: "success", data: { reply, sessionId, actions, productImageReady, productImageUrl } }
// ══════════════════════════════════════════════════

const IS_API_READY = !!import.meta.env.VITE_API_URL;

// ── Icons ──
const ChatBubbleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
    <line x1="12" y1="2.5" x2="12" y2="5" />
    <circle cx="12" cy="2" r="1.1" fill="#fff" stroke="none" />
    <rect x="4.5" y="5" width="15" height="12" rx="4" />
    <circle cx="9" cy="11" r="1.4" fill="#fff" stroke="none" />
    <circle cx="15" cy="11" r="1.4" fill="#fff" stroke="none" />
    <line x1="9" y1="14.2" x2="15" y2="14.2" />
    <line x1="4.5" y1="9.5" x2="2.5" y2="9.5" />
    <line x1="19.5" y1="9.5" x2="21.5" y2="9.5" />
    <path d="M8 17v1.5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V17" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const StoreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <path d="M3 9l1-5h16l1 5" />
    <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
    <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
  </svg>
);

//   أيقونة تعليق/إرفاق صورة
const PaperclipIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const RemoveImageIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── ردود سريعة تخص البائع (مش المشتري) ──
const SELLER_QUICK_REPLIES = [
  "كيف أضيف منتج جديد؟",
  "كيف أرد على تقييم زبون؟",
  "ليش طلب معين ناقص فيه بيانات؟",
];

const WELCOME_MESSAGE = {
  id: "welcome",
  sender: "bot",
  text: "أهلاً! أنا مساعد Gaza Gate للبائعين 🛍️ كيف فيني أساعدك اليوم؟",
};

const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  //   الصورة المختارة قبل الإرسال + معاينتها
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  //   نحافظ على sessionId طول عمر الجلسة عشان البوت يفتكر سياق المحادثة
  const sessionIdRef = useRef(null);

  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── نزول تلقائي لآخر رسالة ──
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // ── تنظيف الـ object URL لما نشيل الصورة أو الـ component يتفكك ──
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const appendMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      appendMessage({
        id: `err-${Date.now()}`,
        sender: "bot",
        text: "الملف المختار مش صورة، جربي ترفعي صورة (jpg/png).",
      });
      e.target.value = "";
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = ""; // تفريغ الـ input عشان لو اخترت نفس الملف مرة ثانية يشتغل onChange
  };

  const removeSelectedImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  //   الاتصال الحقيقي بالـ endpoint حسب الـ Postman
  // بيدعم حالتين: نص عادي (JSON) أو نص+صورة (form-data)
  const sendMessageToApi = async (text, file) => {
    let res;

    if (file) {
      const formData = new FormData();
      formData.append("message", text || "");
      formData.append("productImage", file);
      if (sessionIdRef.current) {
        formData.append("sessionId", sessionIdRef.current);
      }

      res = await api.post("/api/seller/chatbot/chat", formData, {
        //   لازم نلغي أي Content-Type افتراضي عشان axios/المتصفح يحط الـ boundary الصح لـ multipart
        headers: { "Content-Type": undefined },
      });
    } else {
      const body = { message: text };
      if (sessionIdRef.current) {
        body.sessionId = sessionIdRef.current;
      }
      res = await api.post("/api/seller/chatbot/chat", body);
    }

    const data = res.data?.data ?? {};

    // نحفظ الـ sessionId (يرجع من أول رد، ونستخدمه بكل الرسائل اللي بعدها)
    if (data.sessionId) {
      sessionIdRef.current = data.sessionId;
    }

    return data;
  };

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    const file = imageFile;

    // لازم يكون في نص أو صورة على الأقل
    if ((!text && !file) || sending) return;

    setShowQuickReplies(false);
    setInput("");

    const sellerMsg = {
      id: `local-${Date.now()}`,
      sender: "seller",
      text,
      image: imagePreview, //   نعرض معاينة الصورة يلي بعتها البائع بنفس الفقاعة
    };
    appendMessage(sellerMsg);

    // نفضي حالة الصورة المختارة فوراً (بس ما بنعمل revoke لأنها لسا معروضة بالرسالة)
    setImageFile(null);
    setImagePreview(null);

    setSending(true);
    try {
      if (IS_API_READY) {
        const data = await sendMessageToApi(text, file);
        appendMessage({
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: data.reply ?? "تم استلام رسالتك، رح يتواصل معك فريق الدعم قريباً.",
          image: data.productImageReady ? data.productImageUrl : null,
        });
      } else {
        // لسا ما في باك إند شغال — رد تجريبي بس عشان نجرب الشكل
        await new Promise((r) => setTimeout(r, 600));
        appendMessage({
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "هاد رد تجريبي مؤقت، رح يتوصل بالباك إند الحقيقي قريباً.",
        });
      }
    } catch (err) {
      console.error("فشل إرسال الرسالة:", err);
      appendMessage({
        id: `err-${Date.now()}`,
        sender: "bot",
        text: "تعذّر إرسال رسالتك، حاول مرة أخرى.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* الأيقونة العائمة */}
      <button
        type="button"
        className={`fcw-fab ${isOpen ? "fcw-fab-open" : ""}`}
        onClick={() => setIsOpen((p) => !p)}
        aria-label="فتح محادثة الدعم"
      >
        {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
      </button>

      {/* نافذة المحادثة */}
      {isOpen && (
        <div className="fcw-window" dir="rtl">
          <div className="fcw-header">
            <button type="button" className="fcw-close-btn" onClick={() => setIsOpen(false)}>
              <CloseIcon />
            </button>
            <div className="fcw-header-info">
              <span className="fcw-header-title">مساعد البائع <StoreIcon /></span>
              <span className="fcw-header-sub">Gaza Gate - متاح 24/7</span>
            </div>
            <div className="fcw-header-avatar">
              <StoreIcon />
            </div>
          </div>

          <div className="fcw-body" ref={bodyRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`fcw-msg-row ${msg.sender === "seller" ? "fcw-msg-row-seller" : ""}`}
              >
                <div
                  className={`fcw-msg-bubble ${
                    msg.sender === "seller" ? "fcw-msg-seller" : "fcw-msg-bot"
                  }`}
                >
                  {msg.image && (
                    <img src={msg.image} alt="مرفق" className="fcw-msg-image" />
                  )}
                  {msg.text && (
                    <div style={{ whiteSpace: "pre-line" }}>{msg.text}</div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="fcw-msg-row">
                <div className="fcw-msg-bubble fcw-msg-bot fcw-msg-typing">
                  <span className="fcw-dot" />
                  <span className="fcw-dot" />
                  <span className="fcw-dot" />
                </div>
              </div>
            )}

            {showQuickReplies && !sending && (
              <div className="fcw-quick-replies">
                {SELLER_QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="fcw-quick-reply-btn"
                    onClick={() => handleSend(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/*   معاينة الصورة المختارة قبل الإرسال */}
          {imagePreview && (
            <div className="fcw-image-preview-row">
              <div className="fcw-image-preview-wrap">
                <img src={imagePreview} alt="معاينة" className="fcw-image-preview" />
                <button
                  type="button"
                  className="fcw-image-remove-btn"
                  onClick={removeSelectedImage}
                  aria-label="إزالة الصورة"
                >
                  <RemoveImageIcon />
                </button>
              </div>
            </div>
          )}

          <div className="fcw-input-row">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelected}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="fcw-attach-btn"
              onClick={handlePickImage}
              disabled={sending}
              aria-label="إرفاق صورة"
            >
              <PaperclipIcon />
            </button>
            <input
              type="text"
              className="fcw-input"
              placeholder="اكتب رسالتك..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button
              type="button"
              className="fcw-send-btn"
              onClick={() => handleSend()}
              disabled={sending || (!input.trim() && !imageFile)}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;