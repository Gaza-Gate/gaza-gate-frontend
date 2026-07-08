import { useState, useEffect, useRef } from "react";
import { Send, Search, Info, Loader2, MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import {
  getAuthToken,
  getCurrentUser,
  getConversations,
  getMessages,
  sendMessage,
} from "../services/authService";
import { getSocket, connectSocket } from "../utils/socket";
import "./Messages.css";
import SellerNavbar from "../components/SellerNavbar";

const COLORS = ["#F97316", "#8B5CF6", "#EF4444", "#10B981", "#3B82F6", "#EC4899"];
function avatarColor(name = "") {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}
function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fullName(person) {
  if (!person) return "مشتري";
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || "مشتري";
}
// بيتعامل مع الحالتين: الداتا جاية مباشرة أو ملفوفة { message: {...} }
function unwrap(payload, key) {
  if (!payload) return null;
  return payload[key] ?? payload;
}

// ✅ مقارنة آمنة للـ IDs (UUID/ObjectId) — بتتجنب مشاكل الحروف الكبيرة/الصغيرة
// أو اختلاف النوع (string مقابل رقم مثلاً)
function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

// ---------- منع تكرار الرسائل (dedup بالـ id) ----------
// بيضيف رسالة جديدة بس إذا مش موجودة أصلاً بالقائمة (بنفس الـ id)
function addMessageUnique(prevMessages, newMsg) {
  if (!newMsg?.id) return [...prevMessages, newMsg];
  const exists = prevMessages.some((m) => sameId(m.id, newMsg.id));
  if (exists) return prevMessages;
  return [...prevMessages, newMsg];
}

export default function Messages() {
  const token = getAuthToken();
  const currentUser = getCurrentUser();
  const myId = currentUser?.id;

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);

  // ---------- تعديل / حذف الرسائل ----------
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const bottomRef = useRef(null);
  const selectedIdRef = useRef(null); // عشان نستخدمه جوا socket listeners بدون stale closure
  const menuRef = useRef(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // ---------- إغلاق قائمة الثلاث نقاط عند الضغط برا ----------
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  // ---------- تحميل المحادثات ----------
  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoadingConvs(true);
        const data = await getConversations();
        const list = data?.data?.conversations ?? [];
        setConversations(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingConvs(false);
      }
    }
    fetchConversations();
  }, []);

  // ---------- تحميل رسائل المحادثة المختارة ----------
  useEffect(() => {
    if (!selectedId) return;
    async function fetchMessages() {
      try {
        setLoadingMsgs(true);
        const data = await getMessages(selectedId);
        const list = data?.data?.messages ?? [];
        setMessages(list);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingMsgs(false);
      }
    }
    fetchMessages();
  }, [selectedId]);

  // ---------- socket: اتصال + انضمام للغرفة (مع دعم إعادة الاتصال) ----------
  useEffect(() => {
    if (!token) return;
    const s = connectSocket();

    // بيعمل join فوري لو الـ socket متصل أصلاً وفي محادثة مختارة
    function joinCurrentConversation() {
      const id = selectedIdRef.current;
      if (id) {
        s.emit("join_conversation", { conversationId: id });
        s.emit("mark_read", { conversationId: id });
      }
    }

    if (selectedId) {
      joinCurrentConversation();
    }

    // ---------- الجزء المهم: إعادة الانضمام تلقائياً عند إعادة الاتصال ----------
    // لو انقطع النت، أو الـ socket ID اتغيّر (reconnect)، الغرف القديمة بتنمسح
    // من طرف السيرفر، فلازم نعيد الانضمام يدوياً كل مرة يتصل فيها الـ socket من جديد
    s.on("connect", joinCurrentConversation);

    return () => {
      s.off("connect", joinCurrentConversation);
    };
  }, [token, selectedId]);

  // ---------- socket: تسجيل المستمعين مرة وحدة ----------
  useEffect(() => {
    if (!token) return;
    const s = getSocket();

    // ✅ new_message يضل المسار الأساسي لاستقبال رسايل الطرف التاني بالمحادثة المفتوحة
    function handleNewMessage(payload) {
      const msg = unwrap(payload, "message");
      if (!msg) return;
      if (sameId(msg.conversationId, selectedIdRef.current)) {
        setMessages((prev) => addMessageUnique(prev, msg));
        s.emit("mark_read", { conversationId: msg.conversationId });
      }
    }

    // ---------- تأكيد إرسال الرسالة عند المرسل نفسه ----------
    // السيرفر بيبعت message_sent فقط لصاحب الرسالة كتأكيد، منستخدمها
    // كطبقة أمان إضافية (dedup بيمنع التكرار لو new_message وصلت كمان)
    function handleMessageSent(payload) {
      const msg = unwrap(payload, "message");
      if (!msg) return;
      if (sameId(msg.conversationId, selectedIdRef.current)) {
        setMessages((prev) => addMessageUnique(prev, msg));
      }
    }

    // ✅ conversation:updated منستخدمها لتحديث قائمة المحادثات (آخر رسالة/وقت)
    // وكمان — لو التحديث خاص بالمحادثة المفتوحة حالياً وفيه آخر رسالة —
    // منضيفها كمان لقائمة الرسايل المعروضة، كطبقة حماية إضافية بحال
    // new_message تأخرت أو ما وصلت لأي سبب (شبكة، إعادة اتصال...الخ)
    function handleConversationUpdated(payload) {
      const conv = unwrap(payload, "conversation");

      if (conv?.id) {
        setConversations((prev) => {
          const exists = prev.some((c) => sameId(c.id, conv.id));
          if (!exists) return [conv, ...prev];
          return prev.map((c) => (sameId(c.id, conv.id) ? { ...c, ...conv } : c));
        });

        if (conv.lastMessage && sameId(conv.id, selectedIdRef.current)) {
          setMessages((prev) => addMessageUnique(prev, conv.lastMessage));
        }
        return;
      }

      // حالة الـ payload يلي فيها conversationId + lastMessage مباشرة (مش object conversation كامل)
      const { conversationId, lastMessage, lastMessageAt } = payload || {};
      if (!conversationId) return;

      setConversations((prev) =>
        prev.map((c) =>
          sameId(c.id, conversationId)
            ? { ...c, lastMessage, lastMessageAt: lastMessageAt ?? c.lastMessageAt }
            : c
        )
      );

      if (lastMessage && sameId(conversationId, selectedIdRef.current)) {
        setMessages((prev) => addMessageUnique(prev, lastMessage));
      }
    }

    function handleTyping({ conversationId, isTyping }) {
      if (sameId(conversationId, selectedIdRef.current)) {
        setOtherTyping(!!isTyping);
      }
    }

    // ---------- حذف رسالة (تأكيد من السيرفر) ----------
    function handleMessageDeleted(payload) {
      const { messageId, conversationId } = payload || {};
      if (sameId(conversationId, selectedIdRef.current)) {
        setMessages((prev) => prev.filter((m) => !sameId(m.id, messageId)));
      }
    }

    // ---------- تعديل رسالة (تأكيد من السيرفر) ----------
    function handleMessageEdited(payload) {
      const msg = unwrap(payload, "message");
      if (!msg) return;
      if (sameId(msg.conversationId, selectedIdRef.current)) {
        setMessages((prev) =>
          prev.map((m) => (sameId(m.id, msg.id) ? { ...m, ...msg } : m))
        );
      }
    }

    function handleSocketError({ message }) {
      setError(message);
    }

    s.on("new_message", handleNewMessage);
    s.on("message_sent", handleMessageSent);
    s.on("conversation:updated", handleConversationUpdated);
    s.on("typing", handleTyping);
    s.on("message_deleted", handleMessageDeleted);
    s.on("message_updated", handleMessageEdited);
    s.on("message_updated_ack", handleMessageEdited);
    s.on("error", handleSocketError);

    return () => {
      s.off("new_message", handleNewMessage);
      s.off("message_sent", handleMessageSent);
      s.off("conversation:updated", handleConversationUpdated);
      s.off("typing", handleTyping);
      s.off("message_deleted", handleMessageDeleted);
      s.off("message_updated", handleMessageEdited);
      s.off("message_updated_ack", handleMessageEdited);
      s.off("error", handleSocketError);
    };
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConv = conversations.find((c) => sameId(c.id, selectedId));

  const filtered = conversations.filter((c) => {
    const name = fullName(c.otherParty);
    const last = c.lastMessage?.content ?? "";
    return name.includes(searchText) || last.includes(searchText);
  });

  // ---------- إرسال رسالة عبر السوكيت مباشرة (بدل REST) ----------
  // بما إنه الباك اند بيدعم حدث send_message ويرجع message_sent كتأكيد،
  // منستخدم السوكيت هون بدل axios عشان نضمن نفس مسار الإرسال والاستقبال
  // (REST + Socket sockets منفصلين ممكن يسببوا فروقات بالتزامن)
  async function handleSend() {
    if (!messageText.trim() || !selectedId) return;
    const text = messageText;
    setMessageText("");
    setSending(true);
    try {
      const s = getSocket();
      s.emit("send_message", { conversationId: selectedId, content: text });
      // ملاحظة: التأكيد وإضافة الرسالة لواجهة المستخدم بيصير عبر
      // handleMessageSent (حدث message_sent) فوق، مش هون مباشرة،
      // عشان نضمن نفس شكل الـ payload (id, createdAt...) يلي بيرجعه السيرفر فعلياً
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const typingTimeoutRef = useRef(null);
  function handleTypingInput(value) {
    setMessageText(value);
    if (!selectedId) return;
    const s = getSocket();
    s.emit("typing", { conversationId: selectedId, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      s.emit("typing", { conversationId: selectedId, isTyping: false });
    }, 1500);
  }

  // ---------- حذف رسالة ----------
  // تفاؤلي (optimistic): بنشيلها من الواجهة فوراً، ولو السيرفر رفض
  // رح توصل رسالة عبر handleSocketError وبتظهر بالـ error banner
  function handleDeleteMessage(msg) {
    const s = getSocket();
    s.emit("delete_message", { conversationId: selectedId, messageId: msg.id });
    setMessages((prev) => prev.filter((m) => !sameId(m.id, msg.id)));
    setOpenMenuId(null);
  }

  // ---------- بدء تعديل رسالة ----------
  function startEdit(msg) {
    setEditingId(msg.id);
    setEditText(msg.content ?? "");
    setOpenMenuId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  // ---------- حفظ التعديل ----------
  function saveEdit(msg) {
    if (!editText.trim()) return;
    const s = getSocket();
    s.emit("update_message", { // بدل "edit_message"
      conversationId: selectedId,
      messageId: msg.id,
      content: editText,
    });
    setMessages((prev) =>
      prev.map((m) =>
        sameId(m.id, msg.id) ? { ...m, content: editText, edited: true } : m
      )
    );
    setEditingId(null);
    setEditText("");
  }

  return (
    <div className="messages-wrapper" dir="rtl">
      <SellerNavbar />

      <div className="messages-title-area">
        <h1>المراسلات</h1>
        <p>تواصل مع المشترين مباشرة</p>
      </div>

      {error && (
        <div className="messages-error">
          <span>{error}</span>
          <button className="messages-error-close" onClick={() => setError(null)}>إغلاق</button>
        </div>
      )}

      <div className="messages-main">
        <div className="messages-container">

          {/* قائمة المحادثات */}
          <div className="messages-conv-list">
            <div className="messages-search-wrap">
              <div className="messages-search-inner">
                <Search size={14} color="#9ca3af" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="ابحث..."
                  className="messages-search-input"
                />
              </div>
            </div>

            <div className="messages-conv-scroll">
              {loadingConvs ? (
                <div className="messages-loading">
                  <Loader2 size={24} color="#f97316" className="spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="messages-empty">لا توجد محادثات</p>
              ) : (
                filtered.map((conv) => {
                  const name = fullName(conv.otherParty);
                  const last = conv.lastMessage?.content ?? "";
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedId(conv.id)}
                      className={`messages-conv-item ${sameId(selectedId, conv.id) ? "selected" : ""}`}
                    >
                      <div
                        className="messages-avatar"
                        style={{ backgroundColor: avatarColor(name) }}
                      >
                        {conv.otherParty?.avatar ? (
                          <img
                            src={conv.otherParty.avatar}
                            alt={name}
                            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                          />
                        ) : (
                          name[0]
                        )}
                      </div>
                      <div className="messages-conv-info">
                        <div className="messages-conv-row">
                          <span className="messages-conv-time">{formatTime(conv.lastMessageAt)}</span>
                          <span className="messages-conv-name">{name}</span>
                        </div>
                        <p className="messages-conv-last">{last}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="messages-unread-badge">{conv.unreadCount}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* نافذة المحادثة */}
          <div className="messages-chat">
            {selectedConv ? (
              <div className="messages-chat-header">
                <button className="messages-info-btn">
                  <Info size={18} color="#9ca3af" />
                </button>
                <div className="messages-chat-user">
                  <div className="messages-chat-user-info">
                    <p className="messages-chat-user-name">{fullName(selectedConv.otherParty)}</p>
                    <p className="messages-chat-user-role">
                      {otherTyping ? "يكتب الآن..." : "مشتري"}
                    </p>
                  </div>
                  <div
                    className="messages-chat-avatar"
                    style={{ backgroundColor: avatarColor(fullName(selectedConv.otherParty)) }}
                  >
                    {selectedConv.otherParty?.avatar ? (
                      <img
                        src={selectedConv.otherParty.avatar}
                        alt=""
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      fullName(selectedConv.otherParty)[0]
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="messages-chat-header-empty" />
            )}

            {/* الرسائل */}
            <div className="messages-area">
              {loadingMsgs ? (
                <div className="messages-loading">
                  <Loader2 size={28} color="#f97316" className="spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="messages-empty">لا توجد رسائل بعد</p>
              ) : (
                messages.map((msg) => {
                  const isMe = sameId(msg.senderId, myId);
                  const text = msg.content ?? "";
                  const time = formatTime(msg.createdAt); // إذا مش موجودة، بترجع فراغ بأمان
                  const isEditing = sameId(editingId, msg.id);

                  if (!isMe) {
                    return (
                      <div key={msg.id} className="messages-bubble-wrap-other">
                        <div className="messages-bubble-other">
                          <p className="messages-bubble-text">{text}</p>
                          {time && <p className="messages-bubble-time-other">{time}</p>}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="messages-bubble-wrap-me">
                      {/* ✅ تم نقل فقاعة الرسالة لتكون أولاً، وصندوق الثلاث نقاط بعدها
                          — عشان تنتقل النقاط لتصير عالجهة التانية (يمين/شمال)
                          بالنسبة لفقاعة الرسالة، بدل ما تكون قبلها. */}
                      <div className="messages-bubble-me">
                        {isEditing ? (
                          <div className="messages-edit-box">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(msg);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              autoFocus
                              className="messages-edit-input"
                            />
                            <div className="messages-edit-actions">
                              <button type="button" onClick={() => saveEdit(msg)} title="حفظ">
                                <Check size={13} />
                              </button>
                              <button type="button" onClick={cancelEdit} title="إلغاء">
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="messages-bubble-text">{text}</p>
                            {time && (
                              <p className="messages-bubble-time-me">
                                {time}
                                {msg.edited ? " · معدّلة" : ""}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* ثلاث نقاط: تعديل / حذف — بتظهر بس على رسائلي أنا */}
                      <div className="messages-bubble-actions-wrap" ref={sameId(openMenuId, msg.id) ? menuRef : null}>
                        <button
                          type="button"
                          className="messages-bubble-menu-btn"
                          onClick={() =>
                            setOpenMenuId((prev) => (sameId(prev, msg.id) ? null : msg.id))
                          }
                        >
                          <MoreVertical size={14} color="#9ca3af" />
                        </button>
                        {sameId(openMenuId, msg.id) && (
                          <div className="messages-bubble-menu">
                            <button type="button" onClick={() => startEdit(msg)}>
                              <Pencil size={13} />
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDeleteMessage(msg)}
                            >
                              <Trash2 size={13} />
                              <span>حذف</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* الإدخال */}
            <div className="messages-input-area">
              <button
                onClick={handleSend}
                disabled={sending || !messageText.trim() || !selectedId}
                className="messages-send-btn"
                style={{ background: sending || !messageText.trim() || !selectedId ? "#fed7aa" : "#f97316" }}
              >
                {sending
                  ? <Loader2 size={15} color="#fff" className="spin" />
                  : <Send size={15} color="#fff" style={{ transform: "scaleX(-1)" }} />
                }
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => handleTypingInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="اكتب رسالتك..."
                className="messages-text-input"
                disabled={!selectedId}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}