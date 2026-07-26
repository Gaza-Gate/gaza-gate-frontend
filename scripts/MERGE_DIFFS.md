# مقارنة الـ Merge Conflicts

**Created:** تحليل لكل ملف فيه conflict markers (12 ملف)
**Path:** `scripts/MERGE_DIFFS.md` (ملف جديد، ما عدّلت أي ملف مصدر)

> **طريقة القراءة:** 🅰️ OURS = الـ branch الحالي (development) | 🅱️ THEIRS = شغلك من الـ stash
> **التوصية:** اعتمد THEIRS (🟢 شغلك) في أغلب الحالات لأنها أحدث وأنضج

---

## 📑 فهرس سريع

| # | الملف | عدد الـ Conflicts | القرار الموصى |
|---|---|---|---|
| 1 | `src/App.jsx` | 2 | 🟢 خذ THEIRS |
| 2 | `src/components/ReviewModal.jsx` | 3 | 🟢 خذ THEIRS |
| 3 | `src/pages/CustomerMessages.jsx` | 7 | 🟢 خذ THEIRS (الأحدث) |
| 4 | `src/pages/CustomerOrderTracking.jsx` | 2 | 🟢 خذ THEIRS |
| 5 | `src/pages/CustomerProductDetails.jsx` | 3 | 🟢 خذ THEIRS |
| 6 | `src/pages/CustomerProducts.jsx` | 2 | 🟢 خذ THEIRS |
| 7 | `src/pages/CustomerStoreProfile.css` | 6 | 🟢 خذ THEIRS |
| 8 | `src/pages/CustomerStoreProfile.jsx` | 4 | 🟢 خذ THEIRS (كامل rewrite) |
| 9 | `src/pages/Messages.css` | 2 | 🟢 خذ THEIRS |
| 10 | `src/pages/Messages.jsx` | 2 | 🟢 خذ THEIRS |
| 11 | `src/pages/RatingsManagement.jsx` | 3 | 🟡 يدمج الاثنين (highlights + distribution) |
| 12 | `src/services/authService.js` | 2 | 🟢 خذ THEIRS |

---

## 📄 كل ملف بالتفصيل

(التفاصيل الكاملة محفوظة في logs الـ output — هنا ملخص كل واحد)

### 1️⃣ `src/App.jsx` — 2 conflicts
- **Conflict 1 (L39):** إضافة imports لـ `CustomerStoreProfile` و `CustomerProfilePage`
  - 🅰️ OURS: ما فيه imports
  - 🅱️ THEIRS: `import CustomerStoreProfile from "./pages/CustomerStoreProfile"; import CustomerProfilePage from "./pages/CustomerProfilePage";`
  - ✅ **القرار: خذ THEIRS** (تحتاجهم للـ routes)

- **Conflict 2 (L125):** إضافة routes للـ customer store + profile
  - 🅰️ OURS: ما فيه routes جديدة
  - 🅱️ THEIRS: 4 routes (customer/store, customer/store/:id, customer/profile/:id, profile/customer/:id)
  - ✅ **القرار: خذ THEIRS** كاملة

---

### 2️⃣ `src/components/ReviewModal.jsx` — 3 conflicts
- **Conflict 1 (L1):** imports إضافية (useRef, useEffect, useMemo, Camera)
  - 🟢 THEIRS أكمل
- **Conflict 2 (L73):** إضافة props/state جديدة (rating, comment, image)
  - 🟢 THEIRS أكمل
- **Conflict 3 (L396):** إضافة handlers (handleImage, handleSubmit, handleClose)
  - 🟢 THEIRS أكمل
- ✅ **القرار: خذ THEIRS** بكل الـ 3 (نسخة أنضج بكتير)

---

### 3️⃣ `src/pages/CustomerMessages.jsx` — 7 conflicts
- هاد الملف عندك THEIRS فيه **نسخة كاملة 1124 سطر** مع كل المميزات (search, online status, file upload, etc.)
- 🅰️ OURS نسخة قديمة 802 سطر
- ✅ **القرار: خذ THEIRS** كاملة (نسختك الجديدة أنضج بكتير)

