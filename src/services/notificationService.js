import api from "../utils/api";

/**
 * GET /api/customer/notification?page=1
 *
 * Response shape (من البوست مان):
 * {
 *   status: "success",
 *   data: {
 *     notifications: [...],
 *     stats: { total, order, system, product, review, unRead },
 *     pagination: { currentPage, totalPages, totalItems, pageSize, hasNextPage, hasPreviousPage }
 *   }
 * }
 */
export async function getCustomerNotifications(page = 1) {
  const res = await api.get(`/api/customer/notification?page=${page}`);
  return res.data?.data ?? res.data;
}

/**
 * PATCH /api/customer/notification/{id}/read
 * — تعليم إشعار واحد كمقروء
 */
export async function markCustomerNotificationRead(id) {
  const res = await api.patch(`/api/customer/notification/${id}/read`);
  return res.data;
}

/**
 * PATCH /api/customer/notification/read-all
 * — تعليم كل الإشعارات كمقروءة
 */
export async function markAllCustomerNotificationsRead() {
  const res = await api.patch("/api/customer/notification/read-all");
  return res.data;
}
