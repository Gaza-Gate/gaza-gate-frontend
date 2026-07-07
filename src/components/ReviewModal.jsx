import { useState } from "react";
import { X, Star } from "lucide-react";
import { submitProductReview } from "../services/authService";

export default function ReviewModal({ open, onClose, productId, orderId, productName, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("يرجى اختيار عدد النجوم");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await submitProductReview({ productId, orderId, rating, comment }, token);
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.message || "تعذر إرسال التقييم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cfm-overlay" dir="rtl" onClick={onClose}>
      <div className="cfm-card" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", cursor: "pointer" }}
        >
          <X size={20} />
        </button>

        <h2 className="cfm-title">قيّم منتج: {productName}</h2>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <Star size={32} fill={(hoverRating || rating) >= star ? "#fbbf24" : "none"} stroke="#fbbf24" />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="اكتب رأيك بالمنتج (اختياري)"
          rows={4}
          style={{
            width: "100%",
            padding: "12px 14px",
            border: "1.5px solid #e5e7eb",
            borderRadius: 10,
            fontFamily: "inherit",
            fontSize: 14,
            direction: "rtl",
            resize: "vertical",
            marginBottom: 16,
          }}
        />

        {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div className="cfm-actions">
          <button className="cfm-btn-cancel" onClick={onClose} disabled={loading}>إلغاء</button>
          <button className="cfm-btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="cfm-spinner" /> : "إرسال التقييم"}
          </button>
        </div>
      </div>
    </div>
  );
}