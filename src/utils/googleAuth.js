import {
  customerGoogleLogin,
  customerGoogleRegister,
  sellerGoogleLogin,
  sellerGoogleRegister,
} from "../services/authService";
import {
  extractToken,
  extractUser,
  saveCustomerSession,
  saveSellerSession,
} from "./authSession";

export function parseGoogleProfile(credential) {
  const base64 = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

export function buildSellerGoogleInitialValues(profile) {
  return {
    firstName: profile?.given_name || "",
    lastName: profile?.family_name || "",
    email: profile?.email || "",
    password: "GOOGLE_AUTH",
    confirmPassword: "GOOGLE_AUTH",
    storeName: "",
    storeDescription: "",
  };
}

/**
 * تسجيل دخول/إنشاء حساب مشتري عبر Google.
 * ✅ الآن بيرجّع { mode, user, accessToken } — فيقدر الـ caller
 *    يستدعي login({ user, accessToken }) من AuthContext فوراً.
 */
export async function authenticateCustomerWithGoogle(credential, remember = true) {
  try {
    const data = await customerGoogleLogin(credential);
    const token = extractToken(data);
    const user = extractUser(data);
    if (!token) throw new Error("لم يتم استلام رمز الدخول من السيرفر");
    saveCustomerSession(token, user, remember);
    return { mode: "login", user, accessToken: token };
  } catch (loginError) {
    try {
      const data = await customerGoogleRegister(credential);
      const token = extractToken(data);
      const user = extractUser(data);
      if (!token) throw new Error("لم يتم استلام رمز الدخول من السيرفر");
      saveCustomerSession(token, user, remember);
      return { mode: "register", user, accessToken: token };
    } catch (registerError) {
      throw registerError;
    }
  }
}

/**
 * تسجيل دخول البائع عبر Google.
 * ✅ الآن بيرجّع { mode, user, accessToken } — فيقدر الـ caller
 *    يستدعي login({ user, accessToken }) من AuthContext فوراً.
 */
export async function authenticateSellerWithGoogle(credential, remember = true) {
  const data = await sellerGoogleLogin(credential);
  const token = extractToken(data);
  const user = extractUser(data);
  if (!token) throw new Error("لم يتم استلام رمز الدخول من السيرفر");
  saveSellerSession(token, user, remember);
  return { mode: "login", user, accessToken: token };
}

/**
 * ✅ تسجيل دخول المشتري عبر Google فقط (بدون fallback لـ register).
 *    مفيد لصفحة Login — بنخلي الـ caller يقرر شو يعمل إذا الحساب مش موجود
 *    (مثلاً: redirect لصفحة Register مع تمرير الـ credential).
 *
 * @param {string} credential - Google ID token من GoogleLogin.onSuccess
 * @returns {Promise<{ user: object, accessToken: string }>}
 * @throws {AxiosError} — 404/not-found إذا الحساب غير موجود
 *                       — 401 إذا التوكن غير صالح
 *                       — أخطاء أخرى حسب الباك
 */
export async function customerGoogleLoginOnly(credential) {
  const data = await customerGoogleLogin(credential);
  const token = extractToken(data);
  const user = extractUser(data);
  if (!token) throw new Error("لم يتم استلام رمز الدخول من السيرفر");
  return { user, accessToken: token };
}

/**
 * ✅ إنشاء حساب مشتري عبر Google فقط (بدون محاولة login).
 *    مفيد لصفحة Register — بيكمل الـ flow دفعة واحدة.
 *
 * @param {string} credential - Google ID token من GoogleLogin.onSuccess
 * @returns {Promise<{ user: object, accessToken: string }>}
 * @throws {AxiosError} — 409 إذا الإيميل مسجل مسبقاً
 *                       — 400 إذا التوكن غير صالح
 *                       — أخطاء أخرى حسب الباك
 */
export async function customerGoogleRegisterOnly(credential) {
  const data = await customerGoogleRegister(credential);
  const token = extractToken(data);
  const user = extractUser(data);
  if (!token) throw new Error("لم يتم استلام رمز الدخول من السيرفر");
  return { user, accessToken: token };
}

export async function prepareSellerGoogleRegistration(credential) {
  const profile = parseGoogleProfile(credential);
  const data = await sellerGoogleRegister(credential);
  const pendingToken = data?.data?.pendingToken;

  if (!pendingToken) {
    throw new Error("تعذر بدء إنشاء الحساب بجوجل");
  }

  return {
    pendingToken,
    initialValues: buildSellerGoogleInitialValues(profile),
  };
}

/**
 * يجمع login + register في تجربة واحدة.
 * - إذا الحساب موجود → mode=login + user/accessToken جاهزين للـ login()
 * - إذا مش موجود → mode=register + pendingToken لصفحة إكمال التسجيل
 */
export async function resolveSellerGoogleLogin(credential, remember = true) {
  try {
    return await authenticateSellerWithGoogle(credential, remember)
  } catch (loginError) {
    try {
      const registration = await prepareSellerGoogleRegistration(credential)
      return { mode: 'register', user: null, accessToken: null, ...registration }
    } catch (registerError) {
      throw registerError   
    }
  }
}
