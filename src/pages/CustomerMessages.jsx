import { useState, useEffect, useRef } from "react";
import { Send, Search, Info, Loader2 } from "lucide-react";
import {
  getAuthToken,
  getCustomerConversations,
  getCustomerMessages,
  sendCustomerMessage,
} from "../services/authService";
 
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import "./Messages.css";

const COLORS = ["#F97316", "#8B5CF6", "#EF4444", "#10B981", "#3B82F6", "#EC4899"];
function avatarColor(name = "") {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}
function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CustomerMessages() {
  const token = getAuthToken();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoadingConvs(true);
        const data = await getCustomerConversations(token);
        const list = Array.isArray(data) ? data : data.conversations ?? [];
        setConversations(list);
        if (list.length > 0) setSelectedId(list[0]._id ?? list[0].id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingConvs(false);
      }
    }
    fetchConversations();
  }, [token]);

  useEffect(() => {
    if (!selectedId) return;
    async function fetchMessages() {
      try {
        setLoadingMsgs(true);
        const data = await getCustomerMessages(selectedId, token);
        const list = Array.isArray(data) ? data : data.messages ?? [];
        setMessages(list);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingMsgs(false);
      }
    }
    fetchMessages();
  }, [selectedId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConv = conversations.find((c) => (c._id ?? c.id) === selectedId);

  const filtered = conversations.filter((c) => {
    const name = c.sellerName ?? c.seller?.storeName ?? "";
    const last = c.lastMessage ?? "";
    return name.includes(searchText) || last.includes(searchText);
  });

  async function handleSend() {
    if (!messageText.trim() || !selectedId) return;
    const text = messageText;
    setMessageText("");
    setSending(true);
    try {
      const sent = await sendCustomerMessage(selectedId, text, token);
      const newMsg = sent.message ?? sent ?? {
        _id: Date.now(),
        text,
        createdAt: new Date().toISOString(),
        fromCustomer: true,
      };
      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) =>
        prev.map((c) => (c._id ?? c.id) === selectedId ? { ...c, lastMessage: text } : c)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="messages-wrapper" dir="rtl">
 
      <div className="messages-title-area">
        <h1>المراسلات</h1>
        <p>تواصل مع البائعين مباشرة</p>
      </div>

      {error && (
        <div className="messages-error">
          <span>{error}</span>
          <button className="messages-error-close" onClick={() => setError(null)}>إغلاق</button>
        </div>
      )}

      <div className="messages-main">
        <div className="messages-container">
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
                  const id = conv._id ?? conv.id;
                  const name = conv.sellerName ?? conv.seller?.storeName ?? "بائع";
                  const last = conv.lastMessage ?? "";
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className={`messages-conv-item ${selectedId === id ? "selected" : ""}`}
                    >
                      <div className="messages-avatar" style={{ backgroundColor: avatarColor(name) }}>
                        {name[0]}
                      </div>
                      <div className="messages-conv-info">
                        <div className="messages-conv-row">
                          <span className="messages-conv-time">{formatTime(conv.updatedAt)}</span>
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

          <div className="messages-chat">
            {selectedConv ? (
              <div className="messages-chat-header">
                <button className="messages-info-btn">
                  <Info size={18} color="#9ca3af" />
                </button>
                <div className="messages-chat-user">
                  <div className="messages-chat-user-info">
                    <p className="messages-chat-user-name">
                      {selectedConv.sellerName ?? selectedConv.seller?.storeName ?? "بائع"}
                    </p>
                    <p className="messages-chat-user-role">بائع</p>
                  </div>
                  <div
                    className="messages-chat-avatar"
                    style={{ backgroundColor: avatarColor(selectedConv.sellerName ?? selectedConv.seller?.storeName ?? "") }}
                  >
                    {(selectedConv.sellerName ?? selectedConv.seller?.storeName ?? "ب")[0]}
                  </div>
                </div>
              </div>
            ) : (
              <div className="messages-chat-header-empty" />
            )}

            <div className="messages-area">
              {loadingMsgs ? (
                <div className="messages-loading">
                  <Loader2 size={28} color="#f97316" className="spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="messages-empty">لا توجد رسائل بعد</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.fromCustomer ?? msg.senderType === "customer";
                  const text = msg.text ?? msg.content ?? msg.body ?? "";
                  const time = formatTime(msg.createdAt);
                  return isMe ? (
                    <div key={msg._id ?? msg.id} className="messages-bubble-wrap-me">
                      <div className="messages-bubble-me">
                        <p className="messages-bubble-text">{text}</p>
                        <p className="messages-bubble-time-me">{time}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={msg._id ?? msg.id} className="messages-bubble-wrap-other">
                      <div className="messages-bubble-other">
                        <p className="messages-bubble-text">{text}</p>
                        <p className="messages-bubble-time-other">{time}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="messages-input-area">
              <button
                onClick={handleSend}
                disabled={sending || !messageText.trim()}
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}