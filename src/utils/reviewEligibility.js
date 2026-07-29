// ─────────────────────────────────────────────────────────────
//  Review Eligibility — shared utility
//  Used by ReviewModal + CustomerOrderTracking
//  Single source of truth for "can this user review this order?"
// ─────────────────────────────────────────────────────────────

/**
 * قواعد الأهلية (من الباك إند):
 *  - COMPLETED, REJECTED   → يقيم فوراً (always)
 *  - CANCELLED, PENDING_REVIEW → ممنوع أبداً (never)
 *  - ACCEPTED, IN_PRODUCTION, READY → يقيم بعد 5 أيام (after)
 */
export const REVIEW_RULES = {
  COMPLETED: { mode: "always" },
  REJECTED: { mode: "always" },
  CANCELLED: { mode: "never", reason: "لا يمكن تقييم طلب ملغي" },
  CANCELED: { mode: "never", reason: "لا يمكن تقييم طلب ملغي" },
  PENDING_REVIEW: {
    mode: "never",
    reason: "التقييم غير متاح قبل قبول الطلب أو اكتماله",
  },
  ACCEPTED: { mode: "after", window: 5, label: "قبول الطلب" },
  APPROVED: { mode: "after", window: 5, label: "قبول الطلب" },
  IN_PRODUCTION: { mode: "after", window: 5, label: "بدء التحضير" },
  PREPARING: { mode: "after", window: 5, label: "بدء التحضير" },
  READY: { mode: "after", window: 5, label: "تجهيز الطلب" },
};

export const REVIEW_WINDOW_DAYS = 5;

function getStatusDate(order) {
  if (!order) return null;
  // بنجرب نلقط تاريخ دخول الحالة الحالية بأكثر من اسم ممكن
  const candidates = [
    order.statusChangedAt,
    order.status_changed_at,
    order.acceptedAt,
    order.approvedAt,
    order.preparingAt,
    order.inProductionAt,
    order.readyAt,
    order.completedAt,
    order.rejectedAt,
    order.updatedAt,
    order.updated_at,
    order.createdAt,
    order.created_at,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Returns: { allowed, status, mode, reason?, daysLeft?, daysPassed?, noDate? }
 */
export function checkReviewEligibility(order) {
  if (!order) {
    return { allowed: false, reason: "لم يتم العثور على الطلب" };
  }
  const status = (order.status || "").toUpperCase();
  const rule = REVIEW_RULES[status];

  if (!rule) {
    return {
      allowed: false,
      reason: `حالة الطلب (${status || "غير معروفة"}) غير قابلة للتقييم حالياً`,
      status,
    };
  }

  if (rule.mode === "never") {
    return { allowed: false, reason: rule.reason, status, mode: "never" };
  }

  if (rule.mode === "always") {
    return { allowed: true, status, mode: "always" };
  }

  // mode === "after" → لازم يمر 5 أيام على دخول الحالة
  const statusDate = getStatusDate(order);
  if (!statusDate) {
    // ✅ Fix: ما عندي تاريخ → لا نسمح بالمراجعة (آمن من السماح الغلط)
    // السبب: الباك بيرفض بـ 400 لو الـ 5 أيام ما مرت. فالسماح الغلط
    // بيسبب خطأ للمستخدم. بنطلب منو يحدّث الصفحة.
    return {
      allowed: false,
      status,
      mode: "after",
      reason: `تعذّر التحقق من تاريخ الطلب. حدّث الصفحة وحاول مرة أخرى.`,
      noDate: true,
    };
  }
  const now = Date.now();
  const daysPassed = (now - statusDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysLeft = Math.ceil(REVIEW_WINDOW_DAYS - daysPassed);

  if (daysPassed >= REVIEW_WINDOW_DAYS) {
    return {
      allowed: true,
      status,
      mode: "after",
      daysPassed: Math.floor(daysPassed),
    };
  }
  return {
    allowed: false,
    status,
    mode: "after",
    reason: `يمكنك تقييم الطلب بعد ${REVIEW_WINDOW_DAYS} أيام من ${rule.label} (باقي ${daysLeft} ${
      daysLeft === 1 ? "يوم" : "أيام"
    })`,
    daysLeft,
    statusDate,
  };
}
