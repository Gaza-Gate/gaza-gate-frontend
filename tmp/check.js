import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, Menu, X, ArrowLeftRight } from "lucide-react";
import ThemeLogo from "./ThemeLogo";
import ConvertToBuyerModal from "./ConvertToBuyerModal";
import { logout } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import "./SellerNavbar.css";
const NAV_LINKS = [
  { to: "/seller/dashboard", label: "\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645" },
  { to: "/seller/products", label: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A" },
  { to: "/store-profile", label: "\u0645\u0644\u0641 \u0627\u0644\u0645\u062A\u062C\u0631" }
];
const MORE_LINKS = [
  { to: "/seller/orders", label: "\u0627\u0644\u0637\u0644\u0628\u0627\u062A" },
  { to: "/seller/ratings", label: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A" },
  { to: "/seller/messages", label: "\u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0627\u062A" }
];
function SellerNavbar() {
  const {
    switchRoleAndNavigate,
    becomeCustomer,
    logout: authLogout,
    currentRole,
    isSwitchingRole,
    isBecomingCustomer
  } = useAuth();
  const isConverting = isSwitchingRole || isBecomingCustomer;
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    function handleClick() {
      setShowMore(false);
    }
    if (showMore) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showMore]);
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      authLogout();
      setLoggingOut(false);
      navigate("/login/seller");
    }
  }
  function handleOpenConvertModal() {
    setShowMore(false);
    setMobileMenuOpen(false);
    setShowConvertModal(true);
  }
  async function handleConfirmConvert() {
    setShowConvertModal(false);
    try {
      let result;
      try {
        result = await becomeCustomer();
        navigate("/home/customer", { replace: true });
      } catch (err) {
        if (err.response?.status === 409) {
          await switchRoleAndNavigate("customer", navigate, {
            path: "/home/customer",
            replace: true
          });
          return;
        } else {
          throw err;
        }
      }
      if (result?.reconnectSocket) {
        const { connectSocket, disconnectSocket } = await import("../utils/socket");
        disconnectSocket();
        connectSocket();
      }
    } catch (error) {
      console.error("\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0634\u062A\u0631\u064A:", error);
    }
  }
  const allLinksForMobile = [...NAV_LINKS, ...MORE_LINKS];
  return /* @__PURE__ */ React.createElement("nav", { className: "snb-nav", dir: "rtl" }, /* @__PURE__ */ React.createElement(Link, { to: "/seller/dashboard", className: "snb-logo-link" }, /* @__PURE__ */ React.createElement(ThemeLogo, { className: "snb-logo" })), /* @__PURE__ */ React.createElement("div", { className: "snb-links snb-links-desktop" }, NAV_LINKS.map((item) => /* @__PURE__ */ React.createElement(
    Link,
    {
      key: item.to,
      to: item.to,
      className: `snb-link ${location.pathname.startsWith(item.to) ? "snb-link-active" : ""}`
    },
    item.label
  )), /* @__PURE__ */ React.createElement("div", { className: "snb-dropdown" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "snb-dropdown-btn",
      onClick: (e) => {
        e.stopPropagation();
        setShowMore((s) => !s);
      }
    },
    /* @__PURE__ */ React.createElement(ChevronDown, { size: 16, className: `snb-dropdown-icon ${showMore ? "open" : ""}` }),
    "\u0627\u0644\u0645\u0632\u064A\u062F"
  ), showMore && /* @__PURE__ */ React.createElement("div", { className: "snb-dropdown-menu" }, MORE_LINKS.map((item) => /* @__PURE__ */ React.createElement(Link, { key: item.to, to: item.to, className: "snb-dropdown-item" }, item.label)))), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "snb-link snb-link-btn snb-convert-btn",
      onClick: handleOpenConvertModal,
      disabled: isConverting
    },
    /* @__PURE__ */ React.createElement(ArrowLeftRight, { size: 15 }),
    "\u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0644\u0645\u0634\u062A\u0631\u064A"
  )), /* @__PURE__ */ React.createElement("div", { className: "snb-actions snb-actions-desktop" }, /* @__PURE__ */ React.createElement(ThemeToggle, { variant: "navbar", size: 18 }), /* @__PURE__ */ React.createElement(NotificationBell, { role: "seller" }), /* @__PURE__ */ React.createElement("button", { className: "snb-logout-btn", onClick: handleLogout, disabled: loggingOut }, /* @__PURE__ */ React.createElement(LogOut, { size: 16, color: "#f97316" }), loggingOut ? "\u062C\u0627\u0631\u064A \u0627\u0644\u062E\u0631\u0648\u062C..." : "\u062E\u0631\u0648\u062C")), /* @__PURE__ */ React.createElement("div", { className: "snb-actions snb-actions-mobile", "aria-label": "\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0633\u0631\u064A\u0639\u0629" }, /* @__PURE__ */ React.createElement(NotificationBell, { role: "seller" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "snb-hamburger-btn",
      "aria-label": "\u0641\u062A\u062D \u0627\u0644\u0642\u0627\u0626\u0645\u0629",
      onClick: (e) => {
        e.stopPropagation();
        setMobileMenuOpen((s) => !s);
      }
    },
    mobileMenuOpen ? /* @__PURE__ */ React.createElement(X, { size: 22 }) : /* @__PURE__ */ React.createElement(Menu, { size: 22 })
  )), mobileMenuOpen && /* @__PURE__ */ React.createElement("div", { className: "snb-mobile-menu", onClick: (e) => e.stopPropagation() }, allLinksForMobile.map((item) => /* @__PURE__ */ React.createElement(
    Link,
    {
      key: item.to,
      to: item.to,
      className: `snb-mobile-link ${location.pathname.startsWith(item.to) ? "snb-link-active" : ""}`
    },
    item.label
  )), /* @__PURE__ */ React.createElement("button", { type: "button", className: "snb-mobile-link snb-mobile-link-btn", onClick: handleOpenConvertModal, disabled: isConverting }, /* @__PURE__ */ React.createElement(ArrowLeftRight, { size: 16 }), "\u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0644\u0645\u0634\u062A\u0631\u064A"), /* @__PURE__ */ React.createElement("div", { className: "snb-mobile-divider" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "snb-mobile-link snb-mobile-link-btn",
      onClick: () => {
        setMobileMenuOpen(false);
        navigate("/seller/notifications");
      }
    },
    "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A"
  ), /* @__PURE__ */ React.createElement("button", { className: "snb-mobile-link snb-mobile-link-btn snb-mobile-logout", onClick: handleLogout, disabled: loggingOut }, /* @__PURE__ */ React.createElement(LogOut, { size: 16, color: "#f97316" }), loggingOut ? "\u062C\u0627\u0631\u064A \u0627\u0644\u062E\u0631\u0648\u062C..." : "\u062E\u0631\u0648\u062C")), showConvertModal && /* @__PURE__ */ React.createElement(
    ConvertToBuyerModal,
    {
      isOpen: showConvertModal,
      onClose: () => !isConverting && setShowConvertModal(false),
      onConfirm: handleConfirmConvert,
      isLoading: isConverting
    }
  ));
}
export {
  SellerNavbar as default
};
