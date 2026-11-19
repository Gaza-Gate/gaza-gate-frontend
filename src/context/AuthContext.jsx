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
//              logout, refreshSession, syncProfileFlags,
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
import { useAutoRefreshToken } from "../hooks/useAutoRefreshToken";

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
  // ── ✅ Auto refresh token: يشتغل مرة وحدة لما AuthProvider يحمّل ──
  //    كل 10 دقائق بيحاول يجدد التوكن بالخلفية (silent).
  //    وكمان لما المستخدم يرجع للتب (visibility change).
  //    لاحظ: ما بيستخدم `isAuthenticated` كـ dependency عشان
  //    ما يعيد الـ interval لما الـ user يتغيّر.
  useAutoRefreshToken();

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
   *
   * بيعمل 3 أشياء بالترتيب:
   *   1) يحفظ الـ session فوراً (token + user) → localStorage + React state
   *   2) يبعت event → باقي الـ components (cart, wishlist, navbar) تنحدّث
   *   3) يجيب profile flags من الباك (hasSellerProfile, hasCustomerProfile)
   *      ويدمجها بالـ user. هذا يخلي الـ navbar يعرض "Switch to Seller"
   *      **فوراً** بعد الدخول، بدون ما يحتاج page reload.
   *
   * 📌 الـ flag fetch شغّال بالخلفية (fire-and-forget) — ما بنستناه.
   *    السبب: الـ caller (Login.jsx) بيستنى token + user وبيعمل navigate.
   *    إذا خلّيناه يستنى الـ flags، الـ login بيصير أبطأ بشوي.
   *    والـ flags بتوصل بعد ~100ms وبتحدّث الـ state تلقائياً.
   */
  const login = useCallback(
    ({ user: newUser, accessToken, refreshToken } = {}) => {
      if (!newUser) {
        console.warn("[AuthContext] login() requires a user object");
        return;
      }
      // ✅ Step 1: احفظ الـ session فوراً
      persistSession({ user: newUser, accessToken, refreshToken });
      setError(null);
      // ✅ Step 2: ابعت event → navbar و غيرهم ينحدّثوا
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));

      // ✅ Step 3: اجلب الـ flags من الباك (background)
      //    بنستخدم fetchProfileFlags (مش syncProfileFlags) لأنه
      //    login فيه user جاهز بـ role معروف — ما بنحتاج نلمس
      //    isBootstrapping ولا نمس caches.
      (async () => {
        try {
          const flags = await fetchProfileFlags();
          if (!flags) return;

          // بندمج الـ flags مع الـ user الموجود — role نخليه زي ما هو
          const currentUser = readUserFromStorage() || {};
          const mergedUser = {
            ...currentUser,
            ...flags,
            role: currentUser.role, // ✅ ما نغيّر role — التبديل صار عبر switchRole
          };
          persistSession({ user: mergedUser });
          window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
        } catch (err) {
          // ما بنفجّر error — الـ flags اختيارية والـ login الأساسي نجح
          console.warn(
            "[AuthContext] login: post-login flag sync فشل (مش حاسم):",
            err?.message
          );
        }
      })();
    },
    [persistSession]
  );

  /**
   * ✅ Public API: refreshSession()
   * بيفحص الـ session الحالي مع الباك. مفيد بـ 3 حالات:
   *   1) الإقلاع: لو localStorage فيه user ناقص الـ flags
   *   2) بعد ما يصير بائع: للتأكد إن الـ flags صاروا true عند الباك
   *   3) عند الـ 401 من الباك
   *
   * ⚠️ هذا الـ helper بيستخدم لحالة الـ bootstrap — بيعلّم `isBootstrapping: true`
   *    لحظياً فبتشتغل حراس المسارات بشاشة تحميل. للأماكن التانية (مثلاً
   *    SwitchRoleButton) استخدموا `syncProfileFlags()` بدالها.
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

  /**
   * ✅ Public API: syncProfileFlags()
   *
   * نسخة "هادئة" من refreshSession — بتعمل نفس الشي (تجلب الـ flags من
   * الباك وتدمجها بـ user state + localStorage) **بدون** ما تلمس
   * `isBootstrapping`. مخصصة للاستخدام من الـ components العادية
   * (مثل SwitchRoleButton) لما تحتاج تحدّث الـ flags بدون ما تشغّل
   * شاشة التحميل لحراس المسارات.
   *
   * 📌 الـ flow:
   *   1) بنقرأ الـ token — لو منتهي/مفقود → null
   *   2) بنستدعي fetchProfileFlags() (parallel check على seller/customer)
   *   3) بندمج الـ flags بالـ user الحالي (مع الحفاظ على role الموجود)
   *   4) بنحدّث localStorage + React state + AUTH_CHANGED_EVENT
   *   5) بنرجّع الـ user المدمج
   *
   * 🔑 استخدام نموذجي:
   *   const fresh = await syncProfileFlags();
   *   if (!fresh?.hasSellerProfile) { ... }
   */
  const syncProfileFlags = useCallback(async () => {
    const token = readTokenFromStorage();
    if (!token) return null;

    if (isTokenExpired(token)) {
      console.info(
        "[AuthContext] syncProfileFlags: token منتهي محلياً → logout"
      );
      logoutRef.current?.();
      return null;
    }

    try {
      const flags = await fetchProfileFlags();
      if (!flags) {
        return null;
      }

      // ✅ ندمج الـ flags بالـ user الحالي + نحافظ على role الموجود
      //    (ما بنغيّر role هون — هذا مو من اختصاصنا، التبديل صار عبر switchRole)
      const currentUser = readUserFromStorage() || {};
      const mergedUser = {
        ...currentUser,
        ...flags,
        // role نخليه زي ما هو — syncProfileFlags هدفها تحديث الـ flags فقط
        role: currentUser.role,
      };

      persistSession({ user: mergedUser });
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      return mergedUser;
    } catch (err) {
      console.warn(
        "[AuthContext] syncProfileFlags failed:",
        err?.message
      );
      return null;
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

  /** ✅ تسجيل الخروج — local + React state + caches cleanup.
   *
   * الـ API call بيتم من الـ component (authService.logout).
   * هذا الـ callback مسؤول عن:
   *   1) قطع الـ socket فوراً
   *   2) مسح كل مفاتيح الـ auth من localStorage/sessionStorage
   *      (token, refreshToken, user, userType, sellerId, و "user" + "userType"
   *       keys اللي بيكتبها authSession.js)
   *   3) تصفير React state فوراً (user, currentRole, error, pendingNavigation)
   *   4) إطلاق AUTH_CHANGED_EVENT + ROLE_CACHE_CLEAR_EVENT
   *      (CartContext, WishlistContext, NotificationContext يسمعوها ويمسحوا
   *       الـ cached items — مهم جداً عشان البيانات تختفي فوراً)
   *   5) مسح أي cart/wishlist local storage keys مرتبطة بالمستخدم
   *      (scoped keys: gaza-gate-cart:<userId>, gaza-gate-wishlist:<userId>)
   *
   * 📌 السبب: كانت المشكلة السابقة إنه الـ logout بمسح الـ session
   *    بس الـ user يضل ظاهر "كأنه مسجل" لأن الـ Cart/Wishlist caches
   *    ما تنمسح. الآن بنمسح كل شي ذرّي.
   */
  const logout = useCallback(() => {
    // ✅ 1) قطع الـ socket فوراً
    getSocketHelpers().then((helpers) => {
      try {
        helpers?.disconnectSocket();
      } catch {
        /* ignore */
      }
    });

    // ✅ 2) مسح كل مفاتيح الـ session من localStorage + sessionStorage
    try {
      localStorage.removeItem(TOKEN_KEY); // "token"
      localStorage.removeItem(REFRESH_TOKEN_KEY); // "refreshToken"
      localStorage.removeItem(USER_KEY); // "user"
      localStorage.removeItem(USER_TYPE_KEY); // "userType"
      localStorage.removeItem(SELLER_ID_KEY); // "sellerId"
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }

    // ✅ 3) مسح الـ cart/wishlist caches المرتبطة بالمستخدم اللي كان مسجل
    //    بنمر على كل مفاتيح localStorage وبنمسح أي شي نمطه:
    //    gaza-gate-cart:* أو gaza-gate-wishlist:*
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k.startsWith("gaza-gate-cart:") ||
          k.startsWith("gaza-gate-wishlist:") ||
          k === "gaza-gate-cart" ||
          k === "gaza-gate-wishlist"
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }

    // ✅ 4) تصفير React state فوراً
    setUserState(null);
    setCurrentRole("customer");
    setError(null);
    setPendingNavigation(null);
    setIsBootstrapping(false); // ✅ بنخلي أي guard يقدر يقرر فوراً
    // نمسح الـ role-switching state أيضاً (احتياط)
    setIsSwitchingRole(false);
    setSwitchingToRole(null);
    setIsBecomingSeller(false);
    setIsBecomingCustomer(false);

    // ✅ 5) إطلاق events — كل الـ contexts تسمع وتعمل reset
    clearRoleCaches(currentRole, null);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));

    // ✅ 6) log للتشخيص
    console.info("[AuthContext] logout: تم تنظيف كل الـ session state");
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
      syncProfileFlags, // ✅ نسخة هادئة — بدون لمس isBootstrapping
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
      syncProfileFlags,
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
