import { useEffect, useRef, useState } from "react";
import { Link2, Copy, Check, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { checkStoreSlugAvailability, updateStoreSlug } from "../services/profileService";
import "./StoreSlugField.css";

/**
 * StoreSlugField — رابط المتجر بالاسم بصفحة "تعديل الملف الشخصي للمتجر"
 *
 *   gazagate.store/store/ [ hala-beauty ]  ✓ متاح   [حفظ الرابط]
 *
 * - فحص فوري وهو بيكتب (debounce): متاح / محجوز + اقتراح / غير صالح.
 * - الحفظ منفصل عن باقي الفورم (endpoint خاص + مرة كل 30 يوم).
 * - الرابط القديم بيضل يحوّل للجديد للأبد (الباك بيحفظه بالـ history).
 * - تغيير "اسم المتجر" ما بيغيّر الرابط.
 *
 * Props:
 *   initialSlug        — الرابط الحالي من GET /api/seller/profile (ممكن null)
 *   nextSlugChangeAt   — ISO date لو التغيير مقفول حالياً، وإلا null
 */

const CHECK_DELAY_MS = 450;
const SLUG_MAX = 40;

const REASON_TEXT = {
  invalid: "الرابط لازم يكون من 3 لـ 40 حرف: حروف إنجليزية صغيرة وأرقام وشرطة (-) بس",
  reserved: "هالكلمة محجوزة للموقع، اختار رابط تاني",
  taken: "هالرابط مستخدم من متجر تاني",
};

// نفس تنظيف الباك تقريباً — عشان اللي بيشوفه هو اللي رح ينحفظ
function normalizeInput(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, SLUG_MAX);
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function StoreSlugField({ initialSlug, nextSlugChangeAt: initialLockedUntil }) {
  const [savedSlug, setSavedSlug] = useState(initialSlug || "");
  const [value, setValue] = useState(initialSlug || "");
  const [lockedUntil, setLockedUntil] = useState(initialLockedUntil || null);
  // status: idle | checking | available | current | unavailable | error
  const [check, setCheck] = useState({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { type: "success" | "error", text }
  const [copied, setCopied] = useState(false);
  const requestIdRef = useRef(0);

  const host = window.location.host;
  const fullUrl = `${window.location.origin}/store/${savedSlug}`;
  const isLocked = Boolean(lockedUntil && new Date(lockedUntil) > new Date());
  const changed = value && value !== savedSlug;

  // ── فحص فوري (debounce) ──
  useEffect(() => {
    if (!value || value === savedSlug) {
      setCheck({ status: value ? "current" : "idle" });
      return undefined;
    }
    setCheck({ status: "checking" });
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const result = await checkStoreSlugAvailability(value);
        if (requestId !== requestIdRef.current) return; // رد قديم
        if (result?.available) {
          setCheck({ status: result.reason === "current" ? "current" : "available" });
        } else {
          setCheck({ status: "unavailable", reason: result?.reason, suggestion: result?.suggestion });
        }
      } catch {
        if (requestId === requestIdRef.current) setCheck({ status: "error" });
      }
    }, CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, savedSlug]);

  const handleChange = (e) => {
    setSaveMsg(null);
    setValue(normalizeInput(e.target.value));
  };

  const handleSave = async () => {
    if (!changed || check.status !== "available" || isLocked) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const result = await updateStoreSlug(value);
      setSavedSlug(result.slug);
      setValue(result.slug);
      setLockedUntil(result.nextSlugChangeAt || null);
      setSaveMsg({ type: "success", text: "تم حفظ رابط متجرك. الرابط القديم بيضل يوصّل للمتجر." });
    } catch (err) {
      setSaveMsg({
        type: "error",
        text: err?.response?.data?.data?.message || err?.response?.data?.message || "ما قدرنا نحفظ الرابط، حاول كمان مرة",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="esp-field ssf">
      <div className="esp-field-label-icon">
        <span>رابط متجرك</span>
        <Link2 size={16} />
      </div>

      <div className={`ssf-input-row ${isLocked ? "ssf-input-row--locked" : ""}`} dir="ltr">
        <span className="ssf-prefix">{host}/store/</span>
        <input
          className="ssf-input"
          value={value}
          onChange={handleChange}
          placeholder="my-store"
          disabled={isLocked || saving}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="رابط المتجر"
        />
      </div>

      {/* حالة الفحص */}
      <div className="ssf-status" aria-live="polite">
        {check.status === "checking" && (
          <span className="ssf-muted"><Loader2 size={14} className="ssf-spin" /> جاري الفحص…</span>
        )}
        {check.status === "available" && (
          <span className="ssf-ok"><CheckCircle2 size={14} /> متاح</span>
        )}
        {check.status === "unavailable" && (
          <span className="ssf-bad">
            <AlertCircle size={14} /> {REASON_TEXT[check.reason] || REASON_TEXT.invalid}
            {check.suggestion && (
              <>
                {" "}— جرّب{" "}
                <button type="button" className="ssf-suggestion" onClick={() => setValue(check.suggestion)}>
                  {check.suggestion}
                </button>
              </>
            )}
          </span>
        )}
        {check.status === "error" && (
          <span className="ssf-bad"><AlertCircle size={14} /> ما قدرنا نفحص الرابط هلأ</span>
        )}
      </div>

      {isLocked && (
        <div className="esp-field-note">
          <Clock size={14} />
          <span>بتقدر تغيّر رابط متجرك مرة كل 30 يوم — التغيير الجاي بعد {formatDate(lockedUntil)}</span>
        </div>
      )}

      <div className="ssf-actions">
        {changed && !isLocked && (
          <button
            type="button"
            className="ssf-save"
            onClick={handleSave}
            disabled={saving || check.status !== "available"}
          >
            {saving ? <Loader2 size={15} className="ssf-spin" /> : null}
            حفظ الرابط
          </button>
        )}
        {savedSlug && (
          <button type="button" className="ssf-copy" onClick={handleCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
        )}
      </div>

      {saveMsg && (
        <div className={saveMsg.type === "success" ? "esp-success" : "esp-error"}>{saveMsg.text}</div>
      )}

      {!isLocked && (
        <div className="ssf-hint">
          تغيير اسم المتجر ما بيغيّر الرابط. وإذا غيّرت الرابط، الرابط القديم والـ QR المطبوع بيضلّوا شغّالين.
        </div>
      )}
    </div>
  );
}
