import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
export default function SplashScreen() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // بعد ثانيتين يبدأ يختفي
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 2000);

    // بعد 3 ثواني يروح لصفحة اللوغين
    const navTimer = setTimeout(() => {
      navigate("/onboarding");
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#ffffff",
    }}>
      <img
        src={logo}
        alt="Gaza Gate"
        style={{
          width: "350px",
          opacity: visible ? 1 : 0,
          transition: "opacity 1s ease-in-out",
        }}
      />
    </div>
  );
}