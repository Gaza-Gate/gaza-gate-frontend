import { Navigate, useParams } from "react-router-dom";
import { storeProfilePath } from "../utils/sellerHelpers";

/**
 * LegacyStoreRedirect — الرابط القديم للمتجر "/store/:sellerId"
 * (كان الباك يبعته بروابط المشاركة، وممكن يكون منشور على السوشيال)
 * → بنحوّله لصفحة المتجر العامة للمشتري، نفس الرابط اللي بيستخدمه الـ QR.
 *
 * ⚠️ لازم يضل موجود حتى لو ما حدا بيولّد هالرابط هلأ — الروابط القديمة
 *    المنشورة ما لازم تخرب.
 */
export default function LegacyStoreRedirect() {
  const { sellerId } = useParams();
  return <Navigate to={storeProfilePath(sellerId) || "/home/customer"} replace />;
}
