import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  MessageCircle,
  Clock,
  Users,
  PackageCheck,
  UserPlus,
  Search,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Linkedin,
  Music2,
  Quote,
  CircleCheck,
  Menu,
  X,
  ShoppingCart,
  Scale,
  Store,
  User,
  ArrowLeftRight,
  Lock,
  Check,
  Package,
  RotateCcw,
  Home,
  Heart,
  ChevronDown,
  HelpCircle,
  FileText,
} from "lucide-react";
import ThemeLogo from "../components/ThemeLogo";
import api from "../utils/api";
import "./LandingPage.css";

/* أرقام احتياطية — بتنعرض بس لو الـ API ما ردّ لأي سبب (تعطل مؤقت، شبكة...)
   حتى ما تضل الصفحة عالقة بسكيلتون فاضي للأبد */
const FALLBACK_LANDING_STATS = {
  productsCount: 2000,
  sellersCount: 500,
  ordersCount: 2000,
};

/* مسارات موحّدة — مطابقة تمامًا لملف الراوت (App.jsx)
   ملاحظة: قبل أي توجيه لتسجيل الدخول/التسجيل، لازم المستخدم يمرّ
   أولاً بشاشة الأونبوردينغ المخصصة له (بائع/مشتري) — هاي الشاشتين
   عامّتين وغير محميّتين بالراوت، وهنّ يلي بيوجّهو بعدين لصفحة
   تسجيل الدخول أو التسجيل المناسبة. */
const BUYER_ONBOARDING_PATH = "/onboarding/customer";
const SELLER_ONBOARDING_PATH = "/seller/onboarding";
const ONBOARDING_PATH = "/onboarding";

/* ────────────────────────────────────────────────────────────────
   عداد أرقام متحرك — يشتغل لما القسم يدخل الشاشة (IntersectionObserver)
   ──────────────────────────────────────────────────────────────── */
function useCountUp(target, { duration = 1400, decimals = 0 } = {}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(target * eased);
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, duration]);

  return [value.toFixed(decimals), ref];
}

function Stat({ value, decimals = 0, suffix = "", label }) {
  const [display, ref] = useCountUp(value, { decimals });
  return (
    <div className="lp-stat" ref={ref}>
      <div className="lp-stat-value">
        {display}
        {suffix}
      </div>
      <div className="lp-stat-label">{label}</div>
    </div>
  );
}

/* سكيلتون بنفس مقاس Stat — بيبين لحد ما يوصل رقم حقيقي من /api/landing،
   وهيك منتجنب تمرير قيمة placeholder لـ Stat (يلي بيعدّ لفوق مرة وحدة بس
   عند أول ظهور، فلو غيّرنا القيمة بعدين ما رح تعيد الحركة). */
function StatSkeleton({ label }) {
  return (
    <div className="lp-stat">
      <div className="lp-stat-value lp-stat-skeleton" aria-hidden="true" />
      <div className="lp-stat-label">{label}</div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    icon: <Search size={20} />,
    title: "تصفّح وابحث",
    desc: "آلاف المنتجات من بائعين موثوقين بأسعار منافسة.",
  },
  {
    n: "02",
    icon: <ShoppingCart size={20} />,
    title: "أضف واطلب",
    desc: "أكّدي طلبك وادفعي كاش عند الاستلام.",
  },
  {
    n: "03",
    icon: <Package size={20} />,
    title: "استلم طلبك",
    desc: "تتبع لحظي حتى يصل الطلب لباب بيتك.",
  },
];

const TRACK_STEPS = [
  { label: "تأكيد الطلب" },
  { label: "يحضّر طلبك" },
  { label: "في الطريق إليك" },
  { label: "قرب الوصول" },
  { label: "تم التسليم بنجاح!" },
];

