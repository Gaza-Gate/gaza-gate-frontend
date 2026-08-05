import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Send,
  Search,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Check,
  CheckCheck,
  ArrowRight,
  MessageCircle,
  Smile,
  Paperclip,
  Info,
  XCircle,
  User as UserIcon,
  Package,
  Calendar,
  ShoppingBag,
} from "lucide-react";

import {
  getAuthToken,
  getCurrentUser,
} from "../services/authService";
import {
  getConversations,
  getMessages,
} from "../services/conversationService";

import { getSocket, connectSocket } from "../utils/socket";
import api from "../utils/api";
import {
  formatTime,
  getDayLabel,
  fullName,
  avatarColor,
  sameId,
  addMessageUnique,
  formatConvTime,
} from "../utils/chatHelpers";
import { customerProfilePath } from "../utils/sellerHelpers";

import "./Messages.css";
import SellerNavbar from "../components/SellerNavbar";
import { Skeleton } from "../components/LoadingState";

// ── Quick reply templates (قوالب ردود سريعة للبائع) ──
const SELLER_QUICK_REPLIES = [
  "أهلاً بك! كيف بقدر أساعدك؟ 😊",
  "نعم المنتج متوفر ✓",
  "التوصيل خلال 2-3 أيام",
  "شكراً لتواصلك معنا 🙏",
];

