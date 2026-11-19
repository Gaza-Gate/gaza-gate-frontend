/**
 * Notification Route Resolver
 * ─────────────────────────────────────────────────────────
 * يحوّل إشعار (notification object) → مسار (path) للـ Frontend.
 *
 * الـ source of truth: ملف Postman collection (Gaza-Gate.json).
 * كل الـ shapes المدعومة مبنية على الـ response examples من الباك.
 *
 * الـ shape الأساسي للإشعار (من Postman):
 *   {
 *     id, type, title, content,
 *     actionUrl: string|null,    ← الباك أحياناً يبعت المسار الجاهز
 *     isRead, sentAt, createdAt,
 *     sender: { id, name },
 *     order?: { id, orderNumber, status },
 *     review?: { id, rating, comment },
 *     product?: { id, name, image },
 *   }
 *
 * الـ `type` (capitalized) — Postman examples:
 *   - customer side: ORDER, SYSTEM, PROMOTIONAL, GENERAL
 *   - seller side:   rating, alert, conversation, NEW_ORDER, REVIEW, ORDER ...
 *
 * `actionUrl` أحياناً يكون:
 *   - "/orders/o1o1o1o1-..."   (customer relative)
 *   - "/my-orders/o1o1o1o1-..." (alternative)
 *   - "/conversations/xyz"     (seller)
 *   - "/products/p1p1p1-..."    (review reply → product)
 *   - "/profile/customer/c-..." (customer profile)
 *   - "/store/s-..."            (store)
 *
 * ⚠️ ملاحظة: قيم actionUrl من الباك لا تلتزم بـ prefix ثابت — لازم
 *    نطبّعها ونوجّهها للراوت الصحيح تبع الـ Frontend تبعانا.
 *
 * الـ Frontend routes (مطابقة لـ App.jsx):
 *   Customer: /home/customer, /products, /product/:id, /cart, /profile/customer,
 *             /favorites, /my-orders, /my-orders/:id, /customer/store, /customer/store/:sellerId,
 *             /customer/profile/:customerId, /profile/customer/:customerId,
 *             /messages, /notifications
 *   Seller:   /seller/dashboard, /seller/messages, /seller/orders, /seller/orders/:id,
 *             /seller/ratings, /seller/products, /seller/notifications
 *
 * 🔒 عزل صارم حسب الدور: الإشعارات اللي بتمر من هاد الـ resolver لازم
 *    تكون فعلاً تخص الدور المطلوب. الفحص بـ `isNotificationForRole` (من
 *    notificationRoleFilter.js) بيشتغل قبل أي تحويل لمسار.
 */

/* ── Helpers لاستخراج الحقول بأكثر من shape ── */

function pickField(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return null;
}

function getOrder(n) {
  if (n?.order && typeof n.order === "object" && n.order.id) return n.order;
  return {
    id: pickField(n, ["orderId", "order_id", "orderID"]),
    orderNumber: pickField(n, ["orderNumber", "order_number"]),
    status: pickField(n, ["orderStatus", "order_status", "status"]),
  };
}

function getReview(n) {
  // 1) إشعار فيه كائن review كامل (مثل Postman: { review: { id, rating, comment } })
  if (n?.review && typeof n.review === "object" && n.review.id) return n.review;
  // 2) تجميع الـ review من حقول مسطحة + حقول داخل data/payload/meta
  const id =
    pickField(n, ["reviewId", "review_id", "ratingId", "rating_id"]) ||
    pickField(n?.data, ["reviewId", "review_id", "id"]) ||
    pickField(n?.payload, ["reviewId", "review_id", "id"]) ||
    pickField(n?.meta, ["reviewId", "review_id", "id"]) ||
    pickField(n?.target, ["id", "reviewId"]) ||
    pickField(n?.context, ["id", "reviewId"]);
  const productId =
    pickField(n, ["reviewProductId", "review_product_id"]) ||
    pickField(n?.review, ["productId", "product_id"]) ||
    pickField(n?.data, ["productId", "product_id"]) ||
    pickField(n?.payload, ["productId", "product_id"]) ||
    pickField(n?.meta, ["productId", "product_id"]) ||
    pickField(n?.target, ["productId"]) ||
    pickField(n?.context, ["productId"]);
  return { id, productId };
}

