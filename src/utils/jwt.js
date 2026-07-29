// src/utils/jwt.js
//
// Helpers للتعامل مع JWT tokens المخزّنة في localStorage
// (decoding بدون verification — verification بتم على الـ backend)

/**
 * Decode JWT payload بدون validation (للقراءة فقط)
 * الـ JWT format: header.payload.signature (base64url encoded)
 *
 * ⚠️ هاد ما بيتحقق من صحة الـ token — بس بيقرأ الـ payload.
 *    الـ verification الفعلي بيصير على الـ backend مع كل request.
 *
 * @param {string} token
 * @returns {object|null} payload أو null لو الـ token غير صالح
 */
export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // pad لو ناقص
    const padded = payload + "===".slice((payload.length + 3) % 4);
    // ✅ decodeURIComponent ثم escapeForJson (base64 ممكن يحتوي على + أو = أو URL chars)
    const decoded = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * استخراج role من JWT (customer / seller / admin)
 *
 * @param {string} token
 * @returns {string|null}
 */
export function getRoleFromToken(token) {
  const payload = decodeJwt(token);
  return payload?.role ?? null;
}

/**
 * هل الـ token expired أو رح ينتهي خلال الثواني القادمة؟
 *
 * @param {string} token
 * @param {number} [leewaySeconds=30] - كم ثانية قبل exp بنعتبره expired
 * @returns {boolean}
 */
export function isTokenExpired(token, leewaySeconds = 30) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true; // لو ما في exp، اعتبره expired
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp - leewaySeconds <= nowSec;
}
