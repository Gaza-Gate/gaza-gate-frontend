// src/context/AuthContext.jsx
//
// Context مركزي لإدارة:
//   1) بيانات المستخدم (user object) — فيه hasSellerProfile / hasCustomerProfile
//   2) الدور الحالي (currentRole): "customer" أو "seller"
//   3) الـ tokens + user المخزّن بـ localStorage
//
// Constraint معماري مهم:
//   ❌ ما في /api/auth/me ولا أي fetch للإقلاع
//   ✅ بنقرأ الـ user + tokens من localStorage بشكل sync لحظة الـ mount
//   ✅ أي تحديث للجلسة (login / switch / become-seller) لازم يعدّي على
//      localStorage و React state معاً → في اللحظة نفسها
//
// الـ public API:
//
//   const { user, currentRole, hasSellerProfile, hasCustomerProfile,
//           isAuthenticated,
//           login, becomeSeller, becomeCustomer, switchRole, logout,
//           isSwitchingRole, isBecomingSeller, isBecomingCustomer,
//           error, clearError } = useAuth();
//
//   login({ user, accessToken })   ← بعد نجاح أي login API
//   becomeSeller({ storeName, storeDescription })   ← أول مرة يصير بائع
//   becomeCustomer()               ← بائع يطلب التحويل لمشتري
//   switchRole("seller" | "customer")  ← يفترض أن الـ profile المطلوب موجود
//                                        (الـ smart check بالـ SwitchRoleButton)

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  submitBecomeSeller,
  switchUserRole,
  submitBecomeCustomer,
} from "../services/roleService";

// ── مفاتيح التخزين — نفس الأسماء المستخدمة بباقي المشروع ──
const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const USER_TYPE_KEY = "userType";
// الحدث اللي بيطلقه utils/authSession.js بعد كل save/clear
// (وأيضاً نطلقه من login() لضمان مزامنة فورية)
const AUTH_CHANGED_EVENT = "gaza-gate-auth-changed";

const AuthContext = createContext(null);

// ── Helpers ──
function readUserFromStorage() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// الدور الفعّال: user.currentRole (لو حدا ضافه محلياً) أو user.role (من الباك) أو "customer"
function resolveRole(user) {
  return user?.currentRole || user?.role || "customer";
}

// حفظ/تحديث الجلسة: localStorage + React state
// (تستخدم داخلياً من login/becomeSeller/switchRole/becomeCustomer)
function applySessionToState(setUserState, setCurrentRole, finalUser) {
  if (!finalUser) return;
  localStorage.setItem(USER_KEY, JSON.stringify(finalUser));
  if (finalUser.role) localStorage.setItem(USER_TYPE_KEY, finalUser.role);
  setUserState(finalUser);
  setCurrentRole(resolveRole(finalUser));
}

