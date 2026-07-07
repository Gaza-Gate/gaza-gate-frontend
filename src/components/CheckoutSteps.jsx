import { Check } from "lucide-react";
import "./CheckoutSteps.css";

const steps = [
  { num: 1, label: "مراجعة الطلب" },
  { num: 2, label: "طريقة الدفع" },
  { num: 3, label: "تأكيد" },
];

export default function CheckoutSteps({ current = 1 }) {
  return (
    <div className="ck-steps">
      {steps.map((step, idx) => {
        const isDone = step.num < current;
        const isActive = step.num === current;
        const isLast = idx === steps.length - 1;

        return (
          <div className="ck-step-wrap" key={step.num}>
            <div className="ck-step">
              <span
                className={`ck-step-circle ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
              >
                {isDone ? <Check size={18} strokeWidth={3} /> : step.num}
              </span>
              <span
                className={`ck-step-label ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`ck-step-line ${isDone ? "done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
