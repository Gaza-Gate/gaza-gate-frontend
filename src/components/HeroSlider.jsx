import { useCallback, useEffect, useRef, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentUser } from "../services/authService";
import "./HeroSlider.css";

/**
 * ✅ HeroSlider — بديل الـ Hero Banner القديم
 * ─────────────────────────────────────────────────────────
 * متطلبات مُحقّقة:
 *  • 5 صور WebP مع lazy loading (الأولى eager)
 *  • Autoplay 5s مع pause عند hover أو لما التاب مش visible
 *  • Smooth fade transition (CSS opacity)
 *  • Arrows (RTL-aware: التالي = يسار، السابق = يمين)
 *  • Pagination dots
 *  • Touch/swipe gestures (mobile)
 *  • Infinite loop (modulo)
 *  • Keyboard navigation (Arrow keys)
 *  • لا layout shift — ارتفاع ثابت عبر clamp
 *  • object-fit: contain → الصورة تُعرض كاملة بدون قص
 *  • النص في الفراغ على يسار الصورة + تدرج خفيف للقراءة
 *  • نص: pill ترحيب + عنوان + tagline + CTA
 */

const SLIDES = [
  { src: "/assets/hero/hero-perfume.webp",    alt: "عطر فاخر" },
  { src: "/assets/hero/hero-embroidery.webp", alt: "تطريز فلسطيني" },
  { src: "/assets/hero/hero-giftbox.webp",    alt: "صندوق هدايا" },
  { src: "/assets/hero/hero-food.webp",       alt: "مأكولات تقليدية" },
  { src: "/assets/hero/hero-pottery.webp",    alt: "فخار يدوي" },
];

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 50; // أقل من هذا = swipe ملغى

// ✅ اسم حقيقي من auth (يقرأ من localStorage بدون API call)
function resolveUserName() {
  if (typeof window === "undefined") return "ضيف";
  const user = getCurrentUser();
  if (!user) return "ضيف";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email?.split("@")[0] || "ضيف";
}

function HeroSlider() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  // ✅ اسم المستخدم — يقرأ من localStorage (lazy، بدون re-render)
  const [userName] = useState(resolveUserName);

  const sliderRef = useRef(null);
  const touchStartXRef = useRef(null);
  const timerRef = useRef(null);

  const goTo = useCallback((idx) => {
    const len = SLIDES.length;
    setCurrent(((idx % len) + len) % len);
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // ── Autoplay (يتوقف عند hover أو tab مخفي) ──
  useEffect(() => {
    if (isHovered) return;
    if (typeof document !== "undefined" && document.hidden) return;

    timerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, AUTOPLAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, isHovered]);

  // ── Pause لما الـ tab مش visible (Page Visibility API) ──
  useEffect(() => {
    const onVisibility = () => {
      // تغيير الـ current بـ setState يكفي لإعادة تشغيل الـ effect أعلاه
      setCurrent((c) => c);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ── Preload السلايد التالي (يمنع أي flicker/flash أثناء الـ crossfade) ──
  useEffect(() => {
    const nextIdx = (current + 1) % SLIDES.length;
    const prevIdx = (current - 1 + SLIDES.length) % SLIDES.length;
    [nextIdx, prevIdx].forEach((idx) => {
      const img = new Image();
      img.src = SLIDES[idx].src;
    });
  }, [current]);

  // ── Keyboard navigation (Left/Right arrows) ──
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        prev();
      }
    },
    [next, prev]
  );

  // ── Touch / swipe handlers ──
  const onTouchStart = useCallback((e) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      const startX = touchStartXRef.current;
      if (startX == null) return;
      const endX = e.changedTouches[0].clientX;
      const delta = startX - endX; // موجب = سحب لليسار = التالي

      if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
        if (delta > 0) next();
        else prev();
      }
      touchStartXRef.current = null;
    },
    [next, prev]
  );

  const goToProducts = useCallback(() => navigate("/products"), [navigate]);

  return (
    <section
      className="hero-slider"
      dir="rtl"
      aria-roledescription="carousel"
      aria-label="صور مميزة من المتجر"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div
        className="hero-slider-viewport"
        ref={sliderRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className={`hero-slide ${i === current ? "is-active" : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`شريحة ${i + 1} من ${SLIDES.length}: ${slide.alt}`}
            aria-hidden={i !== current}
          >
            {/* الصورة تتعرض كاملة بدون قص — object-fit: contain */}
            <img
              src={slide.src}
              alt={i === current ? slide.alt : ""}
              className="hero-slide-img"
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}

        {/* تدرج خفيف على يسار الصورة — يضمن قراءة النص في المنطقة الفاضية */}
        <div className="hero-slide-gradient" aria-hidden="true" />

        {/* المحتوى النصي — ثابت تماماً فوق الشرائح (ما بيتحرك مع تغيير الصورة) */}
        <div className="hero-content">
          {/* 1. Pill ترحيب */}
          <span className="hero-pill">مرحبا {userName}</span>

          {/* 2. العنوان الرئيسي */}
          <h1 className="hero-title">
            تسوق بذكاء
            <br />
            وعش الفرق
          </h1>

          {/* 3. الـ Tagline المطلوب */}
          <p className="hero-tagline">
            منتجات أصيلة بلمسة يدوية خالصة، توصلك مباشرة من صانعها لباب بيتك.
          </p>

          {/* 4. CTA */}
          <button
            type="button"
            className="hero-cta"
            onClick={goToProducts}
          >
            تسوّق الآن
          </button>
        </div>
      </div>

      {/* ── Arrows (في RTL: التالي = يسار، السابق = يمين) ── */}
      <button
        type="button"
        className="hero-arrow hero-arrow--prev"
        onClick={prev}
        aria-label="الشريحة السابقة"
      >
        <ChevronRight size={22} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="hero-arrow hero-arrow--next"
        onClick={next}
        aria-label="الشريحة التالية"
      >
        <ChevronLeft size={22} aria-hidden="true" />
      </button>

      {/* ── Pagination dots ── */}
      <div className="hero-dots" role="tablist" aria-label="اختر شريحة">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            role="tab"
            className={`hero-dot ${i === current ? "is-active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`انتقل إلى شريحة ${i + 1}: ${slide.alt}`}
            aria-selected={i === current}
            aria-current={i === current ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default memo(HeroSlider);