---

### 4️⃣ `src/pages/CustomerOrderTracking.jsx` — 2 conflicts
- Conflict 1: imports إضافية
- Conflict 2: useEffect للـ polling
- ✅ **القرار: خذ THEIRS** (نسختك أحدث)

---

### 5️⃣ `src/pages/CustomerProductDetails.jsx` — 3 conflicts
- imports (useSearchParams)
- state للـ highlight + useEffect
- JSX: highlight prop + onHighlighted callback
- ✅ **القرار: خذ THEIRS** (نظام الـ highlight للتقييمات)

---

### 6️⃣ `src/pages/CustomerProducts.jsx` — 2 conflicts
- ✅ **القرار: خذ THEIRS**

---

### 7️⃣ `src/pages/CustomerStoreProfile.css` — 6 conflicts
- THEIRS فيه CSS جديد كامل للـ store profile design system (csp- prefix)
- ✅ **القرار: خذ THEIRS** (نظام CSS كامل جديد)

---

### 8️⃣ `src/pages/CustomerStoreProfile.jsx` — 4 conflicts
- **كبير!:** THEIRS فيه **rewrite كامل** للملف (من mock data → real API integration)
- ✅ **القرار: خذ THEIRS** كاملة (دمج مع API حقيقي)

---

### 9️⃣ `src/pages/Messages.css` — 2 conflicts
- THEIRS فيه تنسيقات CSS جديدة
- ✅ **القرار: خذ THEIRS**

---

### 🔟 `src/pages/Messages.jsx` — 2 conflicts
- THEIRS فيه imports أحدث + تعليقات محدثة
- ✅ **القرار: خذ THEIRS**

---

### 1️⃣1️⃣ `src/pages/RatingsManagement.jsx` — 3 conflicts
- **Conflict 1 (L90):** THEIRS فيه state للـ `summary` و `pagination` (إضافة)
- **Conflict 2 (L180):** THEIRS فيه computed distribution fallback
- **Conflict 3 (L360):** THEIRS فيه useEffect للـ highlight + scroll (هذا اللي حطيته للـ "رد على تقييمك" notification)
- 🟡 **القرار: يدمج الاثنين** — خذ THEIRS كامل (عنده المميزات الثلاث كلها)

---

### 1️⃣2️⃣ `src/services/authService.js` — 2 conflicts
- **Conflict 1 (L216):** THEIRS فيه comment يوجه للـ reviewService (لأنك نقلت submitReview لملف منفصل)
- **Conflict 2 (L237):** THEIRS فيه endpoint الصحيح للـ conversations (`/api/conversations/:id/messages` بدل `/api/customer/conversations/...`)
- ✅ **القرار: خذ THEIRS** (الـ endpoints صحيحة هنا)

---

## 🎯 ملخص القرارات

| الفئة | عدد الملفات |
|---|---|
| ✅ خذ THEIRS كامل (10 ملفات) | App, ReviewModal, CustomerMessages, CustomerOrderTracking, CustomerProductDetails, CustomerProducts, CustomerStoreProfile.css, CustomerStoreProfile.jsx, Messages.css, Messages.jsx, authService |
| 🟡 يدمج (1 ملف) | RatingsManagement |
| ⚠️ ملفات بدون conflict (معدّلة) | package.json, package-lock.json, CustomerNavbar.{css,jsx}, 13 صفحة admin/customer |

---

## 🚀 الخطوة التالية

1. افتح كل ملف بـ VS Code
2. اضغط على الـ "Accept Incoming Change" (أو الأيقونة الزرقا/الخضراء) لاختيار THEIRS
3. أو "Accept Both" إذا بدك تدمج يدوي
4. بعد ما تخلص: `git add .` ثم `git commit -m "resolve merge conflicts"`
