import { useState, useRef } from "react";
import { X, Star, Camera, Image as ImageIcon, Trash2 } from "lucide-react";
import { submitProductReview } from "../services/productService";
import { getAuthToken } from "../services/authService";
import "./ReviewModal.css";

export default function ReviewModal({ open, product, orderId, onClose, onSubmitted }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const token = getAuthToken();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  if (!open) return null;

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("الرجاء اختيار تقييم (نجمة واحدة على الأقل)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await submitProductReview(
        product.id ?? product._id,
        { rating, comment: comment.trim(), image: imageFile, orderId },
        token
      );
      setSuccess(true);
      setTimeout(() => {
        onSubmitted?.();
        handleClose();
      }, 1200);
    } catch (err) {
      setError(err.message || "تعذر إرسال التقييم، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setComment("");
    removeImage();
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <div className="rvm-overlay" dir="rtl" onClick={handleClose}>
      <div className="rvm-card" onClick={(e) => e.stopPropagation()}>
        <div className="rvm-header">
          <button className="rvm-close" onClick={handleClose} aria-label="إغلاق">
            <X size={20} />
          </button>
          <h2>قيّم المنتج</h2>
        </div>

        <p className="rvm-product-name">{product?.name}</p>

        {success ? (
          <div className="rvm-success">
            <span className="rvm-success-icon">✅</span>
            <p>شكراً لتقييمك! تم إرسال مراجعتك بنجاح</p>
          </div>
        ) : (
          <>
            {/* النجوم */}
            <div className="rvm-stars-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="rvm-star-btn"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} نجوم`}
                >
                  <Star
                    size={32}
                    fill={n <= (hoverRating || rating) ? "#fbbf24" : "none"}
                    stroke={n <= (hoverRating || rating) ? "#fbbf24" : "#d1d5db"}
                  />
                </button>
              ))}
            </div>

            {/* التعليق */}
            <div className="rvm-field">
              <label>تعليقك (اختياري)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="شاركنا تجربتك مع هذا المنتج..."
                rows={3}
              />
            </div>

            {/* الصورة */}
            <div className="rvm-field">
              <label>أضف صورة للمنتج (اختياري)</label>

              {imagePreview ? (
                <div className="rvm-image-preview-wrap">
                  <img src={imagePreview} alt="معاينة" className="rvm-image-preview" />
                  <button type="button" className="rvm-remove-image" onClick={removeImage}>
                    <Trash2 size={14} />
                    إزالة الصورة
                  </button>
                </div>
              ) : (
                <div className="rvm-image-actions">
                  <button
                    type="button"
                    className="rvm-image-btn"
                    onClick={() => cameraRef.current?.click()}
                  >
                    <Camera size={16} />
                    التقاط صورة
                  </button>
                  <button
                    type="button"
                    className="rvm-image-btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImageIcon size={16} />
                    اختيار من المعرض
                  </button>
                </div>
              )}

              {/* input للكاميرا مباشرة على الموبايل */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraRef}
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
              {/* input لاختيار صورة من المعرض */}
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
            </div>

            {error && <div className="rvm-error">{error}</div>}

            <div className="rvm-actions">
              <button className="rvm-btn-cancel" onClick={handleClose} disabled={loading}>
                إلغاء
              </button>
              <button className="rvm-btn-submit" onClick={handleSubmit} disabled={loading}>
                {loading ? "جاري الإرسال..." : "إرسال التقييم"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}