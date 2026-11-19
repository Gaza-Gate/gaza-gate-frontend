// src/utils/authShellPaths.js
//
// مسارات الـ Auth (login/register/...) المستخدمة بالـ AuthShell layout.
// نفس القائمة في App.jsx — استخرجناها لـ utility module لاستخدامها
// بـ smartBack وغيرها بدون duplication.

const authShellPaths = [
  "/",
  "/onboarding",
  "/onboarding/customer",
  "/seller/onboarding",
  "/login/customer",
  "/login/seller",
  "/register/customer",
  "/register/seller",
  "/verify-email",
  "/verify-otp",
  "/forgot-password",
];

export default authShellPaths;
