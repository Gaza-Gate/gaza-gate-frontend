import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Plus,
  Trash2,
  Pencil,
  LogOut,
  User,
  ChevronLeft,
} from "lucide-react";
 import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  getCustomerProfile,
  updateCustomerProfile,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  getAuthToken,
} from "../services/authService";
import logo from "../assets/logo.png";
import "./CustomerProfile.css";

const emptyForm = {
  neighborhood: "",
  street: "",
  notes: "",
};
export default function CustomerProfile() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const token = getAuthToken();

  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");

  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!token) {
        navigate("/login/customer");
        return;
      }
      const data = await getCustomerProfile(token);
      setProfile(data);
      setAddresses(data.addresses || []);
      setEditForm({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || "",
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      if (err.message?.includes("token") || err.message?.includes("Invalid") || err.message?.includes("expired")) {
        localStorage.removeItem("token");
        navigate("/login/customer");
        return;
      }
      setError(err.message || "تعذر جلب بيانات الملف الشخصي");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    sessionStorage.removeItem("token");
    navigate("/login/customer");
  };

  // ── تعديل الملف الشخصي ──
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    try {
      await updateCustomerProfile(
        {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phone: editForm.phone,
        },
        token
      );
      setProfile((prev) => ({ ...prev, ...editForm }));
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err.message || "تعذر حفظ التعديلات");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── العناوين ──
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

const handleAddAddress = async () => {
  if (!form.neighborhood || !form.street) return;
  setAddressLoading(true);
  setAddressError("");
  try {
    const newAddress = await addCustomerAddress(
      {
        neighborhood: form.neighborhood,
        street: form.street,
        notes: form.notes,
      },
      token
    );
    setAddresses((prev) => [...prev, newAddress]);
    setForm(emptyForm);
    setShowForm(false);
  } catch (err) {
    setAddressError(err.message || "تعذر إضافة العنوان");
  } finally {
    setAddressLoading(false);
  }
};

const handleDeleteAddress = async (id) => {
  try {
    await deleteCustomerAddress(id, token);
    setAddresses((prev) => prev.filter((a) => (a.id ?? a._id) !== id));
  } catch (err) {
    setAddressError(err.message || "تعذر حذف العنوان");
  }
};

  const handleSetDefault = async (id) => {
    try {
      await updateCustomerAddress(id, { isDefault: true }, token);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: (a.id ?? a._id) === id }))
      );
    } catch (err) {
      setAddressError(err.message || "تعذر تحديث العنوان الافتراضي");
    }
  };

  if (loading) {
    return (
      <div className="cprof-wrapper" dir="rtl">
        
        <main className="cprof-main">
          <p style={{ textAlign: "center", padding: "40px 0" }}>جاري التحميل...</p>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="cprof-wrapper" dir="rtl">
         <main className="cprof-main">
          <p style={{ textAlign: "center", padding: "40px 0", color: "#dc2626" }}>
            {error || "تعذر تحميل الملف الشخصي"}
          </p>
        </main>
      </div>
    );
  }

  const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "بدون اسم";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="cprof-wrapper" dir="rtl">
      

      <main className="cprof-main">
        <nav className="cprof-breadcrumb">
          <button onClick={() => navigate("/home/customer")}>الرئيسية</button>
          <ChevronLeft size={14} />
        </nav>

        {/* ── Profile Banner ── */}
        <div className="cprof-banner">
          <div className="cprof-banner-content">
            <div className="cprof-avatar">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={fullName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                />
              ) : editingProfile ? (
                <User size={28} />
              ) : (
                initials
              )}
            </div>
            <div className="cprof-info">
              {editingProfile ? (
                <div className="cprof-edit-fields">
                  <input
                    className="cprof-edit-input"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="الاسم الأول"
                  />
                  <input
                    className="cprof-edit-input"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="الاسم الثاني"
                  />
                  <input
                    className="cprof-edit-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="رقم الجوال"
                  />
                </div>
              ) : (
                <>
                  <h1 className="cprof-name">{fullName}</h1>
                  <p className="cprof-email">{profile.email}</p>
                  <p className="cprof-phone">{profile.phone || "لا يوجد رقم هاتف"}</p>
                </>
              )}
            </div>
          </div>

          <button
            className="cprof-edit-btn"
            onClick={() => {
              if (editingProfile) {
                handleSaveProfile();
              } else {
                setEditingProfile(true);
              }
            }}
            aria-label="تعديل الملف"
            disabled={savingProfile}
          >
            <Pencil size={15} />
          </button>
        </div>

        {editingProfile && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "flex-end" }}>
            <button
              onClick={() => setEditingProfile(false)}
              style={{
                padding: "8px 16px",
                background: "#fff",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              إلغاء
            </button>
          </div>
        )}
        {profileError && (
          <p style={{ color: "#dc2626", fontSize: 13, textAlign: "center", marginBottom: 12 }}>
            {profileError}
          </p>
        )}

        {/* ── Addresses Section ── */}
        <section className="cprof-addresses">
          <div className="cprof-addresses-head">
            <div className="cprof-addresses-title">
              <MapPin size={18} />
              <h2>عناوين الشحن ({addresses.length})</h2>
            </div>
            <button
              className="cprof-add-btn"
              onClick={() => setShowForm((v) => !v)}
            >
              إضافة عنوان
              <Plus size={16} />
            </button>
          </div>

          {addressError && (
            <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
              {addressError}
            </p>
          )}

