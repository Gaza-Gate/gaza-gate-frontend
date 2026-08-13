// ════════════════════════════════════════════════════════════════════════════
//  Feature Flags — مركزي وقابل للتوسع
// ════════════════════════════════════════════════════════════════════════════
//
//  الهدف: تفعيل/تعطيل الميزات من مكان واحد بدون لمس عشرات الصفحات.
//
//  الاستخدام:
//    import { FEATURES } from "../utils/featureFlags";
//    if (FEATURES.CHATBOT_SEND_ENABLED) { ... }
//
//  ✅ كل flag موثّق ومُجمّع في مكان واحد
//  ✅ الافتراضات: كل ما يخص الإرسال = false (إرسال معطّل افتراضياً)
//  ✅ الواجهة والقراءة تظل تعمل حتى لو SEND = false
//  ✅ لو بدنا نعيد التفعيل مستقبلاً: نغيّر false → true ونعمل rebuild فقط
//
// ════════════════════════════════════════════════════════════════════════════

export const FEATURES = Object.freeze({
  // ── Chatbot ───────────────────────────────────────────────────────────
  // هل زر الـ Chatbot نفسه يظهر أصلاً (FAB). تحكّمنا فيه من visibility.js
  //   بناءً على الـ route (Home فقط). هذا الـ flag احتياطي لو حبّينا نخفيه
  //   بالكامل من أي مكان (مثلاً فترة صيانة).
  CHATBOT_ENABLED: true,

  // هل إرسال رسائل الـ Chatbot مفعّل. false = Send Disabled + Enter لا يرسل
  //   + لا API call + لا يُحدّث conversation state كرسالة مُرسلة.
  CHATBOT_SEND_ENABLED: false,

  // ── User-to-User Messaging (المراسلات بين المستخدمين) ────────────────
  // هل نظام المراسلات نفسه مفعّل (محادثات + قراءة). حالياً true عشان
  //   نقدر نفتح المحادثة ونقرأ الرسائل الموجودة.
  MESSAGING_ENABLED: true,

  // هل إرسال رسائل جديدة مفعّل. false = Send Disabled + Enter لا يرسل
  //   + لا API call + لا إنشاء رسالة جديدة في DB.
  MESSAGING_SEND_ENABLED: false,

  // ── Floating Actions (Chatbot + Theme) ───────────────────────────────
  // هل أزرار الـ Floating (Chatbot + Theme) تظهر فقط في الـ Home
  //   (Customer Home + Seller Home). true = السلوك المطلوب من اليوزر.
  FLOATING_ACTIONS_ON_HOME_ONLY: true,
});

// ════════════════════════════════════════════════════════════════════════════
//  Helper predicates — قراءة أنظف في المكونات
// ════════════════════════════════════════════════════════════════════════════

export const canSendChatbot = () =>
  FEATURES.CHATBOT_ENABLED && FEATURES.CHATBOT_SEND_ENABLED;

export const canSendMessage = () =>
  FEATURES.MESSAGING_ENABLED && FEATURES.MESSAGING_SEND_ENABLED;

export const isChatbotVisible = () => FEATURES.CHATBOT_ENABLED;
export const isMessagingVisible = () => FEATURES.MESSAGING_ENABLED;
