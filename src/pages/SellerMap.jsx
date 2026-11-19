import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Search,
  Navigation,
  Plus,
  Minus,
  LocateFixed,
  X,
  Star,
  Store,
  PackageSearch,
} from "lucide-react";
import SellerNavbar from "../components/SellerNavbar";
import SimpleToast from "../components/SimpleToast";
import {
  getMapStores,
  getMyStoreLocation,
  upsertMyStoreLocation,
  extractApiErrorMessage,
} from "../services/mapService";
import "./SellerMap.css";

// ── مركز غزة الافتراضي (يُستخدم لو المستخدم رفض إذن الموقع) ──
const GAZA_CENTER = [31.5017, 34.4668];

// ── أيقونة دبوس مخصصة (Leaflet divIcon) ──
function buildPinIcon(variant = "default") {
  const cls =
    variant === "selected"
      ? "smap-pin smap-pin--selected"
      : variant === "mine"
      ? "smap-pin smap-pin--mine"
      : "smap-pin";
  return L.divIcon({
    className: "",
    html: `<div class="${cls}"><div class="smap-pin-inner">●</div></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

// ── تحويل رد الباك (store من /api/map/stores) لشكل بنستخدمه بالواجهة ──
function normalizeStore(raw) {
  return {
    id: raw.id,
    name: raw.storeName,
    avatar: raw.avatar,
    rating: raw.rating ?? 0,
    ratingCount: raw.ratingCount ?? 0,
    distanceKm: raw.distanceKm, // Number أو null
    neighborhood: raw.neighborhood,
    street: raw.street,
    position: [raw.latitude, raw.longitude],
    latitude: raw.latitude,
    longitude: raw.longitude,
    actionUrl: raw.actionUrl,
  };
}

function formatDistance(distanceKm) {
  if (distanceKm == null) return null;
  return `${distanceKm} كم`;
}

// ── مكوّن فرعي: يتحكم بالخريطة من جوا الـ MapContainer (zoom/center) ──
function MapController({ flyToRef, onMapClick, placing }) {
  const map = useMap();
  flyToRef.current = (latlng, zoom = 15) => map.flyTo(latlng, zoom);

  useMapEvents({
    click(e) {
      if (placing) onMapClick(e.latlng);
    },
  });

  return null;
}

export default function SellerMap() {
  const navigate = useNavigate();

  // ── حالة إذن الموقع (الشاشة 1) ──
  const [permission, setPermission] = useState("idle"); // idle | resolved
  const [userPosition, setUserPosition] = useState(null);

  // ── حالة البحث (الشاشات 2 و4 و5) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // ── متاجر الخريطة (من الباك) ──
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState("");

  // ── المتجر المختار (الشاشة 3) ──
  const [selectedStore, setSelectedStore] = useState(null);

  // ── وضع "إضافة موقعي" (دبوس البائع) ──
  const [placingLocation, setPlacingLocation] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [addressText, setAddressText] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [geocodeError, setGeocodeError] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const flyToRef = useRef(null);

  const handleAllowLocation = () => {
    if (!navigator.geolocation) {
      setPermission("resolved");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        setPermission("resolved");
      },
      () => setPermission("resolved") // لو رفض المستخدم الإذن، نكمل بدون موقعه
    );
  };

  const handleSkipLocation = () => setPermission("resolved");

  // ── تحميل دبوس البائع الحالي (إن وجد) عند فتح الصفحة ──
  useEffect(() => {
    getMyStoreLocation()
      .then((loc) => {
        if (loc) setMyLocation([loc.latitude, loc.longitude]);
      })
      .catch(() => {
        // مش لازم نوقف الصفحة لو فشل هاد الطلب (مثلاً مش بائع مسجل دخول)
      });
  }, []);

  // ── جلب متاجر الخريطة من الباك ──
  const fetchStores = useCallback(async () => {
    setStoresLoading(true);
    setStoresError("");
    try {
      const [lat, lng] = userPosition || [];
      const { stores: rawStores } = await getMapStores({
        lat,
        lng,
        q: appliedSearch || undefined,
      });
      setStores(rawStores.map(normalizeStore));
    } catch (err) {
      setStoresError(extractApiErrorMessage(err, "تعذّر تحميل المتاجر، جرّبي تاني"));
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, [userPosition, appliedSearch]);

  useEffect(() => {
    if (permission !== "resolved") return;
    fetchStores();
  }, [permission, fetchStores]);

  // ── اقتراحات البحث المنسدلة (debounced) ──
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const [lat, lng] = userPosition || [];
        const { stores: rawStores } = await getMapStores({ lat, lng, q, limit: 5 });
        setSuggestions(rawStores.map(normalizeStore));
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, userPosition]);

  const noResults = appliedSearch.trim() && !storesLoading && stores.length === 0;

  const handleSearchSubmit = (value) => {
    setAppliedSearch(value);
    setSearchActive(false);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setAppliedSearch("");
    setSearchActive(false);
  };

  const handleSelectStore = useCallback((store) => {
    setSelectedStore(store);
    flyToRef.current?.(store.position, 15);
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      setUserPosition(latlng);
      flyToRef.current?.(latlng, 15);
    });
  };

  // ── منطق "إضافة موقعي" ──
  const startPlacingLocation = () => {
    setPlacingLocation(true);
    setSelectedStore(null);
    setPendingLocation(null);
    setResolvedAddress("");
    setAddressText("");
    setGeocodeError("");
  };

  // الطريقة الأساسية: تكتبي العنوان → بنحوّله لإحداثيات (Forward Geocoding، مستقل عن باك Gaza Gate)
  const handleSearchAddress = async () => {
    if (!addressText.trim()) return;
    setGeocoding(true);
    setGeocodeError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ps&q=${encodeURIComponent(
          addressText
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const latlng = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setPendingLocation(latlng);
        setResolvedAddress(data[0].display_name || addressText);
        flyToRef.current?.(latlng, 16);
      } else {
        setGeocodeError("لم يتم العثور على هذا العنوان — جرّبي وصف أدق (مثال: اسم الحي + الشارع)");
      }
    } catch (err) {
      setGeocodeError("تعذّر البحث عن العنوان، تحققي من الاتصال بالإنترنت");
    } finally {
      setGeocoding(false);
    }
  };

  // تعديل دقة الموقع بالضغط على الخريطة (Reverse Geocoding — لعرض النص بس، مش مرسل للباك)
  const handleMapClickForPlacing = async (latlng) => {
    const point = [latlng.lat, latlng.lng];
    setPendingLocation(point);
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`
      );
      const data = await res.json();
      setResolvedAddress(data?.display_name || "الموقع المحدد على الخريطة");
    } catch (err) {
      setResolvedAddress("الموقع المحدد على الخريطة");
    } finally {
      setGeocoding(false);
    }
  };

  const cancelPlacing = () => {
    setPlacingLocation(false);
    setPendingLocation(null);
    setResolvedAddress("");
    setAddressText("");
    setGeocodeError("");
  };

  // ✅ حفظ الدبوس فعليًا بالباك (PUT /api/seller/map/location)
  const confirmPlacing = async () => {
    if (!pendingLocation) return;
    const [latitude, longitude] = pendingLocation;
    setSavingLocation(true);
    try {
      const saved = await upsertMyStoreLocation(latitude, longitude);
      setMyLocation([saved.latitude, saved.longitude]);
      setPlacingLocation(false);
      setPendingLocation(null);
      setAddressText("");
      setToastMsg("✅ تم حفظ موقع متجرك على الخريطة");
      fetchStores(); // نحدّث القائمة عشان متجرك يظهر عليها
    } catch (err) {
      // مثال: "Location must be inside Gaza"
      setGeocodeError(extractApiErrorMessage(err, "تعذّر حفظ الموقع، جرّبي تاني"));
    } finally {
      setSavingLocation(false);
    }
  };

  // ══════════════════════════════════════════════
  // الشاشة 1: طلب إذن الموقع
  // ══════════════════════════════════════════════
  if (permission === "idle") {
    return (
      <div className="smap-root" dir="rtl">
        <SellerNavbar />
        <div className="smap-permission-wrap">
          <div className="smap-permission-icon">
            <MapPin size={28} />
          </div>
          <h2 className="smap-permission-title">اسمح لنا بالوصول لموقعك</h2>
          <p className="smap-permission-sub">
            لنعرض لك المتاجر القريبة منك ونساعدك تلقي أفضل ما حولك
          </p>
          <button type="button" className="smap-permission-allow" onClick={handleAllowLocation}>
            السماح بالوصول للموقع
          </button>
          <button type="button" className="smap-permission-skip" onClick={handleSkipLocation}>
            تصفح بدون موقع
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // الشاشات 2-5: القائمة + الخريطة
  // ══════════════════════════════════════════════
  const mapCenter = userPosition || GAZA_CENTER;

  return (
    <div className="smap-root" dir="rtl">
      <SellerNavbar />

      <div className="smap-layout">
        {/* ── الشريط الجانبي ── */}
        <aside className="smap-sidebar">
          {storesLoading ? (
            <div className="smap-empty">
              <p className="smap-empty-title">جاري تحميل المتاجر...</p>
            </div>
          ) : storesError ? (
            <div className="smap-empty">
              <p className="smap-empty-title">{storesError}</p>
              <button type="button" className="smap-empty-btn" onClick={fetchStores}>
                إعادة المحاولة
              </button>
            </div>
          ) : noResults ? (
            // ── الشاشة 5: لا نتائج ──
            <div className="smap-empty">
              <div className="smap-empty-thumb">
                <PackageSearch size={28} />
              </div>
              <p className="smap-empty-title">لا توجد متاجر مطابقة</p>
              <p className="smap-empty-sub">جرّب اسم متجر مختلف</p>
              <button type="button" className="smap-empty-btn" onClick={handleClearSearch}>
                عرض كل المتاجر
              </button>
            </div>
          ) : (
            // ── الشاشة 2: قائمة المتاجر ──
            <>
              <div className="smap-sidebar-title">
                <h2>متاجر قريبة منك</h2>
                <span className="smap-sidebar-count">{stores.length} متجر</span>
              </div>
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="smap-store-card"
                  onClick={() => handleSelectStore(store)}
                >
                  <div className="smap-store-thumb">
                    {store.avatar ? (
                      <img
                        src={store.avatar}
                        alt={store.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                      />
                    ) : (
                      <Store size={26} />
                    )}
                  </div>
                  <div className="smap-store-body">
                    <p className="smap-store-name">{store.name}</p>
                    <div className="smap-store-meta">
                      <Star size={12} fill="#fbbf24" color="#fbbf24" />
                      {store.rating} ({store.ratingCount} تقييم)
                    </div>
                    <p className="smap-store-sub">
                      {[store.neighborhood, formatDistance(store.distanceKm)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <button
                      type="button"
                      className="smap-store-visit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStore(store);
                      }}
                    >
                      زيارة المتجر
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </aside>

        {/* ── منطقة الخريطة ── */}
        <div className="smap-map-area">
          <MapContainer
            center={mapCenter}
            zoom={13}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController
              flyToRef={flyToRef}
              onMapClick={handleMapClickForPlacing}
              placing={placingLocation}
            />

            {userPosition && <Marker position={userPosition} icon={buildPinIcon("mine")} />}

            {myLocation && <Marker position={myLocation} icon={buildPinIcon("mine")} />}
            {pendingLocation && (
              <Marker position={pendingLocation} icon={buildPinIcon("mine")} />
            )}

            {!placingLocation &&
              stores.map((store) => (
                <Marker
                  key={store.id}
                  position={store.position}
                  icon={buildPinIcon(selectedStore?.id === store.id ? "selected" : "default")}
                  eventHandlers={{ click: () => handleSelectStore(store) }}
                />
              ))}
          </MapContainer>

          {/* شريط البحث */}
          <div className="smap-search-wrap">
            <div className="smap-search-box">
              <Search size={16} color="#9ca3af" />
              <input
                type="text"
                placeholder="ابحث عن متجر..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchActive(true);
                }}
                onFocus={() => setSearchActive(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit(searchQuery);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}
                  aria-label="مسح"
                >
                  <X size={14} color="#9ca3af" />
                </button>
              )}
            </div>
            <button type="button" className="smap-current-loc-btn" onClick={handleUseCurrentLocation}>
              <Navigation size={14} />
              موقعي الحالي
            </button>
          </div>

          {/* ── الشاشة 4: نتائج البحث المنسدلة (من الباك، debounced) ── */}
          {searchActive && searchQuery.trim() && (
            <div className="smap-search-dropdown">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="smap-search-result-item"
                  onClick={() => {
                    handleSelectStore(s);
                    setSearchQuery(s.name);
                    setAppliedSearch(s.name);
                    setSearchActive(false);
                  }}
                >
                  <div>
                    <p className="smap-search-result-name">{s.name}</p>
                    <p className="smap-search-result-sub">
                      {[s.neighborhood, formatDistance(s.distanceKm)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Store size={16} color="#9ca3af" />
                </div>
              ))}
              {suggestions.length === 0 && searchQuery.trim().length >= 2 && (
                <div className="smap-search-result-item" onClick={() => handleSearchSubmit(searchQuery)}>
                  <p className="smap-search-result-name">بحث عن "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* ── الشاشة 3: بطاقة المتجر المختار ── */}
          {selectedStore && !placingLocation && (
            <div className="smap-selected-card">
              <button
                type="button"
                className="smap-selected-close"
                onClick={() => setSelectedStore(null)}
                aria-label="إغلاق"
              >
                <X size={14} />
              </button>
              <div className="smap-selected-thumb">
                {selectedStore.avatar ? (
                  <img
                    src={selectedStore.avatar}
                    alt={selectedStore.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                  />
                ) : (
                  <Store size={30} />
                )}
                {selectedStore.distanceKm != null && (
                  <span className="smap-selected-distance-badge">
                    {formatDistance(selectedStore.distanceKm)}
                  </span>
                )}
              </div>
              <div className="smap-selected-body">
                <p className="smap-selected-name">{selectedStore.name}</p>
                <div className="smap-selected-meta">
                  <Star size={12} fill="#fbbf24" color="#fbbf24" />
                  {selectedStore.rating} ({selectedStore.ratingCount} تقييم)
                </div>
                {(selectedStore.neighborhood || selectedStore.street) && (
                  <p className="smap-selected-desc">
                    {[selectedStore.neighborhood, selectedStore.street].filter(Boolean).join(" - ")}
                  </p>
                )}
                <div className="smap-selected-actions">
                  <button
                    type="button"
                    className="smap-selected-visit-btn"
                    onClick={() => navigate(`/customer/store/${selectedStore.id}`)}
                  >
                    زيارة المتجر
                  </button>
                  <button
                    type="button"
                    className="smap-selected-directions-btn"
                    onClick={() => {
                      const { latitude, longitude } = selectedStore;
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
                      const win = window.open(url, "_blank", "noopener,noreferrer");
                      if (!win) window.location.href = url;
                    }}
                  >
                    <Navigation size={13} />
                    الاتجاهات
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* أدوات التكبير/التصغير + تحديد الموقع */}
          <div className="smap-map-controls">
            <button
              type="button"
              className="smap-map-ctrl-btn smap-map-ctrl-btn--locate"
              onClick={handleUseCurrentLocation}
              aria-label="موقعي"
            >
              <LocateFixed size={16} />
            </button>
            <button
              type="button"
              className="smap-map-ctrl-btn"
              onClick={() => flyToRef.current?.(mapCenter, 15)}
              aria-label="تكبير"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              className="smap-map-ctrl-btn"
              onClick={() => flyToRef.current?.(mapCenter, 11)}
              aria-label="تصغير"
            >
              <Minus size={16} />
            </button>
          </div>

          {/* زر "إضافة موقعي" — خاص بالبائع */}
          {!placingLocation && (
            <button type="button" className="smap-add-location-btn" onClick={startPlacingLocation}>
              <MapPin size={16} />
              {myLocation ? "تعديل موقع متجري" : "إضافة موقع متجري"}
            </button>
          )}

          {/* صندوق كتابة العنوان — الطريقة الأساسية والأدق لتحديد الموقع */}
          {placingLocation && !pendingLocation && (
            <div className="smap-address-input-wrap">
              <div className="smap-address-input-box">
                <input
                  type="text"
                  placeholder="اكتبي عنوان متجرك (مثال: غزة، حي الرمال، شارع الجلاء)"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchAddress();
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="smap-address-search-btn"
                  onClick={handleSearchAddress}
                  disabled={geocoding}
                >
                  {geocoding ? "جاري البحث..." : "بحث"}
                </button>
              </div>
              {geocodeError && <p className="smap-address-error">{geocodeError}</p>}
              <button type="button" className="smap-confirm-cancel-btn smap-address-cancel" onClick={cancelPlacing}>
                إلغاء
              </button>
            </div>
          )}

          {/* بعد لقاء العنوان: بطاقة تأكيد + إمكانية تعديل الدقة بالضغط على الخريطة */}
          {placingLocation && pendingLocation && (
            <div className="smap-confirm-location-card smap-confirm-location-card--tall">
              <span className="smap-confirm-location-text">هل تريدين حفظ هذا الموقع؟</span>
              <p className="smap-confirm-location-address">
                {geocoding ? "جاري تحديد العنوان..." : resolvedAddress}
              </p>
              <p className="smap-confirm-location-tune-hint">
                غير دقيق؟ اضغطي على المكان الصحيح بالخريطة لتظبطي الموقع
              </p>
              {geocodeError && <p className="smap-address-error">{geocodeError}</p>}
              <div className="smap-confirm-location-actions">
                <button type="button" className="smap-confirm-cancel-btn" onClick={cancelPlacing}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="smap-confirm-save-btn"
                  onClick={confirmPlacing}
                  disabled={geocoding || savingLocation}
                >
                  {savingLocation ? "جاري الحفظ..." : "نعم، احفظي الموقع"}
                </button>
              </div>
            </div>
          )}

          {/* توست تأكيد */}
          <SimpleToast message={toastMsg} onDone={() => setToastMsg("")} />
        </div>
      </div>
    </div>
  );
}