const VERIFIED_SELLERS = [
  { name: "متجر الأصالة", sales: 320, letter: "ا" },
  { name: "أنامل فلسطينية", sales: 185, letter: "ا" },
  { name: "منتجات غزة الطبيعية", sales: 241, letter: "غ" },
];

const ORDER_PATH = [
  { label: "انتظار", done: true },
  { label: "موافقة", done: true },
  { label: "تحضير", done: true },
  { label: "توصيل", done: true },
  { label: "مكتمل", done: false },
];

const TESTIMONIALS = [
  {
    name: "سارة أحمد",
    role: "مشترية",
    quote: "أفضل تجربة تسوق جربتها! المنتجات أصلية والتوصيل سريع.",
    tag: "عباءة فلسطينية",
  },
  {
    name: "محمد علي",
    role: "صاحب متجر",
    quote: "فتحت متجري ع GAZA GATE وبعت أول أسبوع أكثر من 20 طلب!",
    tag: "متجر ملابس",
  },
  {
    name: "أحمد خالد",
    role: "مشتر",
    quote: "أدعم المنتج الفلسطيني وأتسوق بأمان — GAZA GATE جمعهم معاً.",
    tag: "عسل طبيعي",
  },
];

/* ────────────────────────────────────────────────────────────────
   محتوى المودالات — الأسئلة الشائعة / الشروط والأحكام / سياسة الخصوصية
   ──────────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: "هل التسجيل مجاني؟",
    a: "نعم، التسجيل مجاني تمامًا للمشترين والبائعين.",
  },
  {
    q: "كيف أطلب منتجًا؟",
    a: "أضف ما يعجبك للسلة، وأكمل عملية الدفع.",
  },
  {
    q: "ما طرق الدفع المتاحة؟",
    a: "الدفع كاش عند استلام الطلب فقط.",
  },
  {
    q: "كم يستغرق التوصيل؟",
    a: "متوسط التوصيل 24 ساعة داخل غزة.",
  },
  {
    q: "كيف أتواصل مع البائع؟",
    a: "يمكنك التواصل مباشرة من صفحة المنتج أو عبر خدمة العملاء.",
  },
];

const TERMS_ITEMS = [
  "يُمنع استخدام المنصة لأي أنشطة غير مشروعة.",
  "البائعون مسؤولون عن دقة معلومات منتجاتهم.",
  "نحتفظ بحق تعليق أي حساب يخالف السياسات.",
  "الأسعار المعروضة شاملة الضرائب المطبقة.",
  "نحتفظ بحق تعديل هذه الشروط مع إشعار مسبق.",
];

const PRIVACY_ITEMS = [
  "نقوم بجمع المعلومات الضرورية فقط لإتمام طلباتك وتحسين تجربتك.",
  "لا نشارك بياناتك مع أطراف ثالثة بدون موافقتك.",
  "نحتفظ ببياناتك لفترة لا تتجاوز ما هو ضروري لتقديم الخدمة.",
  "يمكنك طلب حذف بياناتك في أي وقت عبر التواصل معنا.",
];

const MODALS = {
  faq: {
    eyebrow: "مركز المساعدة",
    title: "الأسئلة الشائعة",
    icon: <HelpCircle size={22} />,
  },
  terms: {
    eyebrow: "قبل ما تبدأ",
    title: "الشروط والأحكام",
    icon: <FileText size={22} />,
    intro: "باستخدامك لـ GAZA GATE فأنت توافق على الشروط التالية:",
    items: TERMS_ITEMS,
  },
  privacy: {
    eyebrow: "أمان بياناتك",
    title: "سياسة الخصوصية",
    icon: <Lock size={22} />,
    intro: "نحن في GAZA GATE نلتزم بحماية خصوصيتك.",
    items: PRIVACY_ITEMS,
  },
};

/* مودال موحّد — تصميم بطاقة عائمة فوق خلفية معتّمة، بهوية GAZA GATE نفسها
   (برتقالي + دوائر أيقونات + عناوين bold) بدل صفحة منفصلة */