function getProduct(n) {
  // 1) كائن product كامل (Postman: { product: { id, name, image } })
  if (n?.product && typeof n.product === "object" && n.product.id) return n.product;
  // 2) المنتج متداخل داخل review
  const review = n?.review;
  if (review?.product && typeof review.product === "object" && review.product.id) {
    return review.product;
  }
  // 3) استخراج productId من كل المصادر الممكنة
  const id =
    pickField(n, ["productId", "product_id", "productID"]) ||
    pickField(review, ["productId", "product_id", "productID"]) ||
    pickField(n?.data, ["productId", "product_id", "id"]) ||
    pickField(n?.payload, ["productId", "product_id", "id"]) ||
    pickField(n?.meta, ["productId", "product_id", "id"]) ||
    pickField(n?.target, ["productId", "id"]) ||
    pickField(n?.context, ["productId", "id"]);
  return id ? { id } : { id: null };
}

/* ═══════════════════════════════════════════════════════════════
   ✅ Public helpers — تقدر تستخدمها من أي مكون (Dropdown / Page)
   ═══════════════════════════════════════════════════════════════ */

/**
 * استخراج productId من أي إشعار — يدعم كل الـ shapes المحتملة.
 * ترجع null لو ما في productId.
 */
export function extractProductIdFromNotification(notif) {
  if (!notif) return null;
  return getProduct(notif)?.id ?? null;
}

/**
 * استخراج reviewId من أي إشعار — يدعم كل الـ shapes المحتملة.
 * ترجع null لو ما في reviewId.
 */
export function extractReviewIdFromNotification(notif) {
  if (!notif) return null;
  return getReview(notif)?.id ?? null;
}

/**
 * هل هذا الإشعار من نوع تقييم/مراجعة؟
 */
export function isReviewNotification(notif) {
  if (!notif) return false;
  const t = normType(notif.type);
  return t === "REVIEW" || t === "REVIEW_REPLY" || t === "RATING";
}

function getSender(n) {
  if (n?.sender && typeof n.sender === "object") return n.sender;
  return {
    id: pickField(n, ["senderId", "sender_id"]),
    name: pickField(n, ["senderName", "sender_name"]),
  };
}

function getMessage(n) {
  if (n?.message && typeof n.message === "object" && n.message.id) return n.message;
  if (n?.conversation && typeof n.conversation === "object" && n.conversation.id)
    return n.conversation;
  return {
    id: pickField(n, ["messageId", "message_id", "conversationId", "conversation_id"]),
  };
}

const normType = (t) => (t ? String(t).toUpperCase() : "GENERAL");

/* ── تطبيع المسار (توحيده مع راوتات الفرونت) ── */

function normalizeActionUrl(url, role) {
  if (!url || typeof url !== "string") return null;
  let p = url.trim();
  if (!p.startsWith("/")) p = "/" + p;

  // قص trailing slash
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);

  // ✅ تطبيع حسب الدور
  if (role === "customer") {
    // /orders/xxx  →  /my-orders/xxx
    if (p.startsWith("/orders/") && !p.startsWith("/my-orders/")) {
      p = "/my-orders" + p.slice("/orders".length);
    }
    // /conversations/xxx  →  /messages?conversationId=xxx
    if (p.startsWith("/conversations/")) {
      const convId = p.slice("/conversations/".length);
      return `/messages?conversationId=${convId}`;
    }
  } else if (role === "seller") {
    // /conversations/xxx  →  /seller/messages?conversationId=xxx
    if (p.startsWith("/conversations/")) {
      const convId = p.slice("/conversations/".length);
      return `/seller/messages?conversationId=${convId}`;
    }
    // /products/xxx  →  /seller/products
    if (p === "/products" || p.startsWith("/products?")) {
      return "/seller/products";
    }
    // /orders/xxx  →  /seller/orders/xxx
    if (p.startsWith("/orders/") && !p.startsWith("/seller/orders/")) {
      p = "/seller/orders" + p.slice("/orders".length);
    }
    // /messages/xxx  →  /seller/messages
    if (p.startsWith("/messages")) {
      p = "/seller/messages";
    }
    // /ratings  →  /seller/ratings
    if (p === "/ratings" || p === "/ratings/") {
      return "/seller/ratings";
    }
    // /notifications  →  /seller/notifications
    if (p === "/notifications" || p === "/notifications/") {
      return "/seller/notifications";
    }
    // /profile/customer/xxx  →  /customer/profile/xxx (public view)
    if (p.startsWith("/profile/customer/")) {
      return p.replace("/profile/customer/", "/customer/profile/");
    }
  }

  return p;
}

/* ── Resolver الرئيسي ── */