{showForm && (
  <div className="cprof-form">
    <h3 className="cprof-form-title">عنوان جديد</h3>
    <div className="cprof-form-grid">
      <div className="cprof-field">
        <label>الحي</label>
        <input
          value={form.neighborhood}
          onChange={(e) => handleFormChange("neighborhood", e.target.value)}
          placeholder="مثال: الصبرة"
        />
      </div>
      <div className="cprof-field">
        <label>الشارع</label>
        <input
          value={form.street}
          onChange={(e) => handleFormChange("street", e.target.value)}
          placeholder="مثال: شارع 8"
        />
      </div>
      <div className="cprof-field cprof-field--full">
        <label>ملاحظات (اختياري)</label>
        <input
          value={form.notes}
          onChange={(e) => handleFormChange("notes", e.target.value)}
          placeholder="أي تفاصيل إضافية تساعد بالتوصيل"
        />
      </div>
    </div>
    <div className="cprof-form-actions">
      <button
        className="cprof-form-cancel"
        onClick={() => {
          setShowForm(false);
          setForm(emptyForm);
        }}
        disabled={addressLoading}
      >
        إلغاء
      </button>
      <button
        className="cprof-form-submit"
        onClick={handleAddAddress}
        disabled={addressLoading}
      >
        {addressLoading ? "جاري الإضافة..." : "إضافة"}
      </button>
    </div>
  </div>
)}
{addresses.length === 0 ? (
  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0" }}>
    لا توجد عناوين محفوظة بعد
  </p>
) : (
  <ul className="cprof-address-list">
    {addresses.map((addr) => {
      const id = addr.id ?? addr._id;
      return (
        <li className="cprof-address-card" key={id}>
          <button
            className="cprof-address-delete"
            onClick={() => handleDeleteAddress(id)}
            aria-label="حذف العنوان"
          >
            <Trash2 size={15} />
          </button>

          <div className="cprof-address-body">
            <p className="cprof-address-name">{addr.neighborhood}</p>
            <p className="cprof-address-text">
              {addr.street}
              {addr.notes ? ` — ${addr.notes}` : ""}
            </p>
          </div>

          <span className="cprof-address-pin">
            <MapPin size={18} />
          </span>
        </li>
      );
    })}
  </ul>
)}
        </section>

        <button className="cprof-logout" onClick={handleLogout}>
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </main>
    </div>
  );
}