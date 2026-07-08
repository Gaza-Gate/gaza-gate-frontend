import { Clock, CheckCircle2, Package, Truck, Home } from "lucide-react";

// ترتيب مراحل الطلب - عدّلي القيم إذا الباك إند عندها أسماء إضافية غير هاي
export const ORDER_STEPS = [
  { key: "pending_review", label: "قيد المراجعة",  desc: "تم استلام طلبك وجاري مراجعته",      Icon: Clock },
  { key: "approved",       label: "تم القبول",     desc: "تم قبول طلبك من قبل البائع",        Icon: CheckCircle2 },
  { key: "preparing",      label: "قيد التحضير",   desc: "جاري تجهيز طلبك للشحن",             Icon: Package },
  { key: "shipped",        label: "قيد الشحن",     desc: "طلبك في الطريق إليك",               Icon: Truck },
  { key: "completed",      label: "مكتمل",         desc: "تم توصيل طلبك بنجاح",               Icon: Home },
];

const STATUS_INDEX = {
  pending_review: 0,
  approved: 1,
  preparing: 2,
  shipped: 3,
  delivered: 4,   // لو استخدم الباك إند "delivered" بدل "completed" بمرحلة معينة
  completed: 4,
};

export function getStepIndex(status) {
  return STATUS_INDEX[status] ?? -1;
}

export function isCancelledStatus(status) {
  return status === "cancelled" || status === "canceled";
}

const STATUS_LABELS = {
  pending_review: "قيد المراجعة",
  approved: "تم القبول",
  preparing: "قيد التحضير",
  shipped: "قيد الشحن",
  delivered: "تم التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  canceled: "ملغي",
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

const STATUS_CLASSES = {
  pending_review: "co-status--waiting",
  approved: "co-status--approved",
  preparing: "co-status--preparing",
  shipped: "co-status--delivery",
  delivered: "co-status--completed",
  completed: "co-status--completed",
  cancelled: "co-status--cancelled",
  canceled: "co-status--cancelled",
};

export function getStatusClass(status) {
  return STATUS_CLASSES[status] || "co-status--waiting";
}