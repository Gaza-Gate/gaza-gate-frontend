 import { useEffect } from "react";
import { Wrench } from "lucide-react";
import "./SimpleToast.css";

/**
 * SimpleToast — رسالة منبثقة بسيطة بزاوية الشاشة، تختفي تلقائياً.
 *
 * الاستخدام (من أي كومبوننت):
 *   const [toastMsg, setToastMsg] = useState("");
 *   ...
 *   <button onClick={() => setToastMsg("هذه الخدمة تحت التطوير")}>المحفظة</button>
 *   {toastMsg && <SimpleToast message={toastMsg} onDone={() => setToastMsg("")} />}
 *
 * props:
 *   message  — النص المعروض
 *   duration — مدة الظهور بالميلي ثانية (افتراضي 2500)
 *   onDone   — بتستدعى تلقائياً بعد انتهاء المدة (لتصفير الـ state بالأب)
 */
export default function SimpleToast({ message, duration = 2500, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div className="simple-toast" dir="rtl" role="status">
      <Wrench size={16} />
      <span>{message}</span>
    </div>
  );
}