function InfoModal({ modalKey, onClose }) {
  const [openFaq, setOpenFaq] = useState(-1);
  const data = MODALS[modalKey];

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!data) return null;

  return (
    <div
      className="lp-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lp-modal" role="dialog" aria-modal="true" aria-label={data.title}>
        <button type="button" className="lp-modal-close" onClick={onClose} aria-label="إغلاق">
          <X size={16} />
        </button>

        <div className="lp-modal-head">
          <span className="lp-modal-icon">{data.icon}</span>
          <span className="lp-modal-eyebrow">{data.eyebrow}</span>
          <h3 className="lp-modal-title">{data.title}</h3>
        </div>

        <div className="lp-modal-body">
          {modalKey === "faq" && (
            <div className="lp-modal-faq-list">
              {FAQ_ITEMS.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    className={`lp-modal-faq-item ${isOpen ? "open" : ""}`}
                    key={item.q}
                  >
                    <button
                      type="button"
                      className="lp-modal-faq-q"
                      onClick={() => setOpenFaq(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                    >
                      <span className="lp-modal-faq-q-mark">؟</span>
                      <span className="lp-modal-faq-q-text">{item.q}</span>
                      <ChevronDown size={16} className="lp-modal-faq-chevron" />
                    </button>
                    <div className="lp-modal-faq-a-wrap">
                      <p className="lp-modal-faq-a">{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {modalKey !== "faq" && (
            <>
              <p className="lp-modal-intro">{data.intro}</p>
              <ul className="lp-modal-list">
                {data.items.map((item, i) => (
                  <li className="lp-modal-list-item" key={i}>
                    <span className="lp-modal-list-icon">
                      <Check size={12} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="lp-modal-footer">
          <span className="lp-modal-footer-flag">🇵🇸</span>
          <span>GAZA GATE — منصتك الموثوقة</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // ── إحصائيات حقيقية من الباك: /api/landing ──
  //    landingStats يضل null لحد ما يوصل الرد (بيبين سكيلتون بمكان الأرقام)،
  //    وإذا الطلب فشل بنستخدم أرقام احتياطية بدل ما تضل الصفحة عالقة.
  const [landingStats, setLandingStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/api/landing")
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data) {
          setLandingStats(data);
        } else {
          // الرد وصل لكن بشكل غير متوقع (بدون res.data.data) — بنسجّله
          // بالكونسول حتى نعرف شكل الرد الفعلي ونصلّح المسار إذا لزم.
          console.warn(
            "[/api/landing] الرد وصل لكن بدون res.data.data — الشكل الفعلي:",
            res.data
          );
          setLandingStats(FALLBACK_LANDING_STATS);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // ✅ نطبع سبب الفشل الحقيقي بالكونسول (404 / CORS / Network Error...)
        //    حتى نقدر نشخّص ليش رجعنا للأرقام الاحتياطية.
        console.error(
          "[/api/landing] فشل تحميل الإحصائيات — رح تظهر أرقام احتياطية:",
          err?.response?.status ? `HTTP ${err.response.status}` : err?.message || err
        );
        setLandingStats(FALLBACK_LANDING_STATS);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function openModal(key) {
    return (e) => {
      e.preventDefault();
      setMenuOpen(false);
      setActiveModal(key);
    };
  }

  // ── محاكاة تتبع الطلب: stepIndex بيمثل آخر خطوة "نشطة" وصلها الطلب ──
  //    بتبلش بالخطوة الأخيرة (توصيل مكتمل) وقت التحميل، ولما تدوسي
  //    "إعادة المحاكاة" بترجع للبداية وتمشي خطوة كل 900ms.
  const lastStepIndex = TRACK_STEPS.length - 1;
  const [trackStep, setTrackStep] = useState(lastStepIndex);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (replayIntervalRef.current) clearInterval(replayIntervalRef.current);
    };
  }, []);

  function handleReplay() {
    if (isReplaying) return;
    setIsReplaying(true);
    setTrackStep(0);
    let current = 0;
    replayIntervalRef.current = setInterval(() => {
      current += 1;
      setTrackStep(current);
      if (current >= lastStepIndex) {
        clearInterval(replayIntervalRef.current);
        setIsReplaying(false);
      }
    }, 900);
  }

  const isDelivered = trackStep >= lastStepIndex;

  return (
    <div className="lp" dir="rtl">
      {/* ───────────── Navbar ─────────────
          البنية بالضبط متل الصورة (من اليسار لليمين):
          [زر برتقالي "ابدأ الآن" + أيقونة سلة] .... مسافة كبيرة ....
          [الرئيسية (مفعّل) — المنتجات — البائعون — تواصل] | [اللوجو الكبير] */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          {/* أقصى اليسار: زر CTA + سلة */}
          <div className="lp-nav-left-group">
            <Link to={ONBOARDING_PATH} className="lp-nav-cta">
              ابدأ الآن
            </Link>
            <button type="button" className="lp-nav-cart" aria-label="السلة">
              <ShoppingCart size={18} />
            </button>
          </div>

          {/* زر الهمبرغر — يظهر بالموبايل فقط بدل روابط النافيغيشن */}
          <button
            type="button"
            className="lp-nav-hamburger"
            aria-label="القائمة"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* روابط النافيغيشن — بالدسكتوب، بالوسط/يمين */}
          <nav className="lp-nav-links-desktop">
            <a href="#top" className="active">
              الرئيسية
            </a>
            <Link to={BUYER_ONBOARDING_PATH}>المنتجات</Link>
            <Link to={SELLER_ONBOARDING_PATH}>البائعون</Link>
            <a href="#footer">تواصل</a>
          </nav>

          {/* فاصل عمودي + اللوجو الكبير أقصى اليمين */}
          <div className="lp-nav-logo-group">
            <span className="lp-nav-divider" />
            <Link to="/" className="lp-nav-logo">
              <ThemeLogo className="lp-logo-img" />
            </Link>
          </div>

          {/* القائمة المنسدلة (موبايل فقط) */}
          <nav className={`lp-nav-links-mobile ${menuOpen ? "open" : ""}`}>
            <a href="#top" onClick={() => setMenuOpen(false)}>
              الرئيسية
            </a>
            <Link to={BUYER_ONBOARDING_PATH} onClick={() => setMenuOpen(false)}>
              المنتجات
            </Link>
            <Link to={SELLER_ONBOARDING_PATH} onClick={() => setMenuOpen(false)}>
              البائعون
            </Link>
            <a href="#footer" onClick={() => setMenuOpen(false)}>
              تواصل
            </a>
          </nav>
        </div>
      </header>

      {/* ───────────── Hero ───────────── */}
      <section className="lp-hero" id="top">
        <div className="lp-hero-badge">
          <span className="lp-hero-badge-flag">🇵🇸</span>
          الحل الأول لتتبّع طلباتك في غزة
        </div>
        <h1 className="lp-hero-title">
          <span className="lp-hero-glow" aria-hidden="true" />
          تسوّق بثقة.
          <br />
          <span className="lp-orange">تتبّع كل خطوة.</span>
        </h1>
        <p className="lp-hero-sub">
          بوابة غزة بتوصل البائع بالمشتري بأمان — من أول ما تطلبي لحد ما توصلك.
        </p>
        <div className="lp-hero-actions">
          <Link to={SELLER_ONBOARDING_PATH} className="lp-hero-secondary-link">
            افتح متجرك مجانًا
          </Link>
          <Link to={BUYER_ONBOARDING_PATH} className="lp-btn-primary">
            تسوّق الآن
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div className="lp-hero-stats">
          <div className="lp-hero-stat">
            <strong>
              {landingStats ? (
                `${landingStats.sellersCount}+`
              ) : (
                <span className="lp-num-skeleton" aria-hidden="true" />
              )}
            </strong>
            <span>بائع</span>
          </div>
          <div className="lp-hero-divider" />
          <div className="lp-hero-stat">
            <strong>
              {landingStats ? (
                `${landingStats.productsCount}+`
              ) : (
                <span className="lp-num-skeleton" aria-hidden="true" />
              )}
            </strong>
            <span>منتج</span>
          </div>
          <div className="lp-hero-divider" />
          <div className="lp-hero-stat">
            <strong>98%</strong>
            <span>رضا</span>
          </div>
        </div>
      </section>

      {/* ───────────── ثقة من الطرفين ───────────── */}
      <section className="lp-section" id="trust">
        <span className="lp-eyebrow">
          <Scale size={13} />
          الميزة التنافسية الأولى
        </span>
        <h2 className="lp-heading">ثقة من الطرفين — ليس من طرف واحد</h2>
        <p className="lp-heading-sub">
          كل عملية بيع بتقييم من الطرفين — البائع بيقيّم المشتري، والمشتري بيقيّم البائع.
        </p>

        <div className="lp-trust-row">
          <div className="lp-trust-card">
            <div className="lp-trust-icon lp-trust-icon-store">
              <Store size={26} />
            </div>
            <div className="lp-trust-name">متجر الأصالة</div>
            <div className="lp-trust-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} fill="#f97316" color="#f97316" />
              ))}
            </div>
            <div className="lp-trust-score">4.9 / 5</div>
            <span className="lp-trust-tag">يُقيّم المشتري</span>
          </div>

          <div className="lp-trust-mid">
            <ArrowLeftRight size={20} />
            <span className="lp-trust-mid-label">نظام مزدوج</span>
            <span className="lp-trust-mid-dot" />
          </div>

          <div className="lp-trust-card">
            <div className="lp-trust-icon lp-trust-icon-user">
              <User size={26} />
            </div>
            <div className="lp-trust-name">سارة أحمد</div>
            <div className="lp-trust-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} fill="#f97316" color="#f97316" />
              ))}
            </div>
            <div className="lp-trust-score">4.8 / 5</div>
            <span className="lp-trust-tag">يُقيّم البائع</span>
          </div>
        </div>

        <div className="lp-trust-features">
          <div className="lp-trust-feature-box">
            <span>هويات مُتحقّق منها</span>
            <ShieldCheck size={20} />
          </div>
          <div className="lp-trust-feature-box">
            <span>تقييمات دائمة</span>
            <Lock size={20} />
          </div>
        </div>
      </section>

      {/* ───────────── تتبع الطلب ───────────── */}
      <section className="lp-section lp-section-alt" id="how">
        <span className="lp-eyebrow lp-eyebrow-live">
          <span className="lp-live-dot" />
          LIVE — الميزة التنافسية الثانية
        </span>
        <h2 className="lp-heading">تتبّع طلبك — لحظة بلحظة</h2>
        <p className="lp-heading-sub">اضغطي أي طلب لتشوفي كل معلومة بلحظة زمنها.</p>

        <div className="lp-track-card">
          <div className="lp-track-head">
            <span className={`lp-track-badge ${isDelivered ? "" : "in-progress"}`}>
              <span className="lp-track-badge-dot" />
              {isDelivered ? "مكتمل" : "قيد التوصيل"}
              {isDelivered && <Check size={12} />}
            </span>
            <div className="lp-track-head-info">
              <span className="lp-track-id">طلب #GZ-2847</span>
              <span className="lp-track-desc">
                عبّاءة فلسطينية مطرزة · متجر الأصالة · 180₪
              </span>
            </div>
          </div>

          <div className="lp-track-steps">
            {TRACK_STEPS.map((s, i) => {
              const status =
                i < trackStep ? "done" : i === trackStep ? "active" : "pending";
              return (
                <div className="lp-track-step" key={i}>
                  <span className={`lp-track-dot ${status}`}>
                    {status === "done" && <Check size={14} />}
                    {status === "active" &&
                      (i === lastStepIndex ? (
                        <Package size={14} />
                      ) : (
                        <span className="lp-track-dot-pulse" />
                      ))}
                  </span>
                  <span className="lp-track-step-label">{s.label}</span>
                </div>
              );
            })}
          </div>

          {isDelivered && (
            <>
              <div className="lp-track-note">
                <span className="lp-track-note-emoji">🎉</span>
                <div className="lp-track-note-body">
                  <strong>تم التسليم بنجاح!</strong>
                  <p>استلمتِ طلبك! لا تنسي تقييم البائع وتجربة التوصيل ⭐</p>
                  <div className="lp-track-note-meta">
                    <span>
                      <Clock size={13} /> 11:50 ص
                    </span>
                    <span>
                      <MapPin size={13} /> عندك
                    </span>
                  </div>
                </div>
              </div>

              <div className="lp-track-success-pill">
                <Check size={15} />
                تم تسليم الطلب بنجاح 🎉
              </div>
            </>
          )}

          <button
            type="button"
            className="lp-track-replay"
            onClick={handleReplay}
            disabled={isReplaying}
          >
            <RotateCcw size={12} className={isReplaying ? "spinning" : ""} />
            {isReplaying ? "عم تتحرّك..." : "إعادة المحاكاة"}
          </button>
        </div>
      </section>

      {/* ───────────── Phone mockup + badges ───────────── */}
      <section className="lp-phone-section">
        <div className="lp-badge-chip lp-chip-1">
          <div className="lp-badge-chip-text">
            <span className="lp-badge-chip-title">4.9 تقييم</span>
            <span className="lp-badge-chip-sub">من 240 تقييم</span>
          </div>
          <Star size={16} fill="#f97316" color="#f97316" />
        </div>

        <div className="lp-badge-chip lp-chip-2">
          <div className="lp-badge-chip-text">
            <span className="lp-badge-chip-title">طلب جديد</span>
            <span className="lp-badge-chip-sub">قبل دقائق</span>
          </div>
          <Check size={16} />
        </div>

        <div className="lp-phone">
          <div className="lp-phone-notch" />
          <div className="lp-phone-screen">
            <div className="lp-phone-topbar">
              <span className="lp-phone-brand">GAZA GATE</span>
              <span className="lp-phone-avatar" />
            </div>

            <div className="lp-phone-search">
              <Search size={13} />
              <span>ابحث عن منتج...</span>
            </div>

            {[
              { color: "#7c3f2e", name: "عباءة فلسطينية مطرزة", sub: "ملابس", price: 180 },
              { color: "#1e3a5f", name: "عسل سدر طبيعي أصيل", sub: "أكل", price: 65 },
              { color: "#14532d", name: "حقيبة مطرزة يدويًا", sub: "إكسسوارات يدوية", price: 120 },
            ].map((p) => (
              <div className="lp-phone-product" key={p.name}>
                <span className="lp-phone-product-dot" style={{ background: p.color }} />
                <div className="lp-phone-product-text">
                  <span className="lp-phone-product-name">{p.name}</span>
                  <span className="lp-phone-product-sub">{p.sub}</span>
                </div>
                <span className="lp-phone-product-price">{p.price}₪</span>
              </div>
            ))}

            <div className="lp-phone-tabbar">
              <Home size={16} />
              <Package size={16} />
              <Search size={16} />
              <User size={16} />
            </div>
          </div>
        </div>

        <div className="lp-badge-chip lp-chip-3">
          <div className="lp-badge-chip-text">
            <span className="lp-badge-chip-title">دفع كاش</span>
            <span className="lp-badge-chip-sub">عند استلام الطلب</span>
          </div>
          <Lock size={16} />
        </div>

        <div className="lp-badge-chip lp-chip-4">
          <div className="lp-badge-chip-text">
            <span className="lp-badge-chip-title">توصيل سريع</span>
            <span className="lp-badge-chip-sub">خلال 24 ساعة</span>
          </div>
          <Truck size={16} />
        </div>
      </section>

      {/* ───────────── Stats ───────────── */}
      <section className="lp-stats-row">
        <Stat value={24} suffix=" ساعة" label="متوسط وقت التوصيل" />
        <Stat value={98} suffix="%" label="نسبة رضا العملاء" />
        {landingStats ? (
          <Stat value={landingStats.sellersCount} suffix="+" label="بائع نشط" />
        ) : (
          <StatSkeleton label="بائع نشط" />
        )}
        {landingStats ? (
          <Stat value={landingStats.ordersCount} suffix="+" label="طلب مكتمل" />
        ) : (
          <StatSkeleton label="طلب مكتمل" />
        )}
      </section>

      {/* ───────────── 3 خطوات ───────────── */}
      <section className="lp-section">
        <span className="lp-eyebrow">كيف تبدئين</span>
        <h2 className="lp-heading">
          ثلاث خطوات، <span className="lp-orange">لا أكثر.</span>
        </h2>

        <div className="lp-steps-row">
          {STEPS.map((s) => (
            <div className="lp-step-card" key={s.n}>
              <span className="lp-step-num">{s.n}</span>
              <span className="lp-step-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── الميزات المميزة ───────────── */}
      <section className="lp-section" id="features">
        <h2 className="lp-heading">
          <span className="lp-orange">الميزات</span> المميزة
        </h2>
        <p className="lp-heading-sub">كل ما تحتاجه في منصة واحدة</p>

        <div className="lp-bento">
          <div className="lp-bento-heart-badge">
            <Heart size={18} />
          </div>

          <div className="lp-bento-left">
            <div className="lp-bento-stat">
              <div className="lp-bento-stat-value">
                98<span>%</span>
              </div>
              <div className="lp-bento-stat-label">رضا العملاء</div>
            </div>

            <div className="lp-bento-search">
              {/* قبال "متجر الأصالة" */}
              <div className="lp-bento-rating-row">
                <div className="lp-bento-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} fill="#f97316" color="#f97316" />
                  ))}
                </div>
                <div className="lp-bento-search-pill">
                  <Search size={13} />
                  بحث ذكي
                </div>
              </div>

              {/* قبال "أنامل فلسطينية" */}
              <div className="lp-bento-rating-row">
                <div className="lp-bento-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} fill="#f97316" color="#f97316" />
                  ))}
                </div>
                <div className="lp-bento-search-input">
                  <Search size={13} />
                  عباءة فلسطين...
                </div>
              </div>

              {/* قبال "منتجات غزة الطبيعية" */}
              <div className="lp-bento-rating-row lp-bento-rating-row-solo">
                <div className="lp-bento-stars">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Star key={i} size={13} fill="#f97316" color="#f97316" />
                  ))}
                </div>
              </div>

              <div className="lp-bento-tags">
                <span>ملابس</span>
                <span>أكل</span>
                <span>أشغال يدوية</span>
                <span>إكسسوارات</span>
              </div>
            </div>
          </div>

          <div className="lp-bento-sellers">
            <div className="lp-bento-sellers-head">
              بائعون موثوقون
              <Check size={15} />
            </div>
            <p>كل بائع يمر بعملية تحقق صارمة قبل الانضمام</p>

            <div className="lp-bento-sellers-list">
              {VERIFIED_SELLERS.map((s) => (
                <div className="lp-bento-seller-item" key={s.name}>
                  <span className="lp-bento-seller-avatar">{s.letter}</span>
                  <div className="lp-bento-seller-text">
                    <span className="lp-bento-seller-name">{s.name}</span>
                    <span className="lp-bento-seller-sales">{s.sales} مبيعة</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-bento-path">
            <div className="lp-bento-path-head">
              مسار الطلب — من البائع إلى بابك <Package size={16} />
            </div>
            <div className="lp-bento-path-row">
              {ORDER_PATH.map((step, i) => (
                <div className="lp-bento-path-step" key={i}>
                  <span className={`lp-bento-path-dot ${step.done ? "done" : ""}`} />
                  <span className="lp-bento-path-label">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ───────────── آراء المستخدمين ───────────── */}
      <section className="lp-section" id="testimonials">
        <h2 className="lp-heading">ماذا يقول مستخدمونا؟</h2>

        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div className="lp-testimonial-card" key={t.name}>
              <Quote size={26} className="lp-quote-icon" />
              <p>{t.quote}</p>
              <span className="lp-testimonial-tag">{t.tag}</span>

              <div className="lp-testimonial-footer">
                <div className="lp-testimonial-user">
                  <span className="lp-avatar lp-avatar-sm">{t.name[0]}</span>
                  <div>
                    <div className="lp-testimonial-name">{t.name}</div>
                    <div className="lp-testimonial-role">{t.role}</div>
                  </div>
                </div>
                <div className="lp-testimonial-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} fill="#f97316" color="#f97316" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── CTA ───────────── */}
      <section className="lp-cta">
        <h2>لديك مشروع؟</h2>
        <p className="lp-cta-sub">افتح متجرك اليوم — مجانًا</p>
        <p className="lp-cta-desc">
          انضم لمئات البائعين وابدأ تبيع لآلاف المشترين بخطوات بسيطة وبدون أي رسوم
        </p>

        <div className="lp-cta-checks">
          <span>
            <Check size={12} />
            تسجيل مجاني
          </span>
          <span>
            <Check size={12} />
            لا عمولة على المبيعات
          </span>
          <span>
            <Check size={12} />
            دعم فني 24/7
          </span>
        </div>

        <Link to={SELLER_ONBOARDING_PATH} className="lp-btn-primary lp-btn-large">
          ابدأ الآن
          <ArrowLeft size={18} />
        </Link>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="lp-footer" id="footer">
        <div className="lp-footer-grid">
          <div className="lp-footer-col lp-footer-brand">
            <span className="lp-footer-logo">GAZA GATE</span>
            <p>منصة رقمية تجمع أصحاب المشاريع والعملاء في مكان واحد</p>
            <div className="lp-social-row">
              <Instagram size={16} />
              <Linkedin size={16} />
              <MessageCircle size={16} />
              <Music2 size={16} />
            </div>
          </div>

          <div className="lp-footer-col">
            <h4>روابط سريعة</h4>
            <a href="#top">الرئيسية</a>
            <Link to={BUYER_ONBOARDING_PATH}>المنتجات</Link>
            <Link to={SELLER_ONBOARDING_PATH}>للبائعين</Link>
            <a href="#footer">تواصل معنا</a>
          </div>

          <div className="lp-footer-col">
            <h4>الدعم</h4>
            <a href="#" onClick={openModal("faq")}>الأسئلة الشائعة</a>
            <a href="#" onClick={openModal("privacy")}>سياسة الخصوصية</a>
            <a href="#" onClick={openModal("terms")}>الشروط والأحكام</a>
          </div>

          <div className="lp-footer-col">
            <h4>تواصل معنا</h4>
            <span>
              <Mail size={13} /> gazagate.support@gmail.com
            </span>
            <span>
              <Phone size={13} /> واتساب: XXXX-XXXX
            </span>
            <span>
              <Clock size={13} /> متاحون 24/7 لخدمتك
            </span>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <span>© 2026 GAZA GATE 🇵🇸 — جميع الحقوق محفوظة</span>
        </div>
      </footer>

      {activeModal && (
        <InfoModal modalKey={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}