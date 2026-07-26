import { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Star,
  Camera,
  Image as ImageIcon,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Copy,
  Check,
  Hourglass,
  RefreshCw,
  Pencil,
  Edit3,
} from "lucide-react";
import {
  submitReview,
  updateReview,
  deleteReview,
  ReviewApiError,
  REVIEW_ERROR_TYPES,
} from "../services/reviewService";
import { checkReviewEligibility } from "../utils/reviewEligibility";
import { formatApiError } from "../utils/errorHelper";
import "./ReviewModal.css";

// ── helpers ──────────────────────────────────────────────────

const RATING_LABELS = {
  1: "سيئ",
  2: "مقبول",
  3: "جيد",
  4: "جيد جداً",
  5: "ممتاز",
};

const RATING_HINTS = [
  "ما كان يلبي التوقعات",
  "أقل من المتوقع بقليل",
  "مطابق للتوقعات",
  "جيد جداً، أنصح به",
  "تجربة رائعة، سأشتري مرة أخرى",
];

// ── Component ────────────────────────────────────────────────
export default function ReviewModal({
  open,
  onClose,
  productId,
  productName,
  order,
  onSubmitted,
  onRefreshOrder, // ← callback لإعادة تحميل بيانات الطلب (عند ORDER_NOT_FOUND)
  onDeleted, // ← callback بعد حذف التقييم (يحدّث الـ parent)
  /** "create" (افتراضي) | "edit" */
  mode = "create",
  /** كائن التقييم الحالي — مطلوب بـ mode="edit" — يجي من getMyReviewedProductsMap */
  existingReview = null,
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  // الصورة الحالية من الباك (لما يكون edit) — تبقى ظاهرة لحد ما المستخدم يغيرها
  const [existingImage, setExistingImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [errorType, setErrorType] = useState(null); // REVIEW_ERROR_TYPES
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null); // response من الباك
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const isEditMode = mode === "edit" && existingReview?.id;
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // إغلاق بـ Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  // تنظيف object URL
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // reset كل شي لما ينغلق الـ modal
  useEffect(() => {
    if (!open) {
      setRating(0);
      setHoverRating(0);
      setComment("");
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);
      setError(null);
      setErrorInfo(null);
      setErrorType(null);
      setCopied(false);
      setSuccess(false);
      setAlreadyReviewed(false);
      setConfirmDelete(false);
    }
  }, [open]);

  // ✅ prefill البيانات لما نفتح الـ modal بـ mode="edit"
  useEffect(() => {
    if (!open) return;
    if (!isEditMode || !existingReview) return;
    setRating(Number(existingReview.rating) || 0);
    setComment(existingReview.comment || "");
    // صورة موجودة من الباك
    const img = existingReview.imageUrl || existingReview.image || null;
    setExistingImage(img);
    // لا نملأ imageFile — هي تبقى null لحد ما يختار صورة جديدة
    setImageFile(null);
    setImagePreview(null);
  }, [open, isEditMode, existingReview]);

  // ── eligibility logic (rules حسب الـ status) ──
  const eligibility = useMemo(() => checkReviewEligibility(order), [order]);

  if (!open) return null;

  // ── image handlers ──
  function handleImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("الرجاء اختيار ملف صورة صالح");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  function handleRemoveImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  // ── submit (create or edit) ──
  async function handleSubmit() {
    if (submitting || deleting) return;
    if (rating < 1) {
      setError("الرجاء اختيار تقييم من 1 إلى 5 نجوم");
      return;
    }

    // ==== edit mode ====
    if (isEditMode) {
      try {
        setSubmitting(true);
        setError(null);
        setErrorInfo(null);
        setErrorType(null);
        const response = await updateReview(existingReview.id, {
          rating,
          comment: comment.trim() || undefined,
          image: imageFile || undefined, // فقط لو اختار صورة جديدة
        });
        setSubmittedData(response ?? { rating, comment: comment.trim() });
        setSuccess(true);
        setTimeout(() => {
          onSubmitted?.(response, { mode: "edit" });
          onClose();
        }, 1800);
      } catch (err) {
        console.error("Review update error:", err);
        if (err instanceof ReviewApiError) {
          setErrorType(err.type);
          setError(err.message);
          return;
        }
        const info = formatApiError(err, "تعذّر تحديث التقييم");
        setErrorInfo(info);
        setError(info.message);
        setErrorType(REVIEW_ERROR_TYPES.UNKNOWN);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ==== create mode ====
    if (!eligibility.allowed) {
      setError(eligibility.reason);
      return;
    }
    // ⚠️ فحص الـ productId — لو ناقص الباك رح يرفض
    if (!productId) {
      setError(
        "تعذّر تحديد رقم المنتج. أعد تحميل الصفحة أو تواصل مع الدعم."
      );
      console.error("[ReviewModal] missing productId for review");
      return;
    }
    setLoading(true);
    setError("");
    setSubmitting(true);
    setError(null);
    setErrorInfo(null);
    setErrorType(null);

    try {
      const response = await submitReview({
        productId,
        orderId: order.id,
        rating,
        comment: comment.trim() || undefined,
        image: imageFile || undefined,
      });
      // خزّن رد الباك لعرضه في success state
      setSubmittedData(response ?? { rating, comment: comment.trim() });
      setSuccess(true);
      // إشعار الواجهة بعد النجاح (نُبقي الـ modal مفتوح ثانيتين ليقرأ المستخدم)
      setTimeout(() => {
        onSubmitted?.(response); // نُمرّر الـ response للأب
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Review submit error:", err);

      // ✅ خطأ معروف من الباك (already reviewed / not eligible / order not found / ...)
      if (err instanceof ReviewApiError) {
        setErrorType(err.type);
        setError(err.message);
        // الـ "already reviewed" حالة خاصة — بنعرض success-like state
        // ونُعلم الأب حتى يُحدّث قائمة المنتجات المُقيَّمة
        if (err.type === REVIEW_ERROR_TYPES.ALREADY_REVIEWED) {
          setAlreadyReviewed(true);
          onSubmitted?.({ alreadyReviewed: true, productId });
        }
        return;
      }

      // أي خطأ تاني (شبكة، 500، 404...) → formatApiError
      const info = formatApiError(err, "تعذّر إرسال التقييم");
      setErrorInfo(info);
      setError(info.message);
      setErrorType(REVIEW_ERROR_TYPES.UNKNOWN);
    } finally {
      setSubmitting(false);
    }
  }

  // ── delete (edit mode فقط) ──
  async function handleDelete() {
    if (!isEditMode || !existingReview?.id) return;
    if (deleting) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      const response = await deleteReview(existingReview.id);
      // ⚠️ نقفل الـ modal ونُعلم الـ parent بعد الحذف
      onDeleted?.(response, existingReview);
      onClose();
    } catch (err) {
      console.error("Review delete error:", err);
      if (err instanceof ReviewApiError) {
        setErrorType(err.type);
        setError(err.message);
      } else {
        const info = formatApiError(err, "تعذّر حذف التقييم");
        setErrorInfo(info);
        setError(info.message);
        setErrorType(REVIEW_ERROR_TYPES.UNKNOWN);
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleCopyError() {
    if (!errorInfo) return;
    const text = [
      `Status: ${errorInfo.status || "—"}`,
      `Method: ${errorInfo.method}`,
      `URL: ${errorInfo.url}`,
      `Message: ${errorInfo.message}`,
      errorInfo.serverMessage ? `Server: ${errorInfo.serverMessage}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const activeRating = hoverRating || rating;

  return (
    <div
      className="rm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="rm-modal" dir="rtl" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="rm-header">
          <button
            type="button"
            className="rm-close-btn"
            onClick={onClose}
            disabled={submitting || deleting}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
          <div className="rm-header-info">
            <h2 className="rm-title">
              {isEditMode ? "تعديل التقييم" : "تقييم المنتج"}
            </h2>
            <p className="rm-subtitle">{productName || "منتج"}</p>
          </div>
          <div className="rm-header-icon">
            {isEditMode ? <Edit3 size={20} /> : <Star size={20} fill="currentColor" />}
          </div>
        </div>

        {/* Body */}
        <div className="rm-body">
          {alreadyReviewed ? (
            /* ─────── الحالة 1: قيّم هاد المنتج قبل ─────── */
            <div className="rm-success">
              <div className="rm-success-art" style={{ background: "#fef9c3", color: "#ca8a04" }}>
                <CheckCircle2 size={56} strokeWidth={2.5} />
              </div>
              <h3>لقد قمت بتقييم هذا المنتج مسبقاً</h3>
              <p>يمكنك تعديل التقييم من صفحة تفاصيل الطلب</p>

              <div className="rm-success-summary">
                <div className="rm-success-note" style={{ marginTop: 0 }}>
                  تقييمك موجود ومحفوظ على صفحة المنتج والمتجر ✨
                </div>
              </div>
            </div>
          ) : success ? (
            <div className="rm-success">
              <div className="rm-success-art">
                <CheckCircle2 size={56} strokeWidth={2.5} />
              </div>
              <h3>{isEditMode ? "تم تحديث التقييم بنجاح ✓" : "شكراً لتقييمك! 🎉"}</h3>
              <p>
                {isEditMode
                  ? "تقييمك المعدّل يظهر الآن على المنتج والمتجر"
                  : "تم إرسال تقييمك بنجاح"}
              </p>

              {/* عرض التقييم المُرسل */}
              <div className="rm-success-summary">
                <div className="rm-success-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={22}
                      fill={n <= (submittedData?.rating ?? rating) ? "#fbbf24" : "transparent"}
                      stroke={n <= (submittedData?.rating ?? rating) ? "#fbbf24" : "#d1d5db"}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                {submittedData?.id && (
                  <div className="rm-success-id">
                    <span className="rm-success-id-label">رقم التقييم</span>
                    <code className="rm-success-id-value">
                      #{submittedData.id.slice(0, 8)}
                    </code>
                  </div>
                )}
                {submittedData?.imageUrl && (
                  <div className="rm-success-image">
                    <img src={submittedData.imageUrl} alt="صورة التقييم" />
                  </div>
                )}
                {(submittedData?.comment || comment) && (
                  <p className="rm-success-comment">
                    "{submittedData?.comment || comment}"
                  </p>
                )}
                {submittedData?.createdAt && (
                  <p className="rm-success-date">
                    {new Date(submittedData.createdAt).toLocaleString("ar-EG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>

              <div className="rm-success-note">
                سيظهر تقييمك على المنتج وصفحة المتجر خلال لحظات
              </div>
            </div>
          ) : (
            <>
              {/* Soft info banners حسب الحالة */}
              {eligibility.mode === "after" &&
                eligibility.allowed &&
                eligibility.daysPassed != null && (
                  <div className="rm-banner rm-banner-info">
                    <Clock size={15} />
                    <span>
                      مرّ {eligibility.daysPassed} يوم على هذه الحالة — يمكنك
                      التقييم
                    </span>
                  </div>
                )}

              {eligibility.mode === "after" && !eligibility.allowed && (
                <div className="rm-banner rm-banner-urgent">
                  <Clock size={15} />
                  <span>{eligibility.reason}</span>
                </div>
              )}

              {eligibility.mode === "always" && (
                <div className="rm-banner rm-banner-info">
                  <CheckCircle2 size={15} />
                  <span>يمكنك تقييم هذا الطلب</span>
                </div>
              )}

              {!eligibility.allowed && eligibility.mode !== "after" && (
                <div className="rm-error-banner">
                  <AlertCircle size={15} />
                  <span>{eligibility.reason}</span>
                </div>
              )}

              {/* Star picker */}
              <div className="rm-section">
                <label className="rm-label">
                  <span>تقييمك</span>
                  {activeRating > 0 && (
                    <span className="rm-rating-label">
                      {RATING_LABELS[activeRating]}
                    </span>
                  )}
                </label>
                <div
                  className="rm-stars"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = n <= activeRating;
                    return (
                      <button
                        key={n}
                        type="button"
                        className={`rm-star ${filled ? "filled" : ""}`}
                        onMouseEnter={() => setHoverRating(n)}
                        onClick={() => setRating(n)}
                        disabled={!eligibility.allowed || submitting}
                        aria-label={`${n} نجوم`}
                      >
                        <Star
                          size={36}
                          fill={filled ? "currentColor" : "transparent"}
                          strokeWidth={1.5}
                        />
                      </button>
                    );
                  })}
                </div>
                {activeRating > 0 && (
                  <p className="rm-rating-hint">{RATING_HINTS[activeRating - 1]}</p>
                )}
              </div>

              {/* Comment */}
              <div className="rm-section">
                <label className="rm-label" htmlFor="rm-comment">
                  <span>تعليقك (اختياري)</span>
                  <span className="rm-char-count">
                    {comment.length}/500
                  </span>
                </label>
                <textarea
                  id="rm-comment"
                  className="rm-textarea"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  placeholder="شاركنا تجربتك مع المنتج... ما رأييك فيه؟ هل ينصح بالشراء؟"
                  disabled={submitting}
                />
              </div>

              {/* Image upload */}
              <div className="rm-section">
                <label className="rm-label">
                  <span>
                    {isEditMode ? "صورة المنتج الحالية" : "صورة المنتج (اختياري)"}
                  </span>
                  <span className="rm-image-hint">
                    <Camera size={11} style={{ verticalAlign: "middle" }} />
                    {isEditMode
                      ? "يمكنك استبدالها باختيار صورة جديدة"
                      : "التقط صورة للمنتج كما وصلك"}
                  </span>
                </label>

                {imagePreview ? (
                  // معاينة محلية للصورة الجديدة المختارة
                  <div className="rm-image-preview-wrap">
                    <img
                      src={imagePreview}
                      alt="معاينة"
                      className="rm-image-preview"
                    />
                    <button
                      type="button"
                      className="rm-image-remove"
                      onClick={handleRemoveImage}
                      disabled={submitting}
                      aria-label="حذف الصورة"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="rm-image-preview-tag">جديد</span>
                  </div>
                ) : existingImage && isEditMode ? (
                  // الصورة الحالية من الباك (edit mode)
                  <div className="rm-image-preview-wrap">
                    <img
                      src={existingImage}
                      alt="الصورة الحالية"
                      className="rm-image-preview"
                    />
                    <div className="rm-image-preview-actions">
                      <button
                        type="button"
                        className="rm-image-action-small"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={submitting}
                      >
                        <Camera size={12} /> استبدال
                      </button>
                      <button
                        type="button"
                        className="rm-image-action-small"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={submitting}
                      >
                        <ImageIcon size={12} /> من المعرض
                      </button>
                    </div>
                    <span className="rm-image-preview-tag current">الحالية</span>
                  </div>
                ) : (
                  <div className="rm-image-actions">
                    <button
                      type="button"
                      className="rm-image-action"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={submitting}
                    >
                      <div className="rm-image-action-icon">
                        <Camera size={20} />
                      </div>
                      <div>
                        <strong>التقاط صورة</strong>
                        <span>افتح الكاميرا</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="rm-image-action"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={submitting}
                    >
                      <div className="rm-image-action-icon">
                        <ImageIcon size={20} />
                      </div>
                      <div>
                        <strong>من المعرض</strong>
                        <span>اختر صورة موجودة</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Hidden inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    handleImageFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleImageFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </div>

              {/* API error with details */}
              {error && !alreadyReviewed && (
                <>
                  {/* ✅ الحالة 2: لسا ما مرّ 5 أيام — رسالة واضحة مع أيقونة ساعة */}
                  {errorType === REVIEW_ERROR_TYPES.NOT_ELIGIBLE && (
                    <div className="rm-banner rm-banner-urgent">
                      <Hourglass size={16} />
                      <div>
                        <strong>التقييم غير متاح بعد</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "0.82rem", opacity: 0.9 }}>
                          {error}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ⚠️ باقي الأخطاء (network, 500, 404, order-not-found, ...) */}
                  {errorType !== REVIEW_ERROR_TYPES.NOT_ELIGIBLE && (
                    <div className="rm-error-banner rm-error-with-details">
                      <div className="rm-error-main">
                        <AlertCircle size={15} />
                        <div className="rm-error-content">
                          <strong className="rm-error-title">{error}</strong>
                          {errorInfo && (
                            <span className="rm-error-hint">
                              {errorType === REVIEW_ERROR_TYPES.ORDER_NOT_FOUND
                                ? "قد يكون الطلب قد تغيّر أو المنتج غير تابع لهذا الطلب — أعد تحميل الصفحة"
                                : errorType === REVIEW_ERROR_TYPES.PRODUCT_NOT_FOUND
                                ? "المنتج غير موجود — أعد تحميل الصفحة"
                                : errorType === REVIEW_ERROR_TYPES.UNAUTHORIZED
                                ? "انتهت جلستك — سجّل دخول من جديد"
                                : errorInfo.status === 404
                                ? "هذا المسار غير موجود على السيرفر — تواصل مع الباك إند"
                                : errorInfo.status === 400 || errorInfo.status === 422
                                ? "البيانات المرسلة لا تستوفي شروط الباك إند"
                                : errorInfo.status === 401
                                ? "انتهت جلستك — سجّل دخول من جديد"
                                : errorInfo.status >= 500
                                ? "خطأ من طرف السيرفر — حاول لاحقاً"
                                : "حاول مرة أخرى أو تواصل مع الدعم"}
                            </span>
                          )}
                        </div>
                      </div>
                      {errorInfo && (
                        <div className="rm-error-actions">
                          {errorInfo.url && (
                            <code className="rm-error-url">
                              {errorInfo.method} {errorInfo.url}
                              {errorInfo.status ? ` → ${errorInfo.status}` : ""}
                            </code>
                          )}
                          <button
                            type="button"
                            className="rm-copy-btn"
                            onClick={handleCopyError}
                            title="نسخ تفاصيل الخطأ للمشاركة مع الدعم"
                          >
                            {copied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copied ? "تم النسخ" : "نسخ التفاصيل"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Trust note */}
              <div className="rm-trust">
                <Shield size={13} />
                <span>تقييمك يساعد العملاء الآخرين ويظهر بصفحة المتجر</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && !alreadyReviewed && (
          <div className="rm-footer">
            {/* ✅ edit mode: زر حذف (مع تأكيد بضغطتين) */}
            {isEditMode && !confirmDelete && (
              <button
                type="button"
                className="rm-btn rm-btn-danger"
                onClick={handleDelete}
                disabled={submitting || deleting}
                title="حذف التقييم نهائياً"
              >
                <Trash2 size={15} />
                حذف التقييم
              </button>
            )}

            {/* ✅ edit mode: حالة التأكيد — "متأكد؟" */}
            {isEditMode && confirmDelete && (
              <div className="rm-confirm-delete">
                <span>متأكد من الحذف؟</span>
                <button
                  type="button"
                  className="rm-btn rm-btn-danger-sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 size={13} className="rm-spin" />
                      جاري الحذف...
                    </>
                  ) : (
                    "نعم، احذف"
                  )}
                </button>
                <button
                  type="button"
                  className="rm-btn rm-btn-ghost-sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  تراجع
                </button>
              </div>
            )}

            <button
              type="button"
              className="rm-btn rm-btn-secondary"
              onClick={onClose}
              disabled={submitting || deleting}
            >
              إلغاء
            </button>

            {/* ✅ زر "إعادة تحميل الطلب" عند ORDER_NOT_FOUND — مفيد لإعادة المزامنة مع الباك */}
            {errorType === REVIEW_ERROR_TYPES.ORDER_NOT_FOUND && onRefreshOrder && (
              <button
                type="button"
                className="rm-btn rm-btn-secondary"
                onClick={async () => {
                  try {
                    await onRefreshOrder();
                    onClose();
                  } catch {
                    /* ignore — بنقفل المودال حتى لو فشل */
                    onClose();
                  }
                }}
                disabled={submitting}
                title="إعادة تحميل بيانات الطلب"
              >
                <RefreshCw size={15} />
                إعادة تحميل الطلب
              </button>
            )}

            <button
              type="button"
              className="rm-btn rm-btn-primary"
              onClick={handleSubmit}
              disabled={
                submitting || deleting || (isEditMode ? false : !eligibility.allowed) || rating < 1
              }
              title={
                isEditMode
                  ? "حفظ التعديلات"
                  : !eligibility.allowed
                  ? eligibility.reason
                  : "إرسال التقييم"
              }
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="rm-spin" />
                  {isEditMode ? "جاري الحفظ..." : "جاري الإرسال..."}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <Pencil size={15} />
                  ) : (
                    <Star size={15} fill="currentColor" />
                  )}
                  {isEditMode
                    ? "حفظ التعديلات"
                    : eligibility.allowed
                    ? "إرسال التقييم"
                    : "التقييم غير متاح"}
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer لحالة "already reviewed" — بس زر إغلاق */}
        {alreadyReviewed && !success && (
          <div className="rm-footer">
            <button
              type="button"
              className="rm-btn rm-btn-primary"
              onClick={onClose}
            >
              فهمت
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
