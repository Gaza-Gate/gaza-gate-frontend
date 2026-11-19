import api from "../utils/api";

/* ═══════════════════════════════════════════════════════════════════
   Notification Service
   ─────────────────────────────────────────────────────────────────
   ✅ Endpoints المؤكدة من Postman collection (Gaza-Gate API v2):

   Customer (token: customer role):
     GET    /api/customer/notification?page=1&limit=10
     PATCH  /api/customer/notification/:id/read
     PATCH  /api/customer/notification/read-all
     DELETE /api/customer/notification
     DELETE /api/customer/notification/:id

   Seller (token: seller role):
     GET    /api/seller/notification?page=1&limit=10
     PATCH  /api/seller/notification/:id/read
     PATCH  /api/seller/notification/read-all
     DELETE /api/seller/notification
     DELETE /api/seller/notification/:id

   ✅ Response shape المؤكد من Postman (نفس الـ shape للدورين):
   {
     status: "success",
     data: {
       notifications: [
         {
           id, type, title, content, actionUrl,
           isRead, sentAt,
           sender: { id, name },
           order: { id, orderNumber, status }
         }
       ],
       stats: { total, order, general, system, promotional, unRead },
       pagination: { currentPage, totalPages, totalItems, pageSize,
                      hasNextPage, hasPreviousPage }
     }
   }
   ═══════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────
   Customer
   ────────────────────────────────────────────────────────────── */

export async function getCustomerNotifications({ page = 1, limit = 10 } = {}) {
  const res = await api.get(
    `/api/customer/notification?page=${page}&limit=${limit}`
  );
  return res.data?.data ?? res.data;
}

export async function markCustomerNotificationRead(id) {
  if (!id) throw new Error("notification id is required");
  const res = await api.patch(`/api/customer/notification/${id}/read`);
  return res.data?.data ?? res.data;
}

export async function markAllCustomerNotificationsRead() {
  const res = await api.patch("/api/customer/notification/read-all");
  return res.data?.data ?? res.data;
}

export async function deleteCustomerNotification(id) {
  if (!id) throw new Error("notification id is required");
  const res = await api.delete(`/api/customer/notification/${id}`);
  return res.data?.data ?? res.data;
}

export async function deleteAllCustomerNotifications() {
  const res = await api.delete("/api/customer/notification");
  return res.data?.data ?? res.data;
}

/* ──────────────────────────────────────────────────────────────
   Seller
   ────────────────────────────────────────────────────────────── */

export async function getSellerNotifications({ page = 1, limit = 10 } = {}) {
  const res = await api.get(
    `/api/seller/notification?page=${page}&limit=${limit}`
  );
  return res.data?.data ?? res.data;
}

export async function markSellerNotificationRead(id) {
  if (!id) throw new Error("notification id is required");
  const res = await api.patch(`/api/seller/notification/${id}/read`);
  return res.data?.data ?? res.data;
}

export async function markAllSellerNotificationsRead() {
  const res = await api.patch("/api/seller/notification/read-all");
  return res.data?.data ?? res.data;
}

export async function deleteSellerNotification(id) {
  if (!id) throw new Error("notification id is required");
  const res = await api.delete(`/api/seller/notification/${id}`);
  return res.data?.data ?? res.data;
}

export async function deleteAllSellerNotifications() {
  const res = await api.delete("/api/seller/notification");
  return res.data?.data ?? res.data;
}

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

/**
 * استخراج مصفوفة الإشعارات من أي response shape محتمل
 */
export function extractNotifications(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/**
 * استخراج الـ stats مع default values آمنة
 */
export function extractStats(data, fallbackListLength = 0) {
  const s = data?.stats ?? {};
  return {
    total: Number(s.total ?? fallbackListLength),
    order: Number(s.order ?? 0),
    general: Number(s.general ?? 0),
    system: Number(s.system ?? 0),
    promotional: Number(s.promotional ?? 0),
    // customer stats بيجي فيها product/review بدل promotional — بنحترمها
    product: Number(s.product ?? 0),
    review: Number(s.review ?? 0),
    unRead: Number(s.unRead ?? 0),
  };
}

/**
 * استخراج الـ pagination
 */
export function extractPagination(data) {
  return data?.pagination ?? null;
}
