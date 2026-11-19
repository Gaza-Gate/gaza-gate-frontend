import logoLight from "../assets/logo.png";
// ✅ اللوغو الرسمي المعتمد للثيم الداكن (على شاشات Splash/Onboarding/Login/SignUp
//    وأي مكان يظهر فيه على خلفية كحلية). بدون أي خلفية أو ظل أو توهج.
import logoDark from "../assets/logo-auth-dark.jpg";
import { useTheme } from "../hooks/useTheme.jsx";

/**
 * Theme-aware Gaza Gate logo — light logo in light mode, dark logo in dark mode.
 *
 * Props:
 *   - `variant="default"`  : الافتراضي — يستخدم الـ index.css للـ box-shadow/drop-shadow
 *                            على الـ navbar (سابقاً كان فيه glow، تم إزالته).
 *   - `variant="auth"`     : للشاشات الترحيبية وتسجيل الدخول — شفاف تماماً بدون أي
 *                            box-shadow / drop-shadow / filter. يندمج مع الخلفية الكحلية.
 *   - `transparent`        : إضافة explicit: background-color: transparent (دفاع إضافي).
 */
export default function ThemeLogo({
  alt = "Gaza Gate",
  className = "",
  variant = "default",
  transparent = false,
  ...props
}) {
  const { isDark } = useTheme();
  const src = isDark ? logoDark : logoLight;

  const baseStyle = transparent || variant === "auth"
    ? {
        background: "transparent",
        backgroundColor: "transparent",
        boxShadow: "none",
        filter: "none",
      }
    : {};

  const combinedClassName = variant === "auth"
    ? `${className} theme-logo--auth`.trim()
    : className;

  return (
    <img
      src={src}
      alt={alt}
      className={combinedClassName}
      style={Object.keys(baseStyle).length ? baseStyle : undefined}
      {...props}
    />
  );
}
