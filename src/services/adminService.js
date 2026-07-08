import api from "../utils/api";

/**
 * تغيير كلمة سر الأدمن
 * ⚠️ الـ endpoint مؤقت لحد ما يجهز الـ Postman من نور، عدّليه بعدين لو الاسم مختلف
 * body متوقع: { oldPassword, newPassword }
 */
export const changeAdminPassword = async ({ oldPassword, newPassword }) => {
  try {
    const res = await api.put("/admin/change-password", {
      oldPassword,
      newPassword,
    });
    return res.data;
  } catch (error) {
    console.error("changeAdminPassword error:", error);
    throw error;
  }
};

/**
 * جلب إعدادات الإشعارات الحالية للأدمن
 * ⚠️ endpoint مؤقت
 */
export const getNotificationSettings = async () => {
  try {
    const res = await api.get("/admin/notifications/settings");
    return res.data;
  } catch (error) {
    console.error("getNotificationSettings error:", error);
    // fallback مؤقت لحد ما يجهز الباكند
    return {
      emailNotifications: true,
      instantNotifications: false,
      orderNotifications: true,
      promoNotifications: false,
      systemNotifications: true,
    };
  }
};

/**
 * تحديث إعدادات الإشعارات
 * ⚠️ endpoint مؤقت
 */
export const updateNotificationSettings = async (settings) => {
  try {
    const res = await api.put("/admin/notifications/settings", settings);
    return res.data;
  } catch (error) {
    console.error("updateNotificationSettings error:", error);
    throw error;
  }
};

/**
 * جلب بيانات الملف الشخصي للأدمن
 * ⚠️ endpoint مؤقت لحد ما يجهز الباكند من نور
 */
export const getAdminProfile = async () => {
  try {
    const res = await api.get("/admin/profile");
    return res.data;
  } catch (error) {
    console.error("getAdminProfile error:", error);
    throw error;
  }
};

/**
 * تحديث بيانات الملف الشخصي للأدمن
 * ⚠️ endpoint مؤقت
 */
export const updateAdminProfile = async (profileData) => {
  try {
    const res = await api.put("/admin/profile", profileData);
    return res.data;
  } catch (error) {
    console.error("updateAdminProfile error:", error);
    throw error;
  }
};
/**
 * جلب تنبيهات الأدمن
 * ⚠️ endpoint مؤقت
 */
export const getAdminNotifications = async () => {
  try {
    const res = await api.get("/admin/notifications");
    return res.data;
  } catch (error) {
    console.error("getAdminNotifications error:", error);
    throw error;
  }
};

/**
 * تعليم تنبيه واحد كمقروء
 */
export const markNotificationRead = async (id) => {
  try {
    const res = await api.put(`/admin/notifications/${id}/read`);
    return res.data;
  } catch (error) {
    console.error("markNotificationRead error:", error);
    throw error;
  }
};

/**
 * تعليم كل التنبيهات كمقروءة
 */
export const markAllNotificationsRead = async () => {
  try {
    const res = await api.put("/admin/notifications/read-all");
    return res.data;
  } catch (error) {
    console.error("markAllNotificationsRead error:", error);
    throw error;
  }
};

/**
 * حذف/إخفاء تنبيه
 */
export const dismissNotification = async (id) => {
  try {
    const res = await api.delete(`/admin/notifications/${id}`);
    return res.data;
  } catch (error) {
    console.error("dismissNotification error:", error);
    throw error;
  }
};
/**
 * جلب بيانات التقارير والتحليلات
 * ⚠️ endpoint مؤقت، period: '7d' | '30d' | '3m' | 'year'
 */
export const getAdminReports = async (period = '7d') => {
  try {
    const res = await api.get(`/admin/reports?period=${period}`);
    return res.data;
  } catch (error) {
    console.error("getAdminReports error:", error);
    throw error;
  }
};
/**
 * جلب كل التصنيفات
 * ⚠️ endpoint مؤقت
 */
export const getAdminCategories = async () => {
  try {
    const res = await api.get("/admin/categories");
    return res.data;
  } catch (error) {
    console.error("getAdminCategories error:", error);
    throw error;
  }
};

/**
 * إضافة تصنيف جديد
 */
export const addAdminCategory = async (name) => {
  try {
    const res = await api.post("/admin/categories", { name });
    return res.data;
  } catch (error) {
    console.error("addAdminCategory error:", error);
    throw error;
  }
};

/**
 * تعديل تصنيف
 */
export const updateAdminCategory = async (id, name) => {
  try {
    const res = await api.put(`/admin/categories/${id}`, { name });
    return res.data;
  } catch (error) {
    console.error("updateAdminCategory error:", error);
    throw error;
  }
};

/**
 * حذف تصنيف
 */
export const deleteAdminCategory = async (id) => {
  try {
    const res = await api.delete(`/admin/categories/${id}`);
    return res.data;
  } catch (error) {
    console.error("deleteAdminCategory error:", error);
    throw error;
  }
};
/**
 * جلب كل المستخدمين
 * ⚠️ endpoint مؤقت
 */
export const getAdminUsers = async () => {
  try {
    const res = await api.get("/admin/users");
    return res.data;
  } catch (error) {
    console.error("getAdminUsers error:", error);
    throw error;
  }
};

/**
 * تفعيل / تعطيل مستخدم
 */
export const toggleUserStatus = async (id, isActive) => {
  try {
    const res = await api.put(`/admin/users/${id}/status`, { isActive });
    return res.data;
  } catch (error) {
    console.error("toggleUserStatus error:", error);
    throw error;
  }
};
/**
 * جلب بيانات لوحة التحكم الرئيسية
 * ⚠️ endpoint مؤقت
 */
export const getAdminDashboard = async () => {
  try {
    const res = await api.get("/admin/dashboard");
    return res.data;
  } catch (error) {
    console.error("getAdminDashboard error:", error);
    throw error;
  }
};