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
//        عبر fetchProfileFlags() لتحديد hasSellerProfile / hasCustomerProfile.
//
//   2) Mutations (login / become-seller / switch-role / become-customer):
//      - بتحدّث localStorage + React state + بتطلق AUTH_CHANGED_EVENT
//      - كل المكونات بتعمل re-render بنفس اللحظة بدون page reload
//      - الـ navigate بيصير بعد ما يخلص await الـ API + يلتقط الـ React state
//        (atomic — ما في race condition بين state و navigation).
//
//   3) الـ public API:
//      const { user, currentRole, hasSellerProfile, hasCustomerProfile,
//              isAuthenticated, isBootstrapping,
//              login, becomeSeller, becomeCustomer, switchRole, switchRoleAndNavigate,
//              logout, refreshSession,
//              isSwitchingRole, isBecomingSeller, isBecomingCustomer,
//              switchingToRole, pendingNavigation,
//              getHomePathForRole, clearRoleCaches,
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
import { decodeJwt, isTokenExpired } from "../utils/jwt";

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
  await new Promise((resolve) => setTimeout(resolve, 120));
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
// ✅ حدث مخصص: بنطلقه بعد أي role switch عشان الـ contexts
//    الثانية (Cart, Wishlist, Notifications) تمسح caches الدور القديم
const ROLE_CACHE_CLEAR_EVENT = "gaza-gate-role-cache-clear";

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

// حفظ/تحديث الجلسة: localStorage + React state (نضمن atomicity)
function applySessionToState(setUserState, setCurrentRole, finalUser) {
  if (!finalUser) return;
  localStorage.setItem(USER_KEY, JSON.stringify(finalUser));
  if (finalUser.role) localStorage.setItem(USER_TYPE_KEY, finalUser.role);
  setUserState(finalUser);
  setCurrentRole(resolveRole(finalUser));
}

/**
 * ✅ يضمن إنو React التقط تحديث الـ state قبل ما الـ await يحل.
 * بنستخدمها بعد setState مباشرة، قبل أي navigate، لتفادي
 * race condition (الـ navigate يصير قبل ما الـ Outlet يرندر
 * بالدور الجديد).
 */
