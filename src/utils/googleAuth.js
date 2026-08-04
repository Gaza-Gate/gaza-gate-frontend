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
