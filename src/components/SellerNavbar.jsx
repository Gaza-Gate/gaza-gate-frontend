import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, ChevronDown } from "lucide-react";
import logo from "../assets/logo.png";
import "./SellerNavbar.css";

const NAV_LINKS = [
  { to: "/seller/dashboard", label: "لوحة التحكم" },
  { to: "/seller/products", label: "المنتجات" },
  { to: "/store-profile", label: "ملف المتجر" },
];

const MORE_LINKS = [
  { to: "/seller/orders", label: "الطلبات" },
  { to: "/seller/ratings", label: "التقييمات" },
  { to: "/seller/messages", label: "المراسلات" },
];

export default function SellerNavbar({ hasNotification = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    function handleClick() {
      setShowMore(false);
    }
    if (showMore) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showMore]);

  function handleLogout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login/seller");
  }

  return (
    <nav className="snb-nav" dir="rtl">
      <Link to="/seller/dashboard" className="snb-logo-link">
        <img src={logo} alt="Gaza Gate" className="snb-logo" />
      </Link>

      <div className="snb-links">
        {NAV_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`snb-link ${location.pathname.startsWith(item.to) ? "snb-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}

        <div className="snb-dropdown">
          <button
            className="snb-dropdown-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMore((s) => !s);
            }}
          >
            <ChevronDown size={16} className={`snb-dropdown-icon ${showMore ? "open" : ""}`} />
            المزيد
          </button>
          {showMore && (
            <div className="snb-dropdown-menu">
              {MORE_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className="snb-dropdown-item">
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="snb-actions">
        <button
          className="snb-bell-btn"
          aria-label="الإشعارات"
          onClick={() => navigate("/seller/notifications")}
        >
          <Bell size={20} color="#374151" />
          {hasNotification && <span className="snb-bell-dot" />}
        </button>
        <button className="snb-logout-btn" onClick={handleLogout}>
          <LogOut size={16} color="#f97316" />
          خروج
        </button>
      </div>
    </nav>
  );
}