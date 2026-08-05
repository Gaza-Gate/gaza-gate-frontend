import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme.jsx";
import { Sun, Moon, Monitor, Check, ChevronDown } from "lucide-react";
import "./ThemeToggle.css";

const OPTIONS = [
  { mode: "light", label: "الوضع النهاري", Icon: Sun },
  { mode: "dark", label: "الوضع الليلي", Icon: Moon },
  { mode: "system", label: "حسب النظام", Icon: Monitor },
];

export default function ThemeToggle({ size = 18, variant = "navbar" }) {
  const { mode, isDark, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const active =
    OPTIONS.find((option) => option.mode === mode) ?? OPTIONS[0];
  const ActiveIcon = active.Icon;

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function selectTheme(nextMode) {
    setMode(nextMode);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`tt-wrap tt-wrap--${variant} ${isDark ? "tt-wrap--dark" : ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`tt-btn tt-btn--${variant} ${isDark ? "tt-btn--active-dark" : ""}`}
        aria-label={`الثيم: ${active.label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={active.label}
        data-mode={mode}
      >
        <ActiveIcon
          size={size}
          className={`tt-icon ${isDark ? "tt-icon--dark" : "tt-icon--light"}`}
        />
        {variant === "navbar" && (
          <ChevronDown size={14} className={`tt-chevron ${open ? "tt-chevron--open" : ""}`} />
        )}
      </button>

      {open && (
        <div className="tt-menu" role="listbox" aria-label="اختيار الثيم">
          {OPTIONS.map(({ mode: optionMode, label, Icon }) => {
            const selected = mode === optionMode;
            return (
              <button
                key={optionMode}
                type="button"
                role="option"
                aria-selected={selected}
                className={`tt-menu-item ${selected ? "tt-menu-item--active" : ""}`}
                onClick={() => selectTheme(optionMode)}
              >
                <Icon size={16} className="tt-menu-icon" />
                <span>{label}</span>
                {selected && <Check size={14} className="tt-menu-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