export default function Messages() {
  const navigate = useNavigate();
  const token = getAuthToken();
  const currentUser = getCurrentUser();
  const myId = currentUser?.id;

  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get("conversationId");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("all"); // all | unread
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);

  // edit / delete
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // UI: customer info panel, mobile
  const [showInfo, setShowInfo] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);

  const bottomRef = useRef(null);
  const selectedIdRef = useRef(null);
  const menuRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // إغلاق قائمة الثلاث نقاط لما تضغط برّا
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

  // ── تحميل المحادثات ──
  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoadingConvs(true);
        const data = await getConversations();
        const list = data?.data?.conversations ?? [];
        setConversations(list);

        //   لو جاي من إشعار فيه conversationId محدد بالرابط، افتحيها أول شي
        const targetExists = conversationIdFromUrl && list.some((c) => sameId(c.id, conversationIdFromUrl));
        if (targetExists) {
          setSelectedId(conversationIdFromUrl);
        } else if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingConvs(false);
      }
    }
    fetchConversations();
  }, [conversationIdFromUrl]);

  // ── تحميل رسائل المحادثة المختارة ──
  useEffect(() => {
    if (!selectedId) return;
    async function fetchMessages() {
      try {
        setLoadingMsgs(true);
        const data = await getMessages(selectedId);
        const list = data?.data?.messages ?? [];
        setMessages(list);
        // marking as read
        try {
          // ✅ PATCH حسب spec الباك
          await api.patch(`/api/conversations/${selectedId}/read`);
        } catch {
          /* ignore */
        }
        setConversations((prev) =>
          prev.map((c) =>
            sameId(c.id, selectedId) ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingMsgs(false);
      }
    }
    fetchMessages();
  }, [selectedId]);

  // ── socket: join conversation + re-join on reconnect ──
  useEffect(() => {
    if (!token) return;
    const s = connectSocket();

    function joinCurrent() {
      const id = selectedIdRef.current;
      if (id) {
        s.emit("join_conversation", { conversationId: id });
        s.emit("mark_read", { conversationId: id });
      }
    }

    if (selectedId) joinCurrent();
    s.on("connect", joinCurrent);
    return () => s.off("connect", joinCurrent);
  }, [token, selectedId]);

  // 🆕 دمج رسالة جاية من الـ socket (new_message / message_sent) مع القائمة
  // الحالية بدل ما نضيفها دايماً كعنصر جديد. المشكلة الأصلية: لما ترسلي
  // رسالة، منضيف نسخة "optimistic" فوراً (id مؤقت tmp-...)، وبنفس الوقت
  // بيوصل REST response وكمان event عبر الـ socket لنفس الرسالة (خصوصاً
  // إشعار الإرسال يوصل أحياناً قبل رد الـ REST نفسه). فإذا الـ socket وصل
  // أول، كان عم يضيف نسخة جديدة، وبعدين لما يرجع رد الـ REST كان عم يستبدل
  // الـ optimistic بنسخة ثانية — فيصير عندك نفس الرسالة مرتين.
  // الحل: قبل ما نضيف رسالة جاية من السيرفر، ندوّر أول عن رسالة optimistic
  // بنفس المرسل ونفس المحتوى وما زالت موجودة، ونستبدلها بدل ما نضيف نسخة
  // جديدة جنبها. أي مصدر (REST أو socket) يوصل أول بياخد مكان الـ optimistic،
  // والتاني ما بيضيف تكرار (addMessageUnique أصلاً بتدي ديدوب حسب id الحقيقي).
  const reconcileIncomingMessage = useCallback((msg) => {
    if (!msg || !sameId(msg.conversationId, selectedIdRef.current)) return;
    setMessages((prev) => {
      const optimisticIdx = prev.findIndex(
        (m) =>
          m._optimistic &&
          sameId(m.senderId, msg.senderId) &&
          m.content === msg.content
      );
      if (optimisticIdx !== -1) {
        const next = [...prev];
        next[optimisticIdx] = msg;
        return next;
      }
      return addMessageUnique(prev, msg);
    });
  }, []);

  // ── socket: listeners ──
  useEffect(() => {
    if (!token) return;
    const s = getSocket();

    function unwrap(payload) {
      return payload?.message ?? payload;
    }

    function handleNewMessage(payload) {
      const msg = unwrap(payload);
      if (!msg) return;
      if (sameId(msg.conversationId, selectedIdRef.current)) {
        reconcileIncomingMessage(msg);
        s.emit("mark_read", { conversationId: msg.conversationId });
      }
    }

    function handleMessageSent(payload) {
      const msg = unwrap(payload);
      if (!msg) return;
      reconcileIncomingMessage(msg);
    }

    function handleConversationUpdated(payload) {
      const conv = payload?.conversation;
      if (conv?.id) {
        setConversations((prev) => {
          const exists = prev.some((c) => sameId(c.id, conv.id));
          if (!exists) return [conv, ...prev];
          return prev.map((c) =>
            sameId(c.id, conv.id) ? { ...c, ...conv } : c
          );
        });
        if (conv.lastMessage && sameId(conv.id, selectedIdRef.current)) {
          reconcileIncomingMessage(conv.lastMessage);
        }
        return;
      }
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
        reconcileIncomingMessage(lastMessage);
      }
    }

    function handleTyping({ conversationId, isTyping }) {
      if (sameId(conversationId, selectedIdRef.current)) {
        setOtherTyping(Boolean(isTyping));
      }
    }

    function handleMessageDeleted({ messageId, conversationId }) {
      if (sameId(conversationId, selectedIdRef.current)) {
        setMessages((prev) => prev.filter((m) => !sameId(m.id, messageId)));
      }
    }

    function handleMessageEdited(payload) {
      const msg = unwrap(payload);
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
  }, [token, reconcileIncomingMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const selectedConv = conversations.find((c) => sameId(c.id, selectedId));

  // فلترة المحادثات
  const filtered = conversations
    .filter((c) => {
      const name = fullName(c.otherParty, "مشتري");
      const last = c.lastMessage?.content ?? "";
      if (filter === "unread" && (!c.unreadCount || c.unreadCount === 0)) return false;
      if (!searchText) return true;
      return name.includes(searchText) || last.includes(searchText);
    })
    .sort((a, b) => {
      const aTime = new Date(a.lastMessageAt || a.updated_at || 0).getTime();
      const bTime = new Date(b.lastMessageAt || b.updated_at || 0).getTime();
      return bTime - aTime;
    });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // ── إرسال رسالة عبر REST (مع optimistic) ──
  const handleSend = useCallback(
    async (override) => {
      const text = (override ?? messageText).trim();
      if (!text || !selectedId || sending) return;
      setMessageText("");
      setSending(true);

      // optimistic
      const tempId = `tmp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        conversationId: selectedId,
        senderId: myId,
        content: text,
        messageType: "text",
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        // REST — أضمن من socket
        const sent = await api.post(`/api/conversations/${selectedId}/messages`, {
          content: text,
        });
        const officialMsg = sent?.data?.data?.message;
        if (officialMsg) {
          // ✅ منع تكرار الرسالة: شيل الـ optimistic (tempId) أولاً،
          //    ثم ضيف الرسمي عبر addMessageUnique — لو الـ socket
          //    سبَق وحطّ الرسمي، ما رح ينضاف مرة ثانية
          setMessages((prev) => {
            const withoutOptimistic = prev.filter((m) => m.id !== tempId);
            return addMessageUnique(withoutOptimistic, officialMsg);
          });
        } else {
          // لو الباك ما رجّع message، على الأقل شيل الـ optimistic
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessageText(text);
        setError(err.message);
      } finally {
        setSending(false);
      }
    },
    [messageText, selectedId, sending, myId]
  );

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

  function handleDeleteMessage(msg) {
    setMessages((prev) => prev.filter((m) => !sameId(m.id, msg.id)));
    setOpenMenuId(null);
    api
      .delete(`/api/conversations/${selectedId}/messages/${msg.id}`)
      .catch((err) => {
        setError(err.message);
        setMessages((prev) => [...prev, msg]);
      });
  }

  function startEdit(msg) {
    setEditingId(msg.id);
    setEditText(msg.content ?? "");
    setOpenMenuId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function saveEdit(msg) {
    if (!editText.trim()) return;
    // ✅ PATCH حسب spec الباك
    api
      .patch(`/api/conversations/${selectedId}/messages/${msg.id}`, {
        content: editText,
      })
      .then(() => {
        setMessages((prev) =>
          prev.map((m) =>
            sameId(m.id, msg.id) ? { ...m, content: editText, edited: true } : m
          )
        );
        setEditingId(null);
        setEditText("");
      })
      .catch((err) => setError(err.message));
  }

  function handleSelectConv(id) {
    setSelectedId(id);
    setShowChatMobile(true);
    setShowInfo(false);
  }

  // ── بناء قائمة الرسائل مع day-dividers ──
  function renderMessages() {
    const rows = [];
    let lastDay = null;
    messages.forEach((msg) => {
      const day = getDayLabel(msg.createdAt || msg.created_at);
      if (day && day !== lastDay) {
        rows.push(
          <div key={`day-${msg.id}`} className="messages-day-divider">
            <span>{day}</span>
          </div>
        );
        lastDay = day;
      }
      rows.push(renderMessage(msg));
    });
    return rows;
  }

  function renderMessage(msg) {
    const isMe = sameId(msg.senderId, myId);
    const text = msg.content ?? "";
    const time = formatTime(msg.createdAt || msg.created_at);
    const isEditing = sameId(editingId, msg.id);
    const isOptimistic = msg._optimistic;
    const isRead = msg.isRead ?? false;

    if (!isMe) {
      const senderName = fullName(msg.sender || selectedConv?.otherParty, "مشتري");
      return (
        <div key={msg.id} className="messages-bubble-wrap-other">
          {selectedConv?.otherParty?.avatar ? (
            <div className="messages-bubble-other-avatar">
              <img src={selectedConv.otherParty.avatar} alt={senderName} />
            </div>
          ) : (
            <div
              className="messages-bubble-other-avatar"
              style={{ backgroundColor: avatarColor(senderName) }}
            >
              {(senderName || "م")[0]}
            </div>
          )}
          <div className="messages-bubble-other">
            <p className="messages-bubble-text">{text}</p>
            {time && <p className="messages-bubble-time-other">{time}</p>}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className="messages-bubble-wrap-me">
        <div
          className="messages-bubble-me"
          style={isOptimistic ? { opacity: 0.65 } : undefined}
        >
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
                  <Check size={14} />
                </button>
                <button type="button" onClick={cancelEdit} title="إلغاء">
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="messages-bubble-text">{text}</p>
              {(time || isRead !== undefined) && (
                <div className="messages-bubble-meta">
                  {msg.edited && (
                    <span className="messages-bubble-edited">معدّلة</span>
                  )}
                  {time && <span className="messages-bubble-time-me">{time}</span>}
                  {!isOptimistic && (
                    <span
                      className={`messages-read-receipt ${isRead ? "read" : "unread"}`}
                      title={isRead ? "تمت القراءة" : "تم الإرسال"}
                    >
                      {isRead ? <CheckCheck size={13} /> : <Check size={13} />}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="messages-bubble-actions-wrap"
          ref={sameId(openMenuId, msg.id) ? menuRef : null}
        >
          <button
            type="button"
            className="messages-bubble-menu-btn"
            onClick={() =>
              setOpenMenuId((prev) => (sameId(prev, msg.id) ? null : msg.id))
            }
            aria-label="خيارات الرسالة"
          >
            <MoreVertical size={14} />
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
  }

  // ── Customer info panel data (من الـ API: otherParty + activeProduct) ──
  const otherParty = selectedConv?.otherParty;
  const activeProduct = selectedConv?.activeProduct;

  return (
    <div className="messages-wrapper" dir="rtl">
      <SellerNavbar />

      <div className="messages-title-area">
        <h1>
          <span className="messages-title-icon">
            <MessageCircle size={18} />
          </span>
          المراسلات
        </h1>
        <p>تواصل مع المشترين وأدر محادثات متجرك بكفاءة</p>
      </div>

      {error && (
        <div className="messages-error">
          <span>{error}</span>
          <button className="messages-error-close" onClick={() => setError(null)}>
            إغلاق
          </button>
        </div>
      )}

      <div className="messages-main">
        <div className="messages-container">
          {/* ── قائمة المحادثات ── */}
          <div
            className={`messages-conv-list ${
              showChatMobile ? "hidden-mobile" : ""
            }`}
          >
            <div className="messages-conv-header">
              <h2 className="messages-conv-header-title">
                <span>عملاء المتجر</span>
                {totalUnread > 0 && (
                  <span className="messages-conv-counter">{totalUnread} جديدة</span>
                )}
              </h2>
              <div className="messages-search-wrap">
                <div className="messages-search-inner">
                  <Search size={15} color="#9ca3af" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="ابحث عن عميل أو رسالة..."
                    className="messages-search-input"
                  />
                </div>
              </div>
              <div className="messages-conv-filters">
                <button
                  className={`messages-conv-filter ${
                    filter === "all" ? "active" : ""
                  }`}
                  onClick={() => setFilter("all")}
                >
                  الكل ({conversations.length})
                </button>
                <button
                  className={`messages-conv-filter ${
                    filter === "unread" ? "active" : ""
                  }`}
                  onClick={() => setFilter("unread")}
                >
                  غير مقروءة ({totalUnread})
                </button>
              </div>
            </div>

            <div className="messages-conv-scroll">
              {loadingConvs ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div className="messages-skeleton" key={i}>
                      <div className="messages-skeleton-avatar" />
                      <div className="messages-skeleton-lines">
                        <div className="messages-skeleton-line" />
                        <div className="messages-skeleton-line" />
                      </div>
                    </div>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <div className="messages-empty">
                  <div className="messages-empty-art">
                    <UserIcon size={42} />
                  </div>
                  {filter === "unread" ? (
                    <>
                      <strong style={{ color: "#374151" }}>كل المحادثات مقروءة 🎉</strong>
                      <br />
                      ما في رسائل جديدة من العملاء
                    </>
                  ) : searchText ? (
                    <>
                      لا توجد نتائج لـ "{searchText}"
                      <br />
                      جرب كلمة بحث مختلفة
                    </>
                  ) : (
                    <>
                      <strong style={{ color: "#374151" }}>لا يوجد عملاء بعد</strong>
                      <br />
                      عندما يبدأ عميل محادثة معك ستظهر هنا
                    </>
                  )}
                </div>
              ) : (
                filtered.map((conv) => {
                  const name = fullName(conv.otherParty, "مشتري");
                  const last = conv.lastMessage?.content ?? "ابدأ المحادثة...";
                  const lastTime = conv.lastMessageAt || conv.updated_at;
                  const unread = conv.unreadCount || 0;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      className={`messages-conv-item ${
                        sameId(selectedId, conv.id) ? "selected" : ""
                      } ${unread > 0 ? "unread" : ""}`}
                    >
                      {conv.otherParty?.avatar ? (
                        <img
                          src={conv.otherParty.avatar}
                          alt={name}
                          className="messages-avatar-img"
                        />
                      ) : (
                        <div
                          className="messages-avatar"
                          style={{ backgroundColor: avatarColor(name) }}
                        >
                          {name[0]}
                          <span className="messages-avatar-online" />
                        </div>
                      )}
                      <div className="messages-conv-info">
                        <div className="messages-conv-row">
                          <span
                            className={`messages-conv-time ${
                              unread > 0 ? "unread-time" : ""
                            }`}
                          >
                            {formatConvTime(lastTime)}
                          </span>
                          <span className="messages-conv-name">{name}</span>
                        </div>
                        <p className="messages-conv-last">
                          <MessageCircle
                            size={11}
                            className="messages-conv-last-icon"
                          />
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {last}
                          </span>
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="messages-unread-badge">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── نافذة المحادثة ── */}
          <div
            className={`messages-chat ${!showChatMobile ? "hidden-mobile" : ""}`}
          >
            {selectedConv ? (
              <>
                <div className="messages-chat-header">
                  <button
                    className="messages-chat-back"
                    onClick={() => setShowChatMobile(false)}
                    aria-label="عودة"
                  >
                    <ArrowRight size={18} />
                  </button>
                  <div className="messages-chat-header-actions">
                    <button
                      className={`messages-icon-btn ${showInfo ? "active" : ""}`}
                      onClick={() => setShowInfo((s) => !s)}
                      aria-label="معلومات العميل"
                      title="معلومات العميل"
                    >
                      <Info size={18} />
                    </button>
                  </div>
                  <div
                    className="messages-chat-user"
                    onClick={() => {
                      // ✅ استخراج الـ customer ID الصحيح من أي shape للـ API
                      //   (actionUrl > customerId > id) — راجع sellerHelpers.js
                      const path = customerProfilePath(selectedConv.otherParty);
                      if (path) navigate(path);
                    }}
                    style={{ cursor: selectedConv.otherParty?.id ? "pointer" : "default" }}
                    title="عرض بروفايل الزبون"
                  >
                    <div className="messages-chat-user-info">
                      <p className="messages-chat-user-name">
                        {fullName(otherParty, "مشتري")}
                      </p>
                      <p className="messages-chat-user-role">
                        {otherTyping ? (
                          <span style={{ color: "var(--gg-primary)" }}>يكتب الآن...</span>
                        ) : (
                          <>
                            <span className="messages-online-dot" />
                            متصل · مشتري
                          </>
                        )}
                      </p>
                    </div>
                    {otherParty?.avatar ? (
                      <img
                        src={otherParty.avatar}
                        alt=""
                        className="messages-chat-avatar-img"
                      />
                    ) : (
                      <div
                        className="messages-chat-avatar"
                        style={{
                          backgroundColor: avatarColor(
                            fullName(otherParty, "مشتري")
                          ),
                        }}
                      >
                        {fullName(otherParty, "م")[0]}
                        <span className="messages-avatar-online" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Product context (من activeProduct) */}
                {activeProduct && (
                  <div className="messages-product-context">
                    {activeProduct.image ? (
                      <img
                        src={activeProduct.image}
                        alt=""
                        className="messages-product-context-img"
                      />
                    ) : (
                      <div
                        className="messages-product-context-img"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--gg-primary-light)",
                          color: "var(--gg-primary)",
                        }}
                      >
                        <Package size={20} />
                      </div>
                    )}
                    <div className="messages-product-context-info">
                      <p className="messages-product-context-name">
                        {activeProduct.name || "منتج"}
                      </p>
                      <p className="messages-product-context-price">
                        {activeProduct.price
                          ? `${activeProduct.price} ₪`
                          : "—"}
                      </p>
                    </div>
                    <ShoppingBag
                      size={18}
                      className="messages-product-context-arrow"
                    />
                  </div>
                )}

                <div className="messages-area">
                  {loadingMsgs ? (
                    <div className="messages-area-loading">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div className="messages-bubble-skel" key={i} style={{ alignSelf: i % 2 ? "flex-start" : "flex-end" }}>
                          <Skeleton width={`${50 + (i % 3) * 15}%`} height={14} />
                          <Skeleton width="30%" height={10} style={{ marginTop: 6 }} />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="messages-empty-chat">
                      <div className="messages-empty-chat-art">
                        <MessageCircle size={48} />
                      </div>
                      <h3 className="messages-empty-chat-title">
                        ابدأ المحادثة مع {fullName(otherParty, "العميل")}
                      </h3>
                      <p className="messages-empty-chat-text">
                        أرسل رسالة ترحيبية للعميل، أجب على أسئلته بسرعة وقدّم
                        خدمة مميزة لبناء علاقة ثقة تدوم.
                      </p>
                    </div>
                  ) : (
                    renderMessages()
                  )}
                  {otherTyping && (
                    <div className="messages-typing">
                      <div className="messages-typing-bubble">
                        <span className="messages-typing-dot" />
                        <span className="messages-typing-dot" />
                        <span className="messages-typing-dot" />
                        <span className="messages-typing-text">
                          {fullName(otherParty, "العميل")} يكتب...
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Customer info panel (collapsible) */}
                {showInfo && otherParty && (
                  <div className="messages-customer-panel">
                    <div className="messages-customer-panel-row">
                      <span className="messages-customer-panel-label">
                        <UserIcon
                          size={13}
                          style={{ verticalAlign: "middle", marginLeft: 4 }}
                        />
                        الاسم
                      </span>
                      <span className="messages-customer-panel-value">
                        {fullName(otherParty, "—")}
                      </span>
                    </div>
                    {otherParty.email && (
                      <div className="messages-customer-panel-row">
                        <span className="messages-customer-panel-label">البريد</span>
                        <span
                          className="messages-customer-panel-value"
                          style={{ direction: "ltr", textAlign: "right" }}
                        >
                          {otherParty.email}
                        </span>
                      </div>
                    )}
                    {otherParty.phone && (
                      <div className="messages-customer-panel-row">
                        <span className="messages-customer-panel-label">الهاتف</span>
                        <span className="messages-customer-panel-value">
                          {otherParty.phone}
                        </span>
                      </div>
                    )}
                    <div className="messages-customer-panel-row">
                      <span className="messages-customer-panel-label">
                        <Calendar
                          size={13}
                          style={{ verticalAlign: "middle", marginLeft: 4 }}
                        />
                        بدأت المحادثة
                      </span>
                      <span className="messages-customer-panel-value">
                        {selectedConv.created_at
                          ? new Date(selectedConv.created_at).toLocaleDateString(
                              "ar-EG",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "—"}
                      </span>
                    </div>
                    {selectedConv.lastMessageAt && (
                      <div className="messages-customer-panel-row">
                        <span className="messages-customer-panel-label">
                          آخر رسالة
                        </span>
                        <span className="messages-customer-panel-value">
                          {new Date(selectedConv.lastMessageAt).toLocaleString(
                            "ar-EG",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="messages-input-area">
                  {messages.length > 0 && (
                    <div className="messages-quick-replies">
                      {SELLER_QUICK_REPLIES.map((q) => (
                        <button
                          key={q}
                          type="button"
                          className="messages-quick-reply"
                          onClick={() => handleSend(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="messages-input-row">
                    <button
                      className="messages-send-btn"
                      onClick={() => handleSend()}
                      disabled={sending || !messageText.trim()}
                      aria-label="إرسال"
                    >
                      {sending ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Send size={16} style={{ transform: "scaleX(-1)" }} />
                      )}
                    </button>
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => handleTypingInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="اكتب ردك للعميل..."
                      className="messages-text-input"
                      rows={1}
                    />
                    <button
                      className="messages-emoji-btn"
                      type="button"
                      aria-label="إيموجي"
                      onClick={() => setMessageText((t) => `${t} 😊`)}
                    >
                      <Smile size={18} />
                    </button>
                    <button
                      className="messages-attach-btn"
                      type="button"
                      aria-label="إرفاق"
                      onClick={() =>
                        setError("ميزة إرفاق الصور ستتوفر قريباً 📎")
                      }
                    >
                      <Paperclip size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="messages-empty-chat">
                <div className="messages-empty-chat-art">
                  <MessageCircle size={48} />
                </div>
                <h3 className="messages-empty-chat-title">اختر عميل للرد</h3>
                <p className="messages-empty-chat-text">
                  اختر محادثة من القائمة على اليمين للرد على استفسارات عملائك
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}