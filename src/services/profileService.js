import api from "../utils/api";

// جلب بيانات بروفايل البائع (اسم المتجر، الوصف، المعلومات الشخصية، التقييم...)
export async function getSellerProfile() {
  const res = await api.get("/api/seller/profile");
  return res.data;
}

/**
 * GET /api/profile/customer/:customerId  (public)
 * بروفايل المشتري العمومي — أي سيلر أو كاستمر يقدر يفوت عليه يشوف سمعة الزبون
 *
 *  Response shape المؤكّد من Postman:
 *  {
 *    status: "success",
 *    data: {
 *      customer: {
 *        id, firstName, lastName, avatar,
 *        memberSince: ISO string,
 *        isTrustedBuyer: boolean,
 *        actionUrl: "/profile/customer/{id}"
 *      },
 *      stats: {
 *        completedOrders: number,
 *        totalReviews: number,
 *        averageRating: number,
 *        completionRate: number  ← نسبة مئوية (0..100)
 *      },
 *      shopping: {
 *        topCategories: [{ id, name }],
 *        lastOrderAt: ISO string | null
 *      },
 *      sellerReviews: {
 *        averageRating: number,
 *        totalReviews: number,
 *        preview: [
 *          {
 *            id, rating, comment, createdAt,
 *            seller: { id, storeName, avatar, actionUrl },
 *            product: { id, name, image }
 *          }
 *        ]
 *      }
 *    }
 *  }
 */
export async function getPublicCustomerProfile(customerId) {
  if (!customerId) throw new Error("customerId is required");
  const res = await api.get(`/api/profile/customer/${customerId}`);
  return res.data?.data ?? res.data;
}

// تعديل بيانات بروفايل البائع
// formDataObj: { storeName, storeDescription, street, firstName, lastName, phone, avatarFile }
// كل الحقول اختيارية — فقط الحقول الممرَّرة (غير فارغة) بتتبعت
export async function updateSellerProfile(formDataObj) {
  const fd = new FormData();

  if (formDataObj.storeName) fd.append("storeName", formDataObj.storeName);
  if (formDataObj.storeDescription) fd.append("storeDescription", formDataObj.storeDescription);
  if (formDataObj.street) fd.append("street", formDataObj.street);
  if (formDataObj.firstName) fd.append("firstName", formDataObj.firstName);
  if (formDataObj.lastName) fd.append("lastName", formDataObj.lastName);
  if (formDataObj.phone) fd.append("phone", formDataObj.phone);
  if (formDataObj.avatarFile) fd.append("avatar", formDataObj.avatarFile);

  // نلغي الـ Content-Type الافتراضي (application/json) لهاد الطلب تحديداً
  // عشان axios يحط multipart/form-data مع الـ boundary الصحيح تلقائياً
  const res = await api.put("/api/seller/profile", fd, {
    headers: { "Content-Type": undefined },
  });
  return res.data;
}

// تغيير كلمة مرور البائع
export async function changeSellerPassword(payload) {
  const res = await api.put("/api/seller/profile/changePassword", payload);
  return res.data;
}