// src/context/AuthContext.jsx
//
// Context مركزي لإدارة:
//   1) بيانات المستخدم (user object) — فيه hasSellerProfile / hasCustomerProfile
//   2) الدور الحالي (currentRole): "customer" أو "seller"
//   3) الـ tokens + user المخزّن بـ localStorage
//
// 🔑 المعمارية:
//
//   1) Bootstrap sync (لحظة فتح التطبيق):
//      - بنقرأ user + tokens من localStorage بشكل sync
//      - إذا في token بس user ناقص (حالة قديمة) → بنعمل bootstrap
//        عبر fetchProfileFlags() (نطلب /api/seller/profile و /api/profile/customer)
//        لتحديد hasSellerProfile / hasCustomerProfile، ونعمل refresh token
//        مرة وحدة لتجديد الـ access token.
//
//   2) Mutations (login / become-seller / switch-role / become-customer):
//      - بتحدّث localStorage + React state + بتطلق AUTH_CHANGED_EVENT
//      - كل المكونات بتعمل re-render بنفس اللحظة بدون page reload
//
//   3) الـ public API:
//      const { user, currentRole, hasSellerProfile, hasCustomerProfile,
//              isAuthenticated, isBootstrapping,
//              login, becomeSeller, becomeCustomer, switchRole, logout,
//              refreshSession,
//              isSwitchingRole, isBecomingSeller, isBecomingCustomer,
//              error, clearError } = useAuth();

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  submitBecomeSeller,
  switchUserRole,
  submitBecomeCustomer,
  fetchProfileFlags,
} from "../services/roleService";
import { decodeJwt } from "../utils/jwt";

// ✅ Lazy load: بنستوردهم بس وقت الاستخدام (عشان ما نكسر SSR / التست)
async function getSocketHelpers() {
  try {
    return await import("../utils/socket");
  } catch {
    return null;
  }
}

/**
 * ✅ Helper: نضمن إنو socket disconnected/reconnected مع الـ token الجديد.
 * مهم جداً بعد أي role switch (become-seller / switch-role / become-customer)
 * لأن الباك بيحط الـ userId بـ JWT، فلازم الـ socket ياخد token جديد.
 */
async function reconnectSocketSafely() {
  const helpers = await getSocketHelpers();
  if (!helpers) return;
  try {
    helpers.disconnectSocket();
  } catch {
    /* ignore */
  }
  // نأخر شوي عشان الباك يحدّث الـ session
  await new Promise((resolve) => setTimeout(resolve, 100));
  try {
    helpers.connectSocket();
  } catch {
    /* ignore */
  }
}

// ── مفاتيح التخزين — نفس الأسماء المستخدمة بباقي المشروع ──
const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const USER_TYPE_KEY = "userType";
const SELLER_ID_KEY = "sellerId"; // بنخزّنه للمشتري لما يفتح متجر بائع
// الحدث اللي بيطلقه utils/authSession.js بعد كل save/clear
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

function readTokenFromStorage() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

// الدور الفعّال: user.role (من الباك) أو "customer" كـ fallback
function resolveRole(user) {
  return user?.role || "customer";
}

// حفظ/تحديث الجلسة: localStorage + React state
function applySessionToState(setUserState, setCurrentRole, finalUser) {
  if (!finalUser) return;
  localStorage.setItem(USER_KEY, JSON.stringify(finalUser));
  if (finalUser.role) localStorage.setItem(USER_TYPE_KEY, finalUser.role);
  setUserState(finalUser);
  setCurrentRole(resolveRole(finalUser));
}

