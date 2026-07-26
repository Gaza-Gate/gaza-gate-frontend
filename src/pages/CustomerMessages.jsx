import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
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
  ShoppingBag,
  Copy,
  AlertCircle,
} from "lucide-react";

import {
  getAuthToken,
  getCurrentUser,
  getCustomerConversations,
  getCustomerMessages,
  sendCustomerMessage,
  createConversation,
  markConversationAsRead,
} from "../services/authService";

import { getSocket, connectSocket } from "../utils/socket";
import api from "../utils/api";
import { formatApiError } from "../utils/errorHelper";
import {
  formatTime,
  getDayLabel,
  fullName,
  displayName,
  avatarColor,
  sameId,
  addMessageUnique,
  formatConvTime,
} from "../utils/chatHelpers";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { Skeleton } from "../components/LoadingState";

import "./Messages.css";

// ── Quick replies for customer side (أسئلة شائعة يبعتها الزبون للتاجر) ──
const CUSTOMER_QUICK_REPLIES = [
  "مرحبا، هل المنتج متوفر؟",
  "ممكن تفاصيل أكثر؟",
  "في توصيل لمنطقتي؟",
  "ممكن تخفيض؟ 🙏",
];

export default function CustomerMessages() {
  const token = getAuthToken();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // ✅ مصدر الـ sellerId ممكن يكون بأي شكل:
  //   1) location.state.sellerId   (من navigate("/messages", { state: {...} }))
  //   2) location.state.storeId   (alias قد يكون مستخدم)
  //   3) searchParams.sellerId    (من URL ?sellerId=...)
  // الـ state له الأولوية لأنه أحدث (المستخدم ضغط الزر حالاً)
  const stateSellerId =
    location.state?.sellerId || location.state?.storeId || null;
  const stateProductId = location.state?.productId || null;

  const sellerIdFromParam = stateSellerId || searchParams.get("sellerId");
  // ✅ لو الزبون جاي من صفحة منتج، نربط المحادثة بالمنتج تلقائياً
  const productIdFromParam = stateProductId || searchParams.get("productId");

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
  const [errorInfo, setErrorInfo] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);

  // edit / delete state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // mobile: هل عم نعرض قائمة المحادثات أو الشات
  const [showChatMobile, setShowChatMobile] = useState(false);

  const bottomRef = useRef(null);
  const selectedIdRef = useRef(null);
  const menuRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // ── إغلاق قائمة الثلاث نقاط لما تضغط برّا ──
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

  // ── 1) تحميل المحادثات + إنشاء محادثة جديدة لو في sellerId بالـ URL ──
  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoadingConvs(true);
        setError(null);
        setErrorInfo(null);
        // ✅ ملاحظة: التوكين بيروح تلقائياً عبر axios interceptor (Authorization: Bearer ...)
        // لا تمرّر التوكين كـ page — الفنكشن بتتوقع رقم صفحة
        const data = await getCustomerConversations();
        const list = data?.data?.conversations ?? [];
        setConversations(list);

        if (sellerIdFromParam) {
          const existing = list.find((c) => c.otherParty?.id === sellerIdFromParam);
          if (existing) {
            setSelectedId(existing.id);
            setShowChatMobile(true);
          } else {
            try {
              // ✅ لو جاي من منتج نحدّد sourceType=product ونمرر sourceId = productId
              // لو جاي من المتجر → sourceType=seller و sourceId = sellerId
              const sourceType = productIdFromParam ? "product" : "seller";
              const sourceId = productIdFromParam || sellerIdFromParam;
              const result = await createConversation(
                sellerIdFromParam,
                sourceType,
                sourceId,
                { productId: productIdFromParam }
              );
              const newConvId = result?.data?.conversation?.id;
              if (newConvId) {
                setSelectedId(newConvId);
                setShowChatMobile(true);
                // refresh list
                const updated = await getCustomerConversations();
                setConversations(updated?.data?.conversations ?? []);
              }
            } catch (e) {
              console.error("فشل إنشاء محادثة:", e);
              const info = formatApiError(e, "تعذّر بدء محادثة مع هذا البائع");
              setErrorInfo(info);
              setError(info.message);
            }
          }
        } else if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      } catch (err) {
        const info = formatApiError(err, "تعذّر تحميل المحادثات");
        setErrorInfo(info);
        setError(info.message);
      } finally {
        setLoadingConvs(false);
      }
    }
    fetchConversations();
  }, [token, sellerIdFromParam, productIdFromParam]);

  // ── 2) تحميل رسائل المحادثة المختارة ──
  useEffect(() => {
    if (!selectedId) return;
    async function fetchMessages() {
      try {
        setLoadingMsgs(true);
        // ✅ مثل ما فوق: التوكين تلقائي من الـ interceptor
        const data = await getCustomerMessages(selectedId);
        const list = data?.data?.messages ?? [];
        setMessages(list);
        // marking as read
        try {
          await markConversationAsRead(selectedId);
        } catch {
          /* ignore */
        }
        // update local unread count
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
  }, [selectedId, token]);

  // ── 3) socket — اتصال و انضمام للغرفة + إعادة الانضمام بعد reconnect ──
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

  // ── 4) socket — مستمعين ثابتين ──
  useEffect(() => {
    if (!token) return;
    const s = getSocket();

    function handleNewMessage(payload) {
      const msg = payload?.message ?? payload;
      if (!msg) return;
      if (sameId(msg.conversationId, selectedIdRef.current)) {
        setMessages((prev) => addMessageUnique(prev, msg));
        s.emit("mark_read", { conversationId: msg.conversationId });
      }
    }

    function handleMessageSent(payload) {
      const msg = payload?.message ?? payload;
      if (!msg) return;
      if (sameId(msg.conversationId, selectedIdRef.current)) {
        setMessages((prev) => addMessageUnique(prev, msg));
      }
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
          setMessages((prev) => addMessageUnique(prev, conv.lastMessage));
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
        setMessages((prev) => addMessageUnique(prev, lastMessage));
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
      const msg = payload?.message ?? payload;
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

  // ── 5) scroll تلقائي لآخر رسالة ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // ── derived state ──
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;
  const selectedConv = conversations.find((c) => sameId(c.id, selectedId));

  // فلترة المحادثات (بحث + نوع)
  const filtered = conversations
    .filter((c) => {
      const otherParty = c.otherParty ?? {};
      const name = displayName(otherParty);
      if (filter === "unread" && (!c.unreadCount || c.unreadCount === 0)) return false;
      if (!searchText) return true;
      const last = c.lastMessage?.content ?? "";
      return name.includes(searchText) || last.includes(searchText);
    })
    .sort((a, b) => {
      const aTime = new Date(a.lastMessageAt || a.updated_at || 0).getTime();
      const bTime = new Date(b.lastMessageAt || b.updated_at || 0).getTime();
      return bTime - aTime;
    });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // ── إرسال رسالة (REST كـ fallback + socket للعـرض الحي) ──
  const handleSend = useCallback(
    async (override) => {
      const text = (override ?? messageText).trim();
      if (!text || !selectedId || sending) return;
      setMessageText("");
      setSending(true);

      // optimistic add
      const tempId = `tmp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        conversationId: selectedId,
        senderId: currentUserId,
        content: text,
        messageType: "text",
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        // REST — السيرفر بيرجّع الـ message الرسمي مع الـ id الحقيقي
        const sent = await sendCustomerMessage(selectedId, text);
        const officialMsg = sent?.data?.message;
        if (officialMsg) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...officialMsg } : m)).filter((m) => m.id !== tempId || !m._optimistic)
          );
        }
      } catch (err) {
        // إزالة الرسالة المؤقتة وإرجاع النص
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessageText(text);
        setError(err.message);
      } finally {
        setSending(false);
      }
    },
    [messageText, selectedId, sending, currentUserId]
  );

  // ── typing ──
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

  // ── حذف رسالة ──
  function handleDeleteMessage(msg) {
    setMessages((prev) => prev.filter((m) => !sameId(m.id, msg.id)));
    setOpenMenuId(null);
    // REST delete — السيرفر بيرجّع { conversationId, messageId }
    api
      .delete(`/api/conversations/${selectedId}/messages/${msg.id}`)
      .catch((err) => {
        setError(err.message);
        // restore لو فشل
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
    const isMe = sameId(msg.senderId, currentUserId);
    const text = msg.content ?? "";
    const time = formatTime(msg.createdAt || msg.created_at);
    const isEditing = sameId(editingId, msg.id);
    const isOptimistic = msg._optimistic;

    // هل التاجر قرأ الرسالة (customer side → التاجر هو "other")
    const isRead = msg.isRead ?? false;

    if (!isMe) {
      const sender = msg.sender || selectedConv?.otherParty || {};
      const senderName = displayName(sender);
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
              {(senderName || "ب")[0]}
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

  return (
    <div className="messages-wrapper" dir="rtl">
      <div className="messages-title-area">
        <h1>
          <span className="messages-title-icon">
            <MessageCircle size={18} />
          </span>
          المراسلات
        </h1>
        <p>تواصل مع البائعين مباشرة واطّلع على آخر المحادثات</p>
      </div>

      {error && (
        <div className="messages-error">
          <div className="messages-error-main">
            <AlertCircle size={16} style={{ verticalAlign: "middle", marginLeft: 6 }} />
            <span>{error}</span>
            <button
              className="messages-error-close"
              onClick={() => {
                setError(null);
                setErrorInfo(null);
              }}
            >
              إغلاق
            </button>
          </div>
          {errorInfo && errorInfo.status && (
            <div className="messages-error-detail">
              <span>الـ status: {errorInfo.status}</span>
              {errorInfo.method && errorInfo.url && (
                <span>
                  {" "}
                  — {errorInfo.method} {errorInfo.url}
                </span>
              )}
              {errorInfo.serverMessage && errorInfo.serverMessage !== error && (
                <div className="messages-error-server">
                  من السيرفر: {errorInfo.serverMessage}
                </div>
              )}
            </div>
          )}
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
                <span>المحادثات</span>
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
                    placeholder="ابحث عن متجر أو رسالة..."
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
                    <MessageCircle size={42} />
                  </div>
                  {filter === "unread" ? (
                    <>
                      <strong style={{ color: "#374151" }}>كل المحادثات مقروءة 🎉</strong>
                      <br />
                      ما في رسائل جديدة حالياً
                    </>
                  ) : searchText ? (
                    <>
                      لا توجد نتائج لـ "{searchText}"
                      <br />
                      جرب كلمة بحث مختلفة
                    </>
                  ) : (
                    <>
                      <strong style={{ color: "#374151" }}>لا توجد محادثات بعد</strong>
                      <br />
                      ابدأ محادثة مع أي بائع من صفحة المنتج
                    </>
                  )}
                </div>
              ) : (
                filtered.map((conv) => {
                  const otherParty = conv.otherParty ?? {};
                  const name = displayName(otherParty);
                  const avatar = otherParty.avatar;
                  const last = conv.lastMessage?.content ?? "ابدأ المحادثة...";
                  const lastTime = conv.lastMessageAt || conv.updated_at;
                  const unread = conv.unreadCount || 0;
                  const hasStore = Boolean(otherParty.storeName);

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      className={`messages-conv-item ${
                        sameId(selectedId, conv.id) ? "selected" : ""
                      } ${unread > 0 ? "unread" : ""}`}
                    >
                      {avatar ? (
                        <img src={avatar} alt={name} className="messages-avatar-img" />
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
                          <span className="messages-conv-name">
                            {hasStore && (
                              <span className="messages-conv-store-tag">متجر</span>
                            )}
                            {name}
                          </span>
                        </div>
                        <p className="messages-conv-last">
                          <ShoppingBag
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
                    <button className="messages-icon-btn" aria-label="معلومات">
                      <Info size={18} />
                    </button>
                  </div>
                  <div className="messages-chat-user">
                    <div className="messages-chat-user-info">
                      <p className="messages-chat-user-name">
                        {displayName(selectedConv.otherParty)}
                        {selectedConv.otherParty?.storeName && (
                          <span className="messages-chat-user-name-store">STORE</span>
                        )}
                      </p>
                      <p className="messages-chat-user-role">
                        {otherTyping ? (
                          <span style={{ color: "var(--gg-primary)" }}>يكتب الآن...</span>
                        ) : (
                          <>
                            <span className="messages-online-dot" />
                            متصل · بائع
                          </>
                        )}
                      </p>
                    </div>
                    {selectedConv.otherParty?.avatar ? (
                      <img
                        src={selectedConv.otherParty.avatar}
                        alt=""
                        className="messages-chat-avatar-img"
                      />
                    ) : (
                      <div
                        className="messages-chat-avatar"
                        style={{
                          backgroundColor: avatarColor(
                            displayName(selectedConv.otherParty)
                          ),
                        }}
                      >
                        {displayName(selectedConv.otherParty)[0]}
                        <span className="messages-avatar-online" />
                      </div>
                    )}
                  </div>
                </div>

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
                        ابدأ المحادثة مع {displayName(selectedConv.otherParty)}
                      </h3>
                      <p className="messages-empty-chat-text">
                        أرسل رسالتك الأولى وسيقوم البائع بالرد عليك في أقرب وقت.
                        استفسر عن المنتجات، الأسعار، أو خيارات التوصيل.
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
                          {displayName(selectedConv.otherParty)} يكتب...
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="messages-input-area">
                  {messages.length > 0 && (
                    <div className="messages-quick-replies">
                      {CUSTOMER_QUICK_REPLIES.map((q) => (
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
                      placeholder="اكتب رسالتك للتاجر..."
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
                <h3 className="messages-empty-chat-title">اختر محادثة</h3>
                <p className="messages-empty-chat-text">
                  اختر محادثة من القائمة على اليمين لعرض الرسائل وبدء المحادثة
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
