import { useAuth } from "../context/AuthContext";
import RoleSwitchOverlay from "./RoleSwitchOverlay";

/**
 * RoleSwitchListener
 * ─────────────────────────────────────────────────────────
 * يقرأ حالة `isSwitchingRole` / `isBecomingCustomer` / `isBecomingSeller`
 * من الـ AuthContext، ويعرض `<RoleSwitchOverlay />` لما يصير في تبديل.
 *
 * الـ overlay بيظهر فورياً قبل ما الـ API call ينتهي — يضمن:
 *   - الـ transition من customer → seller (أو العكس) يطلع سلس
 *   - مفيش layout shift
 *   - الـ navbar القديم ما يختفي فجأة والـ navbar الجديد ما يظهر فوقه
 *
 * الاستخدام: ضيفه مرة واحدة في App.jsx (برّا الـ Routes).
 */
export default function RoleSwitchListener() {
  const {
    isSwitchingRole,
    switchingToRole,
    isBecomingCustomer,
    isBecomingSeller,
    currentRole,
  } = useAuth();

  // ✅ نحدد الـ target role:
  //    - switchingToRole (من switchRole / becomeCustomer)
  //    - أو "seller" لو isBecomingSeller (POST /api/auth/become-seller)
  //    - أو "customer" لو isBecomingCustomer
  //    - أو currentRole الحالي (fallback قبل ما الـ target يتحدّد)
  let targetRole = switchingToRole;
  let active = isSwitchingRole || isBecomingCustomer || isBecomingSeller;

  if (!targetRole) {
    if (isBecomingSeller) targetRole = "seller";
    else if (isBecomingCustomer) targetRole = "customer";
    else targetRole = currentRole || "customer";
  }

  return <RoleSwitchOverlay active={active} role={targetRole} />;
}
