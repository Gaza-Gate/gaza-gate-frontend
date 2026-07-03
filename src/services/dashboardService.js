import api from "../utils/api";

// جلب بيانات لوحة تحكم البائع (إحصائيات + تقييم المتجر) دفعة واحدة
export async function getSellerDashboard() {
  const res = await api.get("/api/seller/dashboard");
  return res.data;
}