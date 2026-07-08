export function extractToken(data) {
  const payload = data?.data ?? data;
  return payload?.accessToken || payload?.token || data?.accessToken || data?.token || null;
}

export function extractUser(data) {
  const payload = data?.data ?? data;
  return payload?.user ?? data?.user ?? null;
}

export function saveCustomerSession(token, user = null, remember = true) {
  persistToken(token, remember);
  localStorage.setItem("userType", "customer");
  if (user) localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("gaza-gate-auth-changed")); // ← جديد
}

export function saveSellerSession(token, user = null, remember = true) {
  persistToken(token, remember);
  localStorage.setItem("userType", "seller");
  if (user) localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("gaza-gate-auth-changed")); // ← جديد
}

export function persistToken(token, remember = true) {
  if (!token) return;
  if (remember) {
    localStorage.setItem("token", token);
    sessionStorage.removeItem("token");
  } else {
    sessionStorage.setItem("token", token);
    localStorage.removeItem("token");
  }
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userType");
  sessionStorage.removeItem("token");
  window.dispatchEvent(new Event("gaza-gate-auth-changed")); // ← جديد
}

export function isMissingAccountError(err) {
  const message = (err?.message || "").toLowerCase();
  const code = String(err?.code || err?.response?.code || "").toUpperCase();
  const status = err?.status || err?.response?.status;

  if (status === 404) return true;

  const missingCodes = ["NOT_FOUND", "NO_USER", "NOT_REGISTERED", "USER_NOT_FOUND", "ACCOUNT_NOT_FOUND"];
  if (missingCodes.some((item) => code.includes(item))) return true;

  const missingMessages = [
    "not found",
    "no account",
    "does not exist",
    "غير موجود",
    "غير مسجل",
    "لا يوجد",
    "لم يتم العثور",
    "لا يملك حساب",
  ];

  return missingMessages.some((item) => message.includes(item));
}
