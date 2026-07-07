// يرجع معرف المستخدم الحالي المسجل دخول (customer أو seller)
export function getCurrentUserId() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "guest";
    const user = JSON.parse(raw);
    return user?.id || user?._id || "guest";
  } catch {
    return "guest";
  }
}

// يبني مفتاح تخزين خاص بالمستخدم الحالي
export function scopedKey(baseKey) {
  return `${baseKey}:${getCurrentUserId()}`;
}