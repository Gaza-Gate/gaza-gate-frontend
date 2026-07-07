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

export async function authenticateCustomerWithGoogle(credential, remember = true) {
  try {
    const data = await customerGoogleLogin(credential);
    const token = extractToken(data);
    const user = extractUser(data);
    if (!token) throw new Error("لم يتم استلام رمز الدخول من السيرفر");
    saveCustomerSession(token, user, remember);
    return { mode: "login" };
  } catch (loginError) {
    try {
      const data = await customerGoogleRegister(credential);
      const token = extractToken(data);
      const user = extractUser(data);
      if (!token) throw new Error("لم يتم استلام رمز الدخول من السيرفر");
      saveCustomerSession(token, user, remember);
      return { mode: "register" };
    } catch (registerError) {
      throw registerError;
    }
  }
}

export async function authenticateSellerWithGoogle(credential, remember = true) {
  const data = await sellerGoogleLogin(credential);
  const token = extractToken(data);
  const user = extractUser(data);
  if (!token) throw new Error("لم يتم استلام رمز الدخول من السيرفر");
  saveSellerSession(token, user, remember);
  return { mode: "login" };
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

export async function resolveSellerGoogleLogin(credential, remember = true) {
  try {
    return await authenticateSellerWithGoogle(credential, remember);
  } catch (loginError) {
    try {
      const registration = await prepareSellerGoogleRegistration(credential);
      return {
        mode: "register",
        ...registration,
      };
    } catch {
      throw loginError;
    }
  }
}