function appendQuery(path, params) {
  if (!params || Object.keys(params).length === 0) return path;
  const [base, existing] = path.split("?");
  const search = new URLSearchParams(existing || "");
  for (const [k, v] of Object.entries(params)) {
    if (v != null) search.set(k, String(v));
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Resolver المسار حسب الدور.
 *
 * @param {Object} notif — الإشعار (من الباك)
 * @param {"customer"|"seller"} role — الدور الحالي
 * @returns {{ path: string, label: string, key: string } | null}
 */
export function resolveNotificationRoute(notif, role) {
  if (!notif || !role) return null;
  const t = normType(notif.type);

  /* ── 1) إشعار "تقييم/مراجعة" — توجيه دقيق حسب الدور ──
     ✅ الزبون: روح على صفحة المنتج (public) مع ?reviewId=xxx
        → CustomerProductDetails يقرأ الـ reviewId من URL ويمرره كـ highlightReviewId
          لـ BuyerProductReviewsSection → useEffect بيعمل scrollIntoView للتقييم المحدد
     ✅ البائع: روح على ProductDetailsModal للمنتج مباشرة عبر /seller/products?productId=xxx
        → ProductsList عنده useEffect بيشوف ?productId= في URL ويفتح ProductDetailsModal تلقائياً
        → البائع يشوف تفاصيل المنتج + التقييم + باقي التقييمات
        (لأن /product/:id محمي بـ RequireCustomer — البائع ما يقدر يفتحه)
     ✅ Fallback (لو ما في productId):
        - البائع → /seller/ratings (قسم "تقييمات المتجر" الرئيسي)
        - الزبون → /products
  */
  if (t === "REVIEW" || t === "REVIEW_REPLY" || t === "RATING") {
    const review = getReview(notif);
    const product = getProduct(notif);

    // ✅ الزبون + يوجد productId → صفحة المنتج (عامة)
    if (role === "customer" && product?.id) {
      const path = appendQuery(
        `/product/${product.id}`,
        review?.id ? { reviewId: review.id } : null
      );
      return {
        path,
        label: "عرض التقييم",
        key: "review",
      };
    }

    // ✅ البائع + يوجد productId → فتح ProductDetailsModal مباشرة
    //    (/seller/products?productId=xxx بيشغّل المودال تلقائياً عبر ProductsList)
    if (role === "seller" && product?.id) {
      const path = appendQuery("/seller/products", { productId: product.id });
      return {
        path,
        label: "عرض تفاصيل المنتج",
        key: "review-product-modal",
      };
    }

    // ⚠️ Fallback: ما في productId — نتجه لقسم التقييمات الرئيسي
    if (role === "seller") {
      // البائع: قسم "تقييمات المتجر" الرئيسي (ممكن مع highlight لو في reviewId)
      const path = appendQuery(
        "/seller/ratings",
        review?.id ? { reviewId: review.id } : null
      );
      return {
        path,
        label: "تقييمات المتجر",
        key: "ratings-list",
      };
    }
    // الزبون: صفحة المنتجات الرئيسية
    return { path: "/products", label: "المنتجات", key: "products-list" };
  }

  /* ── 2) إشعار "رسالة/محادثة" → روح على الرسائل ── */
  if (t === "MESSAGE" || t === "CONVERSATION" || t === "CHAT") {
    const msg = getMessage(notif);
    if (msg?.id) {
      return {
        path:
          role === "customer"
            ? `/messages?conversationId=${msg.id}`
            : `/seller/messages?conversationId=${msg.id}`,
        label: "فتح المحادثة",
        key: "open-conversation",
      };
    }
    // fallback
    return {
      path: role === "customer" ? "/messages" : "/seller/messages",
      label: "المراسلات",
      key: "open-messages",
    };
  }

  /* ── 3) لو في actionUrl جاهز من الباك ── */
  if (notif.actionUrl) {
    const target = normalizeActionUrl(notif.actionUrl, role);
    if (target) {
      let label = "عرض التفاصيل";
      if (t === "ORDER" || t === "NEW_ORDER") label = "عرض تفاصيل الطلب";
      else if (t === "PROMOTIONAL") label = "عرض العرض";
      else if (t === "REVIEW" || t === "RATING") label = "عرض التقييم";
      else if (t === "MESSAGE" || t === "CONVERSATION") label = "فتح المحادثة";
      else if (t === "ALERT") label = "عرض التنبيه";
      return { path: target, label, key: "action-url" };
    }
  }

  /* ── 4) fallback حسب النوع + الـ entities المتاحة ── */

  // Order
  const order = getOrder(notif);
  if (order?.id && (t === "ORDER" || t === "NEW_ORDER" || t === "ORDER_UPDATE")) {
    return {
      path:
        role === "customer"
          ? `/my-orders/${order.id}`
          : `/seller/orders/${order.id}`,
      label: "عرض تفاصيل الطلب",
      key: "order",
    };
  }

  // Review (fallback ثانوي — فقط لو ما وصلنا للـ branch الأساسي في الأعلى)
  const review = getReview(notif);
  const product = getProduct(notif);
  if ((review?.id || product?.id) && (t === "REVIEW" || t === "RATING")) {
    if (product?.id) {
      // ✅ الزبون → صفحة المنتج (عامة)
      if (role === "customer") {
        const path = appendQuery(
          `/product/${product.id}`,
          review?.id ? { reviewId: review.id } : null
        );
        return { path, label: "عرض التقييم", key: "review" };
      }
      // ✅ البائع → ProductDetailsModal عبر /seller/products?productId=xxx
      if (role === "seller") {
        const path = appendQuery("/seller/products", { productId: product.id });
        return {
          path,
          label: "عرض تفاصيل المنتج",
          key: "review-product-modal",
        };
      }
    }
  }

  // Sender (store / customer profile)
  const sender = getSender(notif);
  if (sender?.id) {
    if (role === "customer" && t === "ORDER") {
      // ✅ للزبون: لو sender هو البائع → /customer/store/:id
      return {
        path: `/customer/store/${sender.id}`,
        label: "عرض المتجر",
        key: "store",
      };
    }
    if (role === "customer" && t === "REVIEW") {
      // ✅ للزبون: لو sender هو زبون آخر → /customer/profile/:id
      return {
        path: `/customer/profile/${sender.id}`,
        label: "عرض البروفايل",
        key: "customer-profile",
      };
    }
    if (role === "seller" && (t === "ORDER" || t === "REVIEW" || t === "ALERT")) {
      // للبائع: لو sender هو زبون → /customer/profile/:id (public view)
      return {
        path: `/customer/profile/${sender.id}`,
        label: "عرض بروفايل الزبون",
        key: "customer-profile",
      };
    }
  }

  // Product fallback — البائع ما يقدر يفتح /product/:id (محمي بـ RequireCustomer)
  if (product?.id) {
    if (role === "seller") {
      return {
        path: appendQuery("/seller/products", { productId: product.id }),
        label: "عرض تفاصيل المنتج",
        key: "product",
      };
    }
    return {
      path: `/product/${product.id}`,
      label: "عرض المنتج",
      key: "product",
    };
  }

  // Final fallback حسب النوع
  if (t === "ORDER" || t === "NEW_ORDER") {
    return {
      path: role === "customer" ? "/my-orders" : "/seller/orders",
      label: "الطلبات",
      key: "orders-list",
    };
  }
  if (t === "PROMOTIONAL" || t === "OFFER") {
    return {
      path: role === "customer" ? "/products" : "/seller/products",
      label: "العروض",
      key: "products-list",
    };
  }
  if (t === "REVIEW" || t === "RATING") {
    return {
      path: role === "customer" ? "/products" : "/seller/ratings",
      label: "التقييمات",
      key: "ratings-list",
    };
  }
  if (t === "MESSAGE" || t === "CONVERSATION") {
    return {
      path: role === "customer" ? "/messages" : "/seller/messages",
      label: "المراسلات",
      key: "messages",
    };
  }
  // GENERAL / SYSTEM
  return {
    path: role === "customer" ? "/home/customer" : "/seller/dashboard",
    label: "الرئيسية",
    key: "home",
  };
}

/* ── Helper لتحديد لو الإشعار يخص الدور الحالي ── */

// ✅ استيراد من المصدر الموحّد (نفس الدالة في notificationRoleFilter.js)
//    هاد بيبني عزل صارم بـ 4 طبقات (type, actionUrl, recipient, keywords).
import { isNotificationForRole as _isNotificationForRole } from "./notificationRoleFilter";

/**
 * ✅ في النسخة القديمة كان بيرجّع true دائماً (معتمد على فلترة الـ
 *    endpoint بس). هاد كان نقطة الفشل اللي سمحت بتسرب إشعارات البائع
 *    لواجهة المشتري.
 *
 * 🔒 الآن بنرجّع false لو الإشعار ما يخص الدور المطلوب — باستخدام
 *    `notificationRoleFilter.js` اللي فيه 4 طبقات فحص.
 */
export function isNotificationForRole(notif, role) {
  return _isNotificationForRole(notif, role);
}