function flushStateUpdates() {
  return new Promise((resolve) => {
    // double rAF: الأول يضمن إن React عمل commit، الثاني يضمن
    // إن الـ DOM وصل للمرحلة اللي نقدر نعمل navigate بعدها بأمان
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
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
  // ✅ نبدأ بـ true عشان حراس المسارات (RequireCustomer/RequireSeller)
  //    ما ياخدوا قرار redirect قبل ما نتحقق من الـ token مع الباك.
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState(null);
  // ✅ الوجهة المعلقة: لما يكون في تبديل دور جارٍ، نخزّن الـ path
  //    اللي لازم نروح له بعد ما يخلص. الـ guards بيستفيدوا منها
  //    عشان يعملوا navigate حتمي بدون انتظار.
  const [pendingNavigation, setPendingNavigation] = useState(null);
  // ✅ Lock: بنمنع تبديلين متوازيين (مثلاً: المستخدم يضغط
  //    الزر مرتين أو auto-switch من RequireSeller + click من Navbar)
  const switchInProgressRef = useRef(false);

  // نمنع تكرار bootstrap في نفس الجلسة
  const bootstrapRanRef = useRef(false);

  // ✅ Latest-ref للـ logout — بنستخدمه بـ refreshSession و mount useEffect
  //    عشان ما نقع بـ TDZ (logout معرّف بعدهم بالملف).
  const logoutRef = useRef(null);

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
   * ✅ مسح caches الخاصة بالدور (cart, wishlist, notifications...).
   * بنطلق event مخصص — الـ contexts الثانية بتسمع له وبتعمل reset.
   * بنستدعيها بعد كل role switch ناجح.
   */
  const clearRoleCaches = useCallback(
    (fromRole, toRole) => {
      try {
        window.dispatchEvent(
          new CustomEvent(ROLE_CACHE_CLEAR_EVENT, {
            detail: { fromRole, toRole, ts: Date.now() },
          })
        );
      } catch {
        /* ignore */
      }
    },
    []
  );

  /**
   * ✅ Public API: login({ user, accessToken, refreshToken? })
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
   * ✅ Public API: refreshSession()
   * بيفحص الـ session الحالي مع الباك. مفيد بـ 3 حالات:
   *   1) الإقلاع: لو localStorage فيه user ناقص الـ flags
   *   2) بعد ما يصير بائع: للتأكد إن الـ flags صاروا true عند الباك
   *   3) عند الـ 401 من الباك
   */
  const refreshSession = useCallback(async () => {
    const token = readTokenFromStorage();
    if (!token) return null;

    if (isTokenExpired(token)) {
      console.info("[AuthContext] refreshSession: token منتهي محلياً → logout");
      logoutRef.current?.();
      return null;
    }

    setIsBootstrapping(true);
    try {
      const flags = await fetchProfileFlags();
      if (!flags) {
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

  // ── Bootstrap تلقائي: لحظة فتح التطبيق ──
  useEffect(() => {
    const token = readTokenFromStorage();
    const cachedUser = readUserFromStorage();

    if (!token && !cachedUser) {
      setIsBootstrapping(false);
      return;
    }

    if (token && isTokenExpired(token)) {
      console.info(
        "[AuthContext] mount: الـ token منتهي محلياً → نمسح الـ session"
      );
      logoutRef.current?.();
      setIsBootstrapping(false);
      return;
    }

    if (!token && cachedUser) {
      console.warn(
        "[AuthContext] mount: في user بدون token → نمسح الـ user"
      );
      setUserState(null);
      setCurrentRole("customer");
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_TYPE_KEY);
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      setIsBootstrapping(false);
      return;
    }

    if (!bootstrapRanRef.current) {
      bootstrapRanRef.current = true;
      refreshSession().finally(() => {
        setIsBootstrapping(false);
      });
    } else {
      setIsBootstrapping(false);
    }
  }, [refreshSession]);

  /**
   * ✅ Public API: getHomePathForRole(role)
   * مسار "البيت" لكل دور. حراس المسارات (RequireSeller/RequireCustomer)
   * و الـ callers بيستخدموه.
   */
  const getHomePathForRole = useCallback((role) => {
    if (role === "seller") return "/seller/dashboard";
    if (role === "customer") return "/home/customer";
    return "/";
  }, []);

  /**
   * تحويل حساب "مشتري" إلى "بائع" لأول مرة.
   * الباك بيرجّع accessToken + user جديد (role=seller, hasSellerProfile=true).
   */
  const becomeSeller = useCallback(
    async (storeData) => {
      // ✅ Lock: بنمنع أي محاولة ثانية (double-click) في نفس اللحظة
      if (switchInProgressRef.current) {
        throw new Error("عملية تحويل قيد التنفيذ، انتظر قليلاً");
      }
      switchInProgressRef.current = true;

      setIsBecomingSeller(true);
      setIsSwitchingRole(true); // ✅ نوحّد العلم — الـ Overlay يسمع الاثنين
      setSwitchingToRole("seller");
      setError(null);
      try {
        const result = await submitBecomeSeller(storeData);
        const nextUser = {
          ...(result.user || {}),
          hasSellerProfile: true,
          hasCustomerProfile:
            result.user?.hasCustomerProfile ??
            readUserFromStorage()?.hasCustomerProfile ??
            true,
        };

        if (!result.accessToken) {
          console.warn(
            "[AuthContext] become-seller ما رجّع accessToken — بنحاول switch-role"
          );
          try {
            const switchRes = await switchUserRole("seller");
            if (switchRes.user) {
              Object.assign(nextUser, switchRes.user);
            }
            // ✅ نضمن role=seller
            nextUser.role = "seller";
            persistSession({
              user: nextUser,
              accessToken: switchRes.accessToken,
              refreshToken: switchRes.refreshToken,
            });
            await flushStateUpdates();
            await reconnectSocketSafely();
            clearRoleCaches("customer", "seller");
            window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
            return {
              user: nextUser,
              reconnectSocket: true,
              role: "seller",
              targetPath: getHomePathForRole("seller"),
            };
          } catch (switchErr) {
            console.error(
              "[AuthContext] switch-role بعد become-seller فشل:",
              switchErr
            );
          }
        } else {
          // ✅ نضمن role=seller حتى لو الباك نسي يحطّه
          nextUser.role = "seller";
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
            console.warn(
              `[AuthContext] ⚠️ الـ accessToken فيه role="${decoded.role}" بدال "seller" — هذا غريب`
            );
          }
        }

        // ✅ atomic: ننتظر React يلتقط الـ state، ثم نـ clear caches + reconnect
        await flushStateUpdates();
        await reconnectSocketSafely();
        clearRoleCaches("customer", "seller");
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
        return {
          user: nextUser,
          reconnectSocket: true,
          role: "seller",
          targetPath: getHomePathForRole("seller"),
        };
      } catch (err) {
        // ✅ 409 "Already a seller" — state محلي قديم، نصلّحه تلقائياً
        if (err?.response?.status === 409) {
          const currentUser = user ?? readUserFromStorage();
          const fixedUser = {
            ...currentUser,
            hasSellerProfile: true,
            role: "seller",
          };

          persistSession({ user: fixedUser });
          await flushStateUpdates();

          try {
            const switchResult = await switchUserRole("seller");
            const finalUser = {
              ...(switchResult.user || {}),
              ...fixedUser,
            };
            finalUser.role = "seller";
            persistSession({
              user: finalUser,
              accessToken: switchResult.accessToken,
              refreshToken: switchResult.refreshToken,
            });
            await flushStateUpdates();
            await reconnectSocketSafely();
            clearRoleCaches("customer", "seller");
            window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
            return {
              user: finalUser,
              reconnectSocket: true,
              recoveredFrom409: true,
              role: "seller",
              targetPath: getHomePathForRole("seller"),
            };
          } catch (switchErr) {
            return {
              user: fixedUser,
              reconnectSocket: false,
              recoveredFrom409: true,
              switchFailed: true,
              role: "seller",
              targetPath: getHomePathForRole("seller"),
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
        setIsSwitchingRole(false);
        setSwitchingToRole(null);
        switchInProgressRef.current = false;
      }
    },
    [user, persistSession, clearRoleCaches, getHomePathForRole]
  );

  /**
   * ✅ Public API: switchRole(role)
   * تبديل الدور بين "seller" و"customer".
   * ⚠️ يفترض أن الـ profile المطلوب موجود.
   * الـ Smart gate (RequireSeller / Smart button) هو المسؤول عن هاد.
   *
   * atomic update: localStorage + state + event + reconnect socket
   * كله بيتحدّث قبل ما الـ await يحل. الـ navigate (إن وجد)
   * بيتنفّذ من الـ caller بعد ما يستلم الـ result.
   */
  const switchRole = useCallback(
    async (role) => {
      if (role !== "seller" && role !== "customer") {
        throw new Error('role يجب أن يكون "seller" أو "customer" فقط');
      }

      // ✅ Lock: بنمنع أي محاولة ثانية
      if (switchInProgressRef.current) {
        throw new Error("عملية تبديل دور قيد التنفيذ، انتظر قليلاً");
      }
      switchInProgressRef.current = true;

      const previousRole = currentRole;

      if (role === currentRole) {
        return {
          user,
          reconnectSocket: false,
          role,
          skipped: true,
          targetPath: getHomePathForRole(role),
        };
      }

      setIsSwitchingRole(true);
      setSwitchingToRole(role);
      setError(null);
      try {
        const result = await switchUserRole(role);

        // ✅ atomic: localStorage → state → event → socket
        const nextUser = {
          ...(readUserFromStorage() || {}),
          ...(result.user || {}),
          // نضمن إنو الـ role المحلي يتطابق مع المطلوب
          role,
        };
        persistSession({
          user: nextUser,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });

        // ✅ نضمن إنو React التقط الـ state (يرندر الـ Outlet بالدور الجديد)
        await flushStateUpdates();

        // ✅ نطلق event للمزامنة (تابات أخرى / listeners)
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));

        // ✅ نمسح caches الدور القديم (cart, wishlist, notifications)
        clearRoleCaches(previousRole, role);

        // ✅ reconnect socket بالـ token الجديد
        await reconnectSocketSafely();

        return {
          user: nextUser,
          reconnectSocket: true,
          role,
          targetPath: getHomePathForRole(role),
        };
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
        switchInProgressRef.current = false;
      }
    },
    [currentRole, user, persistSession, clearRoleCaches, getHomePathForRole]
  );

  /**
   * ✅ Public API: switchRoleAndNavigate(role, navigate, options)
   * Helper يدمج switch + navigate بشكل atomic:
   *   1) switchRole(role) — يستنى API + state update + socket reconnect
   *   2) نخزّن الـ pendingNavigation
   *   3) navigate(targetPath) — replace: true بشكل افتراضي
   *
   * الـ caller ما يحتاج يعمل أي شي ثاني، فقط ينادي الدالة.
   * الـ navigation بيصير تلقائياً بعد ما كل شي يخلص بنجاح.
   */
  const switchRoleAndNavigate = useCallback(
    async (role, navigate, options = {}) => {
      if (typeof navigate !== "function") {
        throw new Error("switchRoleAndNavigate يحتاج navigate function");
      }
      const targetPath = options.path || getHomePathForRole(role);
      const replace = options.replace !== false; // default: true

      // ✅ نسجّل الـ target — حراس المسارات بيستفيدوا منه
      //    لو الـ navigate صار قبل ما الـ state يلتقط
      setPendingNavigation(targetPath);

      try {
        const result = await switchRole(role);
        // switchRole خلّص: state + tokens + socket كلهم محدثين
        navigate(result.targetPath || targetPath, { replace });
        return result;
      } finally {
        setPendingNavigation(null);
      }
    },
    [switchRole, getHomePathForRole]
  );

  /**
   * تحويل من "بائع" لمشتري.
   */
  const becomeCustomer = useCallback(async () => {
    if (switchInProgressRef.current) {
      throw new Error("عملية تحويل قيد التنفيذ، انتظر قليلاً");
    }
    switchInProgressRef.current = true;

    setIsBecomingCustomer(true);
    setIsSwitchingRole(true);
    setSwitchingToRole("customer");
    setError(null);
    try {
      const result = await submitBecomeCustomer();
      const nextUser = {
        ...(readUserFromStorage() || {}),
        ...(result.user || {}),
        role: "customer",
      };
      persistSession({
        user: nextUser,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      await flushStateUpdates();
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      clearRoleCaches("seller", "customer");
      await reconnectSocketSafely();
      return {
        user: nextUser,
        reconnectSocket: true,
        role: "customer",
        targetPath: getHomePathForRole("customer"),
      };
    } catch (err) {
      setError(
        err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          "تعذّر التحويل لمشتري، حاول مرة أخرى"
      );
      throw err;
    } finally {
      setIsBecomingCustomer(false);
      setIsSwitchingRole(false);
      setSwitchingToRole(null);
      switchInProgressRef.current = false;
    }
  }, [persistSession, clearRoleCaches, getHomePathForRole]);

  /** تسجيل الخروج — محلي فقط، الـ API call بيسويه الـ component */
  const logout = useCallback(() => {
    // ✅ نقفل الـ socket فوراً
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
    setPendingNavigation(null);
    // ✅ نطلق event لمسح caches + إنهاء الـ session
    clearRoleCaches(currentRole, null);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }, [clearRoleCaches, currentRole]);

  // ✅ نحدّث الـ ref بعد ما logout يصير معرّف
  logoutRef.current = logout;

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
      pendingNavigation, // ✅ الوجهة المعلقة (للـ route guards)
      error,
      clearError: () => setError(null),
      // ── actions ──
      login,
      becomeSeller,
      becomeCustomer,
      switchRole,
      switchRoleAndNavigate, // ✅ helper جديد
      logout,
      refreshSession,
      // ── helpers ──
      getHomePathForRole,
      clearRoleCaches,
    }),
    [
      user,
      currentRole,
      isBootstrapping,
      isSwitchingRole,
      switchingToRole,
      isBecomingSeller,
      isBecomingCustomer,
      pendingNavigation,
      error,
      login,
      becomeSeller,
      becomeCustomer,
      switchRole,
      switchRoleAndNavigate,
      logout,
      refreshSession,
      getHomePathForRole,
      clearRoleCaches,
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
