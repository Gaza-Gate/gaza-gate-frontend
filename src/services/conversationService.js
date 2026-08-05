// src/services/conversationService.js
//
// خدمات المراسلات (Conversations/Messages) — للزبون والبائع
// تم نقلها من authService.js لتجنب الازدواجية

import api from "../utils/api";
import { getCurrentUser } from "./authService";

/**
 * GET /api/conversations?page=1
 * جلب قائمة المحادثات
 */
export async function getConversations(page = 1) {
  const res = await api.get(`/api/conversations?page=${page}`);
  return res.data;
}

/**
 * GET /api/conversations?page=1
 * Alias للـ Customer side (نفس الـ endpoint)
 */
export async function getCustomerConversations(page = 1) {
  const res = await api.get(`/api/conversations?page=${page}`);
  return res.data;
}

/**
 * GET /api/conversations/:id?page=1
 * جلب رسائل محادثة معينة
 */
export async function getMessages(conversationId, page = 1) {
  const res = await api.get(`/api/conversations/${conversationId}?page=${page}`);
  return res.data;
}

/**
 * GET /api/conversations/:id
 * Alias للـ Customer side
 */
export async function getCustomerMessages(conversationId, page = 1) {
  const res = await api.get(`/api/conversations/${conversationId}?page=${page}`);
  return res.data;
}

/**
 * POST /api/conversations/:id/messages
 * إرسال رسالة في محادثة
 */
export async function sendMessage(conversationId, text) {
  const res = await api.post(`/api/conversations/${conversationId}/messages`, {
    content: text,
  });
  return res.data;
}

/**
 * POST /api/conversations/:id/messages
 * Alias للـ Customer side
 */
export async function sendCustomerMessage(conversationId, text) {
  const res = await api.post(`/api/conversations/${conversationId}/messages`, {
    content: text,
  });
  return res.data;
}

/**
 * PATCH /api/conversations/:id/read
 * تعليم محادثة كمقروءة
 */
export async function markConversationAsRead(conversationId) {
  const res = await api.patch(`/api/conversations/${conversationId}/read`);
  return res.data;
}

/**
 * POST /api/conversations
 * إنشاء محادثة جديدة (أو جلب الموجودة)
 *
 * @param {string} sellerId
 * @param {"seller"|"product"} sourceType
 * @param {string|null} sourceId
 * @param {Object} [options]
 * @param {string} [options.customerId]
 * @param {string} [options.productId]
 */
export async function createConversation(
  sellerId,
  sourceType = "seller",
  sourceId = null,
  options = {}
) {
  const { customerId, productId } = options;
  const currentUser = customerId ? { id: customerId } : getCurrentUser();

  // ✅ السماح بالمراسلة الذاتية: لو sellerId === currentUser.id
  //    (نفس الـ user بيبيع وبيشتري)، ما بنحظر على مستوى الواجهة.
  //    لو الباك بده يرفض، رح يرجّع 4xx ونعرض الرسالة للمستخدم.
  // ❌ ممنوع نضيف: if (sellerId === currentUser?.id) throw new Error("...")

  // ✅ الباك بده body كامل حسب الـ spec
  const payload = {
    sellerId,
    customerId: currentUser?.id,
    sourceType,
    sourceId: sourceId || sellerId,
    activeProductId: productId || null,
  };

  const res = await api.post("/api/conversations", payload);
  return res.data;
}