export function AuthProvider({ children }) {
  // ── الإقلاع: قراءة sync من localStorage فقط ──
  const [user, setUserState] = useState(readUserFromStorage);
  const [currentRole, setCurrentRole] = useState(() =>
    resolveRole(readUserFromStorage())
  );
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [switchingToRole, setSwitchingToRole] = useState(null); // ✅ "customer" | "seller" | null
  const [isBecomingSeller, setIsBecomingSeller] = useState(false);
  const [isBecomingCustomer, setIsBecomingCustomer] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [error, setError] = useState(null);

  // نمنع تكرار bootstrap في نفس الجلسة
  const bootstrapRanRef = useRef(false);

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
    ({ user: newUser, accessToken, refreshToken, sellerId } = {}) => {
      // التوكنات: لو ما وصلوا مع الطلب، حافظ على القديم
      if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      if (sellerId) localStorage.setItem(SELLER_ID_KEY, sellerId);

      // الـ user: إما الجديد من الباك، أو القديم من localStorage
      const finalUser = newUser ?? readUserFromStorage();
      if (finalUser) {
        applySessionToState(setUserState, setCurrentRole, finalUser);
      }
    },
    []
  );

  /**
   * ✅ Public API: login({ user, accessToken, refreshToken? })
   *
   * استدعيها فوراً بعد نجاح أي login API (customer/seller، local/google).
   * بتحدّث localStorage + React state + بتطلق الحدث للمزامنة الفورية.
   */
  const login = useCallback(
    ({ user: newUser, accessToken, refreshToken } = {}) => {
      if (!newUser) {
        console.warn("[AuthContext] login() requires a user object");
        return;
      }
      persistSession({ user: newUser, accessToken, refreshToken });
      setError(null);
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    },
    [persistSession]
  );

  /**
   * ✅ جديد: refreshSession()
   *
   * بيفحص الـ session الحالي مع الباك. مفيد بـ 3 حالات:
   *   1) الإقلاع: لو localStorage فيه user ناقص الـ flags → بنجيبها
   *   2) بعد ما يصير بائع: للتأكد إن الـ flags صاروا true عند الباك
   *   3) عند الـ 401 من الباك: لتجديد الـ token (لما الـ refresh ما اشتغل)
   *
   * بيرجّع object فيه { hasSellerProfile, hasCustomerProfile, user }.
   */
  const refreshSession = useCallback(async () => {
    const token = readTokenFromStorage();
    if (!token) return null;

    setIsBootstrapping(true);
    try {
      const flags = await fetchProfileFlags();
      if (!flags) {
        // التوكن منتهي أو في مشكلة كبيرة
        return null;
      }

      const currentUser = readUserFromStorage() || {};
      const mergedUser = {
        ...currentUser,
        ...flags,
      };
      persistSession({ user: mergedUser });
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      return mergedUser;
    } catch (err) {
      console.warn("[AuthContext] refreshSession failed:", err?.message);
      return null;
    } finally {
      setIsBootstrapping(false);
    }
  }, [persistSession]);

  // ── Bootstrap تلقائي: لحظة فتح التطبيق إذا في token بس user محدود ──
  useEffect(() => {
    const token = readTokenFromStorage();
    const cachedUser = readUserFromStorage();

    // شروط تشغيل الـ bootstrap:
    //   1) في token
    //   2) الـ user موجود بس ناقص flags (النسخ القديمة من الكود ما كانت تخزّنهم)
    //   3) ما اشتغل قبل بـ نفس الجلسة
    const needsBootstrap =
      Boolean(token) &&
      Boolean(cachedUser) &&
      cachedUser.hasSellerProfile === undefined &&
      cachedUser.hasCustomerProfile === undefined &&
      !bootstrapRanRef.current;

    if (!needsBootstrap) return;
    bootstrapRanRef.current = true;
    refreshSession();
  }, [refreshSession]);

  /**
   * تحويل حساب "مشتري" إلى "بائع" لأول مرة.
   * الباك بيرجّع accessToken + user جديد (role=seller, hasSellerProfile=true)
   * حسب Postman: { data: { accessToken, user: { role, hasSellerProfile, ... }, reconnectSocket } }
   *
   * ✅ 409 Fallback (شفاف للمستخدم):
   *    لو الباك رجّع 409 "Already a seller" → بنصلّح hasSellerProfile=true
   *    محلياً + بنعمل switch-role لضمان تحديث الـ role/token.
   *
   * ⚠️ ما عاد في fallback تلقائي لـ switch-role بعد النجاح لأن الباك
   *    بيرجّع accessToken دائماً (مؤكّد من Postman).
   */
  const becomeSeller = useCallback(
    async (storeData) => {
      setIsBecomingSeller(true);
      setSwitchingToRole("seller"); // ✅ تتبّع الـ target = seller للـ overlay
      setError(null);
      try {
        const result = await submitBecomeSeller(storeData);
        // user من الباك هو مصدر الحقيقة — فيه role + hasSellerProfile + hasCustomerProfile
        const nextUser = {
          ...(result.user || {}),
          hasSellerProfile: true,
          // إذا الباك ما رجّع hasCustomerProfile، نحتفظ بالقديم (إن وُجد)
          hasCustomerProfile:
            result.user?.hasCustomerProfile ??
            readUserFromStorage()?.hasCustomerProfile ??
            true,
        };

        if (!result.accessToken) {
          // eslint-disable-next-line no-console
          console.warn(
            "[AuthContext] become-seller ما رجّع accessToken — بنحاول switch-role"
          );
          try {
            const switchRes = await switchUserRole("seller");
            if (switchRes.user) {
              Object.assign(nextUser, switchRes.user);
            }
            persistSession({
              user: nextUser,
              accessToken: switchRes.accessToken,
              refreshToken: switchRes.refreshToken,
            });
            // ✅ reconnect socket بالـ token الجديد
            await reconnectSocketSafely();
            return {
              user: nextUser,
              reconnectSocket: true,
            };
          } catch (switchErr) {
            // eslint-disable-next-line no-console
            console.error(
              "[AuthContext] switch-role بعد become-seller فشل:",
              switchErr
            );
            // نكمل بدون token جديد — الباك رح يرفض بـ 403 إذا الـ token القديم
            // لـ customer، والـ user رح يحتاج يعمل logout/login يدوياً
          }
        } else {
          persistSession({
            user: nextUser,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          });
        }

        // ── تحقق إضافي: لو عندنا token، نتأكد إنه فيه role=seller ──
        const finalToken = localStorage.getItem(TOKEN_KEY);
        if (finalToken) {
          const decoded = decodeJwt(finalToken);
          if (decoded?.role && decoded.role !== "seller") {
            // eslint-disable-next-line no-console
            console.warn(
              `[AuthContext] ⚠️ الـ accessToken فيه role="${decoded.role}" بدال "seller" — هذا غريب`
            );
          }
        }

        // ✅ دائماً بنعمل reconnect socket بعد become-seller
        await reconnectSocketSafely();
        return { user: nextUser, reconnectSocket: true };
      } catch (err) {
        // ✅ 409 "Already a seller" — state محلي قديم، نصلّحه تلقائياً
        if (err?.response?.status === 409) {
          const currentUser = user ?? readUserFromStorage();
          const fixedUser = {
            ...currentUser,
            hasSellerProfile: true,
          };

          // (1) نحدّث hasSellerProfile في state + localStorage فوراً
          persistSession({ user: fixedUser });

          // (2) نستدعي switch-role عشان ياخد role + token محدّث
          try {
            const switchResult = await switchUserRole("seller");
            const finalUser = {
              ...(switchResult.user || {}),
              ...fixedUser,
            };
            persistSession({
              user: finalUser,
              accessToken: switchResult.accessToken,
              refreshToken: switchResult.refreshToken,
            });
            // ✅ reconnect socket بالـ token الجديد
            await reconnectSocketSafely();
            return {
              user: finalUser,
              reconnectSocket: true,
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
        setSwitchingToRole(null);
      }
    },
    [user, persistSession]
  );

  /**
   * تبديل الدور بين "seller" و"customer".
   * ⚠️ يفترض أن الـ profile المطلوب موجود.
   *    الـ Smart gate (RequireSeller / Smart button) هو المسؤول عن هاد.
   */
  const switchRole = useCallback(
    async (role) => {
      if (role !== "seller" && role !== "customer") {
        throw new Error('role يجب أن يكون "seller" أو "customer" فقط');
      }
      if (role === currentRole) {
        return { user, reconnectSocket: false };
      }

      setIsSwitchingRole(true);
      setSwitchingToRole(role); // ✅ تتبّع الـ target role للـ overlay
      setError(null);
      try {
        const result = await switchUserRole(role);
        const nextUser = {
          ...(readUserFromStorage() || {}),
          ...(result.user || {}),
        };
        persistSession({
          user: nextUser,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        // ✅ reconnect socket بالـ token الجديد (مهم جداً)
        await reconnectSocketSafely();
        return { user: nextUser, reconnectSocket: true };
      } catch (err) {
        setError(
          err?.response?.data?.data?.message ||
            err?.response?.data?.message ||
            "تعذّر تبديل الدور، حاول مرة أخرى"
        );
        throw err;
      } finally {
        setIsSwitchingRole(false);
        setSwitchingToRole(null);
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
    setSwitchingToRole("customer"); // ✅ الـ target = customer
    setError(null);
    try {
      const result = await submitBecomeCustomer();
      const nextUser = {
        ...(readUserFromStorage() || {}),
        ...(result.user || {}),
      };
      persistSession({
        user: nextUser,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      // ✅ reconnect socket بالـ token الجديد
      await reconnectSocketSafely();
      return { user: nextUser, reconnectSocket: true };
    } catch (err) {
      setError(
        err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          "تعذّر التحويل لمشتري، حاول مرة أخرى"
      );
      throw err;
    } finally {
      setIsBecomingCustomer(false);
      setSwitchingToRole(null);
    }
  }, [persistSession]);

  /** تسجيل الخروج — محلي فقط، الـ API call بيسويه الـ component */
  const logout = useCallback(() => {
    // ✅ نقفل الـ socket فوراً — حتى ما يستمر بإرسال events لليوزر بعد logout
    getSocketHelpers().then((helpers) => {
      try {
        helpers?.disconnectSocket();
      } catch {
        /* ignore */
      }
    });

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_TYPE_KEY);
    localStorage.removeItem(SELLER_ID_KEY);
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
      hasCustomerProfile:
        user?.hasCustomerProfile === undefined
          ? null // مجهول — ما بنفترض true ولا false
          : Boolean(user.hasCustomerProfile),
      isAuthenticated: Boolean(user),
      isBootstrapping,
      isSwitchingRole,
      switchingToRole, // ✅ الـ target role للـ RoleSwitchOverlay
      isBecomingSeller,
      isBecomingCustomer,
      error,
      clearError: () => setError(null),
      login,
      becomeSeller,
      becomeCustomer,
      switchRole,
      logout,
      refreshSession,
    }),
    [
      user,
      currentRole,
      isBootstrapping,
      isSwitchingRole,
      switchingToRole, // ✅ الـ target role للـ RoleSwitchOverlay
      isBecomingSeller,
      isBecomingCustomer,
      error,
      login,
      becomeSeller,
      becomeCustomer,
      switchRole,
      logout,
      refreshSession,
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