export function AuthProvider({ children }) {
  // ── الإقلاع: قراءة sync من localStorage فقط — بدون أي /me ولا profile flags ──
  const [user, setUserState] = useState(readUserFromStorage);
  const [currentRole, setCurrentRole] = useState(() =>
    resolveRole(readUserFromStorage())
  );
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isBecomingSeller, setIsBecomingSeller] = useState(false);
  const [isBecomingCustomer, setIsBecomingCustomer] = useState(false);
  const [error, setError] = useState(null);

  // ── مزامنة الـ state مع localStorage (تابات تانية + نفس التاب) ──
  useEffect(() => {
    function syncFromStorage() {
      const freshUser = readUserFromStorage();
      setUserState(freshUser);
      setCurrentRole(resolveRole(freshUser));
    }

    function handleStorageEvent(e) {
      if (e.key === USER_KEY || e.key === TOKEN_KEY || e.key === null) {
        syncFromStorage();
      }
    }

    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener(AUTH_CHANGED_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener(AUTH_CHANGED_EVENT, syncFromStorage);
    };
  }, []);

  /**
   * الدالة الداخلية لحفظ الجلسة. بتاخد user + tokens (اختياري).
   *   - accessToken/refreshToken: لو مش مررنا، بنحتفظ بالقديم من localStorage
   *   - user: مصدر الحقيقة الوحيد للجلسة
   */
  const persistSession = useCallback(
    ({ user: newUser, accessToken, refreshToken } = {}) => {
      // التوكنات: لو ما وصلوا مع الطلب (refresh-only مثلاً)، حافظ على القديم
      if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      // الـ user: إما الجديد من الباك، أو القديم من localStorage
      const finalUser = newUser ?? readUserFromStorage();
      if (finalUser) {
        applySessionToState(setUserState, setCurrentRole, finalUser);
      }
    },
    []
  );

  /**
   * ✅ Public API: login({ user, accessToken })
   *
   * استدعيها فوراً بعد نجاح أي login API (customer/seller، local/google).
   * بتحدّث localStorage + React state + بتطلق الحدث للمزامنة الفورية
   * مع المكونات الأخرى بدون page reload.
   */
  const login = useCallback(
    ({ user: newUser, accessToken } = {}) => {
      if (!newUser) {
        console.warn("[AuthContext] login() requires a user object");
        return;
      }
      persistSession({ user: newUser, accessToken });
      setError(null);
      // إطلاق الحدث يضمن أن أي listener في تابات/مكونات تانية
      // يعمل re-render بنفس اللحظة (بدون ما نستنى React batches)
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    },
    [persistSession]
  );

  /**
   * تحويل حساب "مشتري" إلى "بائع" لأول مرة.
   * الباك بيرجّع accessToken + user جديد (role=seller, hasSellerProfile=true).
   *
   * ✅ 409 Fallback (شفاف للمستخدم):
   *    لو الباك رجّع 409 "Already a seller"، يعني عنده متجر فعلاً بس
   *    الـ state محلي قديم. بنصلّحها تلقائياً:
   *      1) hasSellerProfile = true في state + localStorage
   *      2) نستدعي switch-role عشان ياخد role + token محدّث
   *      3) نرجّع success → الـ caller (ConvertToSeller) يعمل navigate
   *         للوحة البائع بدون ما يشوف أي error.
   */
  const becomeSeller = useCallback(
    async (storeData) => {
      setIsBecomingSeller(true);
      setError(null);
      try {
        const result = await submitBecomeSeller(storeData);
        // user من الباك هو مصدر الحقيقة — فيه role + hasSellerProfile + hasCustomerProfile
        const nextUser = {
          ...result.user,
          hasSellerProfile: true,
        };
        persistSession({
          user: nextUser,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        return { user: nextUser, reconnectSocket: result.reconnectSocket };
      } catch (err) {
        // ✅ 409 "Already a seller" — state محلي قديم، نصلّحه تلقائياً
        if (err?.response?.status === 409) {
          const currentUser = user ?? readUserFromStorage();
          const fixedUser = { ...currentUser, hasSellerProfile: true };

          // (1) نحدّث hasSellerProfile في state + localStorage فوراً
          persistSession({ user: fixedUser });

          // (2) نستدعي switch-role عشان ياخد role + token محدّث
          try {
            const switchResult = await switchUserRole("seller");
            const finalUser = {
              ...switchResult.user,
              hasSellerProfile: true,
            };
            persistSession({
              user: finalUser,
              accessToken: switchResult.accessToken,
              refreshToken: switchResult.refreshToken,
            });
            return {
              user: finalUser,
              reconnectSocket: switchResult.reconnectSocket,
              recoveredFrom409: true,
            };
          } catch (switchErr) {
            // حتى لو switch فشل (network مثلاً) — الـ state المحلي صحيح
            // الباك أكّد إنه بائع، والـ caller رح يوجّه للوحة البائع
            return {
              user: fixedUser,
              reconnectSocket: false,
              recoveredFrom409: true,
              switchFailed: true,
            };
          }
        }

        setError(
          err?.response?.data?.data?.message ||
            err?.response?.data?.message ||
            "حدث خطأ أثناء إنشاء المتجر، حاول مرة أخرى"
        );
        throw err;
      } finally {
        setIsBecomingSeller(false);
      }
    },
    [user, persistSession]
  );

  /**
   * تبديل الدور بين "seller" و"customer".
   * ⚠️ يفترض أن الـ profile المطلوب موجود.
   *    الـ SwitchRoleButton هو اللي بيعمل smart check قبل ما ينادي هاد.
   */
  const switchRole = useCallback(
    async (role) => {
      if (role !== "seller" && role !== "customer") {
        throw new Error('role يجب أن يكون "seller" أو "customer" فقط');
      }
      if (role === currentRole) return { user, reconnectSocket: false };

      setIsSwitchingRole(true);
      setError(null);
      try {
        const result = await switchUserRole(role);
        const nextUser = { ...result.user };
        persistSession({
          user: nextUser,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        return { user: nextUser, reconnectSocket: result.reconnectSocket };
      } catch (err) {
        setError(
          err?.response?.data?.data?.message ||
            err?.response?.data?.message ||
            "تعذّر تبديل الدور، حاول مرة أخرى"
        );
        throw err;
      } finally {
        setIsSwitchingRole(false);
      }
    },
    [currentRole, user, persistSession]
  );

  /**
   * تحويل من "بائع" لمشتري.
   * (POST /api/auth/become-customer) — لو البائع عنده customer profile بالفعل
   * الباك بيرجّع 409، في هالحالة الـ caller بيستخدم switchRole("customer") بدالها.
   */
  const becomeCustomer = useCallback(async () => {
    setIsBecomingCustomer(true);
    setError(null);
    try {
      const result = await submitBecomeCustomer();
      const nextUser = { ...result.user };
      persistSession({
        user: nextUser,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      return { user: nextUser, reconnectSocket: result.reconnectSocket };
    } catch (err) {
      setError(
        err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          "تعذّر التحويل لمشتري، حاول مرة أخرى"
      );
      throw err;
    } finally {
      setIsBecomingCustomer(false);
    }
  }, [persistSession]);

  /** تسجيل الخروج — محلي فقط، الـ API call بيسويه الـ component */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_TYPE_KEY);
    setUserState(null);
    setCurrentRole("customer");
    setError(null);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      user,
      currentRole,
      hasSellerProfile: Boolean(user?.hasSellerProfile),
      hasCustomerProfile: Boolean(user?.hasCustomerProfile),
      isAuthenticated: Boolean(user),
      isSwitchingRole,
      isBecomingSeller,
      isBecomingCustomer,
      error,
      clearError: () => setError(null),
      login,
      becomeSeller,
      becomeCustomer,
      switchRole,
      logout,
    }),
    [
      user,
      currentRole,
      isSwitchingRole,
      isBecomingSeller,
      isBecomingCustomer,
      error,
      login,
      becomeSeller,
      becomeCustomer,
      switchRole,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() لازم تُستخدم جوا <AuthProvider>");
  }
  return ctx;
}
