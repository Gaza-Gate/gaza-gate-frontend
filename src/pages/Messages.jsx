import { useState, useEffect, useRef } from "react";
import { Send, Search, Info, Loader2 } from "lucide-react";
import {
  getAuthToken,
  getConversations,
  getConversationDetails,
  sendConversationMessage,
  markConversationRead,
} from "../services/authService";
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
function getCurrentUserId() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id || user?._id || null;
  } catch {
    return null;
  }
}

export default function Messages() {
  const token = getAuthToken();
  const currentUserId = getCurrentUserId();

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
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoadingConvs(true);
      const res = await getConversations(1, token);
      const list = res?.data?.conversations ?? [];
      setConversations(list);
      if (list.length > 0) {
        setSelectedId(list[0].id ?? list[0]._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    fetchConversationDetails(selectedId);
    markConversationRead(selectedId, token).catch(() => {});
  }, [selectedId]);

  const fetchConversationDetails = async (id) => {
    try {
      setLoadingMsgs(true);
      const res = await getConversationDetails(id, token);
      setSelectedConv(res?.data?.conversation ?? null);
      setMessages(res?.data?.messages ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filtered = conversations.filter((c) => {
    const name =
      `${c.otherParty?.firstName ?? ""} ${c.otherParty?.lastName ?? ""}`.trim();
    const last = c.lastMessage?.content ?? c.lastMessage ?? "";
    return (name || "").includes(searchText) || last.includes(searchText);
  });

  async function handleSend() {
    if (!messageText.trim() || !selectedId) return;
    const text = messageText;
    setMessageText("");
    setSending(true);
    try {
      const res = await sendConversationMessage(selectedId, text, token);
      const sentMsg = res?.data?.message;
      const newMsg = {
        ...sentMsg,
        createdAt: sentMsg?.createdAt || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) =>
        prev.map((c) =>
          (c.id ?? c._id) === selectedId
            ? { ...c, lastMessage: { content: text } }
            : c
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="messages-wrapper" dir="rtl">

      <SellerNavbar />

      {/* Page title */}
      <div className="messages-title-area">
        <h1>المراسلات</h1>
        <p>تواصل مع المشترين مباشرة</p>
      </div>

      {/* Error */}
      {error && (
        <div className="messages-error">
          <span>{error}</span>
          <button className="messages-error-close" onClick={() => setError(null)}>إغلاق</button>
        </div>
      )}

      {/* Main */}
      <div className="messages-main">
        <div className="messages-container">

          {/* Conversations list */}
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
                  const id = conv.id ?? conv._id;
                  const name =
                    `${conv.otherParty?.firstName ?? ""} ${conv.otherParty?.lastName ?? ""}`.trim() ||
                    "مشتري";
                  const last = conv.lastMessage?.content ?? conv.lastMessage ?? "";
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className={`messages-conv-item ${selectedId === id ? "selected" : ""}`}
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
                          <span className="messages-conv-time">{formatTime(conv.updatedAt ?? conv.updated_at)}</span>
                          <span className="messages-conv-name">{name}</span>
                        </div>
                        <p className="messages-conv-last">{last}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat window */}
          <div className="messages-chat">
            {selectedConv ? (
              <div className="messages-chat-header">
                <button className="messages-info-btn">
                  <Info size={18} color="#9ca3af" />
                </button>
                <div className="messages-chat-user">
                  <div className="messages-chat-user-info">
                    <p className="messages-chat-user-name">
                      {`${selectedConv.otherParty?.firstName ?? ""} ${selectedConv.otherParty?.lastName ?? ""}`.trim() || "مشتري"}
                    </p>
                    <p className="messages-chat-user-role">مشتري</p>
                  </div>
                  <div
                    className="messages-chat-avatar"
                    style={{ backgroundColor: avatarColor(selectedConv.otherParty?.firstName ?? "") }}
                  >
                    {selectedConv.otherParty?.avatar ? (
                      <img
                        src={selectedConv.otherParty.avatar}
                        alt=""
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      (selectedConv.otherParty?.firstName ?? "م")[0]
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="messages-chat-header-empty" />
            )}

            {/* Messages */}
            <div className="messages-area">
              {loadingMsgs ? (
                <div className="messages-loading">
                  <Loader2 size={28} color="#f97316" className="spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="messages-empty">لا توجد رسائل بعد</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  const time = formatTime(msg.createdAt ?? msg.created_at);
                  return isMe ? (
                    <div key={msg.id} className="messages-bubble-wrap-me">
                      <div className="messages-bubble-me">
                        <p className="messages-bubble-text">{msg.content}</p>
                        <p className="messages-bubble-time-me">{time}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="messages-bubble-wrap-other">
                      <div className="messages-bubble-other">
                        <p className="messages-bubble-text">{msg.content}</p>
                        <p className="messages-bubble-time-other">{time}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="messages-input-area">
              <button
                onClick={handleSend}
                disabled={sending || !messageText.trim() || !selectedId}
                className="messages-send-btn"
                style={{ background: sending || !messageText.trim() ? "#fed7aa" : "#f97316" }}
              >
                {sending
                  ? <Loader2 size={15} color="#fff" className="spin" />
                  : <Send size={15} color="#fff" style={{ transform: "scaleX(-1)" }} />
                }
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
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