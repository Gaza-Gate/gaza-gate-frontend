/**
 * Tailwind Config — Gaza Gate
 * ─────────────────────────────────────────────────────────
 * ✅ Dark mode: 'class' (نتحكم فيه من useTheme.js عبر document.documentElement.classList)
 * ✅ Brand: البرتقالي يظل ثابت (#F97316) في الوضعين — هوية بصرية
 * ✅ Navy (Soft Dark): لوحة slate-based للثيم الليلي — مريحة للعين، بدون أسود نقي
 * ✅ Glassmorphism + Wave: utilities جاهزة (.glass-card / .glow-orange / .bg-wave-navy)
 *
 * 🎨 Soft Dark palette (slate-based، تجنبنا الـ pure black):
 *   - bg-navy.950 = #1e293b → الخلفية الرئيسية (body) — slate-800
 *   - bg-navy.900 = #334155 → البطاقات (cards) — slate-700
 *   - bg-navy.800 = #475569 → عناصر ثانوية / حدود — slate-600
 *   - text-white  = #FFFFFF → عناوين رئيسية (نادر — نفضّل slate-100)
 *   - text-navy.100 = #f1f5f9 → عناوين — slate-100 (مريح أكثر من الأبيض الناصع)
 *   - text-navy.200 = #cbd5e1 → نصوص ثانوية مريحة — slate-300
 *   - text-navy.300 = #94a3b8 → نصوص ثالثة — slate-400
 *   - brand.500 = #F97316 → البرتقالي (ثابت في الوضعين)
 *   - emerald.500 = #10b981 → شارة "متوفر"
 *
 * 💡 السبب: الـ slate tones بتجنّب إرهاق العين الناجم عن التباين العالي
 *    مع أسود نقي (#000)، وبتعطي إحساس أكثر حداثة ودفء.
 */

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // ── Brand Orange (ثابت عبر الوضعين) ──
      colors: {
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316", // ← الأساسي (لا يتغير في dark)
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        // ── Navy (Soft Dark — slate-based، مريح للعين) ──
        // بدّلت الكحلي العميق بطبقات slate فاتحة لتجنّب الإرهاق البصري
        navy: {
          50:  "#f8fafc",  // slate-50 — نصوص فاتحة جداً (بديل الأبيض الناصع)
          100: "#f1f5f9",  // slate-100 — عناوين رئيسية
          200: "#cbd5e1",  // slate-300 — نصوص ثانوية مريحة
          300: "#94a3b8",  // slate-400 — نصوص ثالثة
          400: "#64748b",  // slate-500 — placeholders / disabled
          500: "#475569",  // slate-600 — borders مرئية / عناصر ثانوية
          600: "#3f4b62",  // slate-600 ممزوج — hover/active
          700: "#334155",  // slate-700 — بطاقات أساسية
          800: "#2a3548",  // slate-700+ — متغير أعمق للبطاقات
          900: "#1e293b",  // slate-800 — خلفية التطبيق الأساسية (body)
          950: "#182234",  // slate-800+ — متغير أعمق (modals / overlays)
        },
        // ── Accent (مكمّلات) ──
        emerald: {
          500: "#10b981",  // شارة "متوفر"
        },
      },
      // ── Glassmorphism / Glow shadows ──
      boxShadow: {
        glass: "0 8px 32px 0 rgba(15, 23, 42, 0.35)",
        "glass-sm": "0 4px 16px 0 rgba(15, 23, 42, 0.2)",
        "glow-orange": "0 0 24px rgba(249, 115, 22, 0.45), 0 0 8px rgba(249, 115, 22, 0.25)",
        "glow-orange-soft": "0 0 16px rgba(249, 115, 22, 0.25)",
        "glow-navy": "0 0 24px rgba(71, 85, 105, 0.5)",
        "card-navy": "0 8px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(148, 163, 184, 0.1)",
      },
      // ── Background images (التموجات) ──
      backgroundImage: {
        // موجة slate ناعمة (للثيم الليلي) — slate tones متدرجة، بدون أسود نقي
        "wave-navy":
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(99, 102, 241, 0.10) 0%, transparent 60%)," +
          "radial-gradient(ellipse 70% 50% at 80% 30%, rgba(71, 85, 105, 0.45) 0%, transparent 60%)," +
          "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(51, 65, 85, 0.7) 0%, transparent 70%)," +
          "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)",
        // موجة فاتحة دافئة (للثيم النهاري)
        "wave-light":
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(255, 237, 213, 0.7) 0%, transparent 60%)," +
          "radial-gradient(ellipse 70% 50% at 80% 30%, rgba(254, 215, 170, 0.4) 0%, transparent 60%)," +
          "linear-gradient(135deg, #fafaf9 0%, #fff7ed 50%, #ffedd5 100%)",
        // Glassmorphism overlay
        "glass":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
      },
      // ── Animation للتموج + الإشعارات + الإبراز ──
      keyframes: {
        "wave-drift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-2%, 1%) scale(1.02)" },
        },
        "wave-drift-slow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(1%, -1%) scale(1.03)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 16px rgba(249, 115, 22, 0.3)" },
          "50%": { boxShadow: "0 0 28px rgba(249, 115, 22, 0.6)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "swipe-out-left": {
          to: { opacity: "0", transform: "translateX(-100%)" },
        },
        "swipe-out-right": {
          to: { opacity: "0", transform: "translateX(100%)" },
        },
        // ✅ أنيميشن إبراز التقييم (highlight) عند القدوم من إشعار
        "review-highlight": {
          "0%":   { boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.0), 0 0 0 0 rgba(249, 115, 22, 0.0)" },
          "20%":  { boxShadow: "0 0 0 6px rgba(249, 115, 22, 0.4), 0 0 32px 4px rgba(249, 115, 22, 0.45)" },
          "60%":  { boxShadow: "0 0 0 4px rgba(249, 115, 22, 0.3), 0 0 24px 2px rgba(249, 115, 22, 0.35)" },
          "100%": { boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.0), 0 0 0 0 rgba(249, 115, 22, 0.0)" },
        },
        "review-pulse-bg": {
          "0%":   { backgroundColor: "rgba(249, 115, 22, 0.18)" },
          "50%":  { backgroundColor: "rgba(249, 115, 22, 0.08)" },
          "100%": { backgroundColor: "rgba(249, 115, 22, 0.0)" },
        },
      },
      animation: {
        "wave-drift": "wave-drift 12s ease-in-out infinite",
        "wave-drift-slow": "wave-drift-slow 18s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "slide-down": "slide-down 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        "swipe-out-left": "swipe-out-left 0.28s ease-out forwards",
        "swipe-out-right": "swipe-out-right 0.28s ease-out forwards",
        "review-highlight": "review-highlight 2.4s ease-in-out 1",
        "review-pulse-bg": "review-pulse-bg 2.4s ease-out 1",
      },
      // ── Font family (موجود فعلاً في index.css، نضيف alias للـ Tailwind) ──
      fontFamily: {
        sans: ['"Tajawal"', '"Segoe UI"', "Tahoma", "sans-serif"],
      },
    },
  },
  plugins: [],
};
