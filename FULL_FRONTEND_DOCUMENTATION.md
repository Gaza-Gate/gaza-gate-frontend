# Gaza Gate — Full Frontend Documentation

> **Project:** Gaza Gate (بوابة غزة) — Palestinian e-commerce marketplace
> **Stack:** React 18 · Vite 5 · React Router 6 · Axios · Tailwind CSS · Formik + Yup · Socket.io · PWA
> **Backend:** `https://gaza-gate-backend-f9hf.onrender.com`
> **Audience:** Frontend developers, technical reviewers, hiring managers
> **Scope:** Complete frontend codebase (`src/`, `public/`, configuration)
> **Version:** Generated 2026-08-11

---

## Table of Contents

1. [Project Architecture & Setup](#1-project-architecture--setup)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [API Integration & Data Binding](#3-api-integration--data-binding)
4. [Progressive Web App (PWA) & Mobile Optimization](#4-progressive-web-app-pwa--mobile-optimization)
5. [UI Components & Branding Assets](#5-ui-components--branding-assets)
6. [Technical Skills & Tools Checklist](#6-technical-skills--tools-checklist)

---

## 1. Project Architecture & Setup

### 1.1 Framework & Build Tooling

| Layer | Technology | Notes |
| --- | --- | --- |
| **UI Runtime** | React 18.3.1 | `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `memo`, Context API, StrictMode |
| **Build Tool** | Vite 5.4 | ESM-native, instant HMR, Rollup-based production builds |
| **Routing** | React Router DOM 6.30 | `BrowserRouter` + nested `<Route>` + `<Outlet>` + `<Navigate>` + route guards |
| **Styling** | Native CSS + Tailwind 3.4 (hybrid) | Tailwind for utility classes, custom CSS for theming via CSS variables |
| **Forms** | Formik 2.4 + Yup 1.7 | Validated forms (Login, Register, Onboarding, Product Create/Edit) |
| **HTTP** | Axios 1.17 | Single instance with request/response interceptors (see §2) |
| **Real-time** | socket.io-client 4.8 | Lazy-loaded for live notifications + chat |
| **Auth (Google)** | @react-oauth/google 0.13 | GoogleOAuthProvider at root |
| **Icons** | lucide-react 0.378 + react-icons 5.7 | Lucide is the primary set, used everywhere |
| **Charts** | recharts 3.9 | Seller dashboard analytics |
| **Image processing** | sharp 0.35 | Build-time asset optimization |
| **Linting** | ESLint 8 + react-hooks plugin | `npm run lint` |

### 1.2 Directory Structure

```
gaza-gate-frontend/
├── public/                          # Static assets, served as-is
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service Worker
│   ├── app-icon.png                 # 512×512 maskable launcher icon
│   ├── logo.png                     # Brand logo (dark surfaces)
│   ├── favicon.svg                  # Tab icon (legacy)
│   ├── icons.svg                    # Sprite (legacy)
│   ├── buyer.png · seller.png       # Onboarding illustrations
│   └── assets/
│       ├── icon.svg                 # Inline PWA icon
│       ├── pwa-icon.png             # 192×192 PWA icon
│       └── logo-gaza-gate.png       # Full logo (light)
├── src/
│   ├── main.jsx                     # App entry — providers tree
│   ├── App.jsx                      # Route table
│   ├── index.css                    # Global tokens + Tailwind base
│   ├── assets/                      # Bundled images, illustrations
│   ├── components/  (~40 files)     # Reusable UI (Layouts, Navbars, Modals, Guards, Widgets)
│   ├── pages/      (~50 files)      # Route-level screens
│   ├── context/    (3 files)        # AuthContext, CartContext, WishlistContext
│   ├── hooks/      (6 files)        # useTheme, usePWAInstallationState, useAutoRefreshToken, useNotificationCount, useLogin, useSwipeToDismiss
│   ├── services/   (13 files)       # API clients (one per domain)
│   ├── utils/      (15 files)       # Pure helpers (api, jwt, socket, validators, errorMapping, …)
│   └── data/       (1 file)         # Static seed data (customerProducts.js)
├── tailwind.config.js               # Theme tokens (brand orange, navy palette, dark mode)
├── index.html                       # PWA meta tags, font preload
├── vite.config.js
└── package.json
```

### 1.3 Provider Tree (in `src/main.jsx`)

The root wraps the app in this strict order (outermost → innermost):

```
<React.StrictMode>
  <GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <ThemeProvider>           ← applies .dark / .light on <html>, drives CSS vars
        <AuthProvider>          ← session, role, token, auto-refresh
          <CartProvider>        ← cart items scoped per user
            <WishlistProvider>  ← favorites scoped per user
              <App />           ← all routes + floating widgets
```

- **`initTheme()`** is called before `ReactDOM.createRoot` to apply the stored theme synchronously — prevents a flash of unstyled content (FOUC).
- **Service Worker** is registered in the same module on the window `load` event (best practice — non-blocking).

### 1.4 Routing Layout (`src/App.jsx`)

React Router v6 with **nested route guards** via three dedicated wrappers:

```
/                                SplashScreen
/onboarding · /onboarding/customer · /login/* · /register/* · /verify-* · /forgot-password
                                  (public, "auth shell" group)

<RequireCustomer>  ← route guard
  <CustomerLayout> ← adds PWAInstallBanner + CustomerNavbar
    /home/customer
    /products · /product/:id
    /cart · /favorites
    /my-orders · /my-orders/:id
    /messages · /notifications
    /profile/customer
    /customer/become-seller
    ...
  </CustomerLayout>
</RequireCustomer>

/customer/store(/:sellerId)       ← public view-only (no layout)
/customer/profile/:customerId     ← public view-only (no layout)

/checkout/review · /payment · /confirm · /failed   ← checkout funnel (no navbar)
/product-missing

<RequireSeller>
  /seller/dashboard · /seller/products · /seller/orders · /seller/orders/:id
  /seller/ratings · /seller/notifications · /seller/messages
  /seller/profile/edit · /seller/account/password
  /store-profile
</RequireSeller>

/seller/onboarding · /verify-otp · /store/:sellerId    (public seller views)

<RequireAdmin>
  /admin/dashboard · /admin/users · /admin/categories
  /admin/reports · /admin/notifications · /admin/settings · /admin/profile
</RequireAdmin>

* → Navigate to /
```

**`ScrollToTop` helper:** resets scroll position on every navigation, except the Splash route (which owns its own scroll animation).

**Global overlays (rendered outside `<Routes>`):**
- `RoleSwitchListener` — listens for the role-switching state and shows a fullscreen overlay
- `FloatingThemeToggle` — dark/light FAB (hidden on `/`)
- `FloatingChatWidget` — seller-side chat (only inside `/seller/*`)
- `CustomerChatWidget` — customer-side chat (only when role=`customer` AND path matches `CUSTOMER_AREA_PREFIXES` AND not on public view-only routes)

### 1.5 Styling Architecture

The project uses a **hybrid model**:

| Layer | Used For | Example |
| --- | --- | --- |
| **Tailwind utilities** | Layout primitives, spacing, responsive breakpoints | `flex items-center gap-2 px-4 py-2` |
| **CSS variables (in `index.css`)** | Theme tokens (light + dark) consumed by all components | `color: var(--text-dark); background: var(--bg-surface);` |
| **Component CSS files** | Page-specific or feature-specific styles | `CustomerHome.css`, `PWAInstallBanner.css`, `RequireCustomer.css` |
| **Tailwind config (`tailwind.config.js`)** | Brand palette, navy dark palette, custom utilities | `bg-brand-500`, `text-navy-200`, `.glass-card` |

**Brand tokens (constant across light/dark for visual identity):**
- Orange `#F97316` — primary CTA, brand accent, focus rings
- Navy/Slate palette (avoid pure black for eye comfort in dark mode):
  - `navy.950` → `slate-800` body background
  - `navy.900` → `slate-700` card surface
  - `navy.800` → `slate-600` secondary surfaces / borders
  - `navy.100` → `slate-100` primary headings (not pure white)
  - `navy.200` → `slate-300` body text
  - `navy.300` → `slate-400` tertiary text

**Dark mode strategy:** `darkMode: 'class'` on `<html>`. `useTheme` hook + `initTheme()` apply `.dark` / `.light` based on:
1. localStorage preference (`gaza-gate-theme` JSON `{mode: "light"|"dark"|"system"}`)
2. `prefers-color-scheme: dark` media query (when mode = "system")

**Font:** [Tajawal](https://fonts.google.com/specimen/Tajawal) (Arabic + Latin, weights 400/500/700/800) loaded from Google Fonts in `index.html` with `preconnect` for performance.

**Layout primitives used throughout:**
- **CSS Grid** — category tiles, product listings, checkout steps, admin panels
- **Flexbox** — navbars, form fields, button groups, mobile layouts
- **`clamp()` & media queries** — fully responsive from 320px mobile up to 1920px desktop
- **RTL-aware** — `<html dir="rtl" lang="ar">`; `useTheme`, `useAuth`, and most components are explicitly tested in RTL

---

## 2. Authentication & Session Management

### 2.1 The Three Layers

The auth system is built on three coordinated layers:

```
┌────────────────────────────────────────────────────────────────┐
│  Layer 1: AuthContext (React state)                            │
│   - user, currentRole, hasSellerProfile, hasCustomerProfile   │
│   - login / logout / becomeSeller / becomeCustomer / switchRole│
│   - isBootstrapping, isSwitchingRole, pendingNavigation        │
│   - listens to gaza-gate-auth-changed event                    │
└────────────────────────────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────────────────────────┐
│  Layer 2: Axios Interceptor (utils/api.js)                     │
│   - request: injects Authorization header                      │
│   - response: 401 → silent refresh → retry original request    │
│   - emits gaza-gate-auth-changed on token rotation             │
└────────────────────────────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────────────────────────┐
│  Layer 3: useAutoRefreshToken (hooks/useAutoRefreshToken.js)   │
│   - refresh every 10 minutes in background                     │
│   - refresh on tab visibility change (back to tab)             │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 AuthContext (`src/context/AuthContext.jsx`)

A single, central context that holds the entire session model. Public surface:

```js
const {
  // state
  user, currentRole, hasSellerProfile, hasCustomerProfile,
  isAuthenticated, isBootstrapping, error,
  isSwitchingRole, isBecomingSeller, isBecomingCustomer,
  switchingToRole, pendingNavigation,

  // actions
  login, becomeSeller, becomeCustomer, switchRole,
  switchRoleAndNavigate, logout, refreshSession, syncProfileFlags,
  getHomePathForRole, clearRoleCaches,
} = useAuth();
```

**Internal architecture:**

1. **Synchronous bootstrap** — on mount, `user` and `currentRole` are read from `localStorage` immediately (no flash of "logged out" state).
2. **Token expiration check** — if the cached JWT is expired, session is wiped and `isBootstrapping` resolves to `false`.
3. **Async profile validation** — `refreshSession()` fires two parallel requests (`/api/seller/profile` and `/api/profile/customer`) via `fetchProfileFlags()` to learn the real `hasSellerProfile` / `hasCustomerProfile` flags without an `/api/auth/me` endpoint.
4. **Event-driven cross-component sync** — every mutation dispatches `gaza-gate-auth-changed`, so the Navbar, Cart, Wishlist, and Notifications update atomically.

**Storage keys (constants):**

| Key | Purpose |
| --- | --- |
| `token` | Access token (localStorage or sessionStorage based on `remember`) |
| `refreshToken` | Refresh token (HTTP-only cookie would be ideal, currently localStorage) |
| `user` | JSON-encoded `user` object |
| `userType` | `"customer" \| "seller" \| "admin"` (used for post-logout redirect) |
| `sellerId` | Cached seller ID for the current customer (e.g. when viewing a store) |

**`flushStateUpdates()` — the anti-race-condition helper:**

```js
function flushStateUpdates() {
  return new Promise((resolve) => {
    // double rAF: 1st commits React state, 2nd ensures DOM is settled
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
```

Used after `setState` calls in `switchRole`, `becomeSeller`, and `becomeCustomer` to guarantee React has re-rendered with the new role **before** `navigate()` fires. Without this, navigating too fast could trigger a guard redirect (e.g. still on `/seller/dashboard` while `currentRole` is mid-transition).

**`switchInProgressRef` lock** — a `useRef` boolean that prevents two parallel role switches (e.g. double-clicks or `RequireSeller` auto-switch colliding with a Navbar button).

**Error self-healing (409 Conflict):** if `becomeSeller` returns `409 "Already a seller"`, the context fixes the local state to `hasSellerProfile: true, role: "seller"` and then chains a `switch-role` to get a properly-signed token. This handles stale local state without forcing a logout.

**Socket reconnection on role change:**

```js
async function reconnectSocketSafely() {
  const helpers = await getSocketHelpers();   // lazy import
  helpers.disconnectSocket();
  await new Promise((r) => setTimeout(r, 120)); // wait for backend session
  helpers.connectSocket();                     // new token → new userId in JWT
}
```

Socket.io is disconnected and reconnected after every role change because the JWT carries `userId` and the backend uses it for room targeting.

**Custom event bus (not a state library):**

| Event | When | Listeners |
| --- | --- | --- |
| `gaza-gate-auth-changed` | After every auth mutation | Navbar, Cart, Wishlist, all `useAuth()` consumers |
| `gaza-gate-role-cache-clear` | After role switch | Cart, Wishlist, Notifications (clear stale role data) |
| `gaza-gate-theme-changed` | After theme change | All components reading CSS variables (auto via `class` on `<html>`) |

### 2.3 Axios Interceptor (`src/utils/api.js`)

A single Axios instance (`api`) is used by every service.

**Base configuration:**

```js
const api = axios.create({
  baseURL: API_BASE_URL,                  // VITE_API_URL or default
  withCredentials: true,                  // send cookies (refresh token)
  headers: { 'Content-Type': 'application/json' },
});
```

**Request interceptor (lines 58–88):**

1. Reads `token` from `localStorage`, sets `Authorization: Bearer <token>`.
2. Special-cases `FormData` (used for product images, profile avatars, etc.):
   - Forces `Content-Type: multipart/form-data` instead of letting axios 1.18.1 default to `application/x-www-form-urlencoded` (which was causing **400 Bad Request** on image uploads).
   - The browser auto-generates the `boundary`; we don't set it manually.

**Response interceptor (lines 127–189) — the silent refresh flow:**

```
401 received
   │
   ├─► Is the failing request an auth endpoint? (login/register/refresh)
   │      YES → reject as-is, do NOT attempt refresh
   │
   └─► NO
      │
      ├─► Is a refresh already in progress?
      │      NO  → start `refreshPromise` (module-level shared)
      │      YES → await the existing one
      │
      ├─► Refresh succeeded?
      │      YES → save new token → emit auth-changed event
      │            → set Authorization header on original request
      │            → retry original request with `api(original)`
      │
      └─► Refresh failed?
             → clear all session keys
             → emit auth-changed event (Navbars hide instantly)
             → window.location.replace(`/login/${userType}`)
```

**The race-condition guard:**

```js
let refreshPromise = null;
// ...
if (!refreshPromise) {
  refreshPromise = authAPI.refreshToken().finally(() => {
    refreshPromise = null;
  });
}
```

When 3 parallel API calls all 401 at the same time (common on token expiry), only **one** `refreshToken` request is sent. The other two await the same `Promise` and reuse the new token.

**The `AUTH_ENDPOINTS_NO_REFRESH` allowlist:**

```js
const AUTH_ENDPOINTS_NO_REFRESH = [
  '/api/auth/customer/local/login',
  '/api/auth/customer/local/register',
  '/api/auth/seller/local/login',
  '/api/auth/seller/local/register',
  '/api/auth/customer/google/login',
  // ... 10 more
  '/api/auth/refresh-token',  // self-exclusion
];
```

Login/register failures (wrong password, duplicate email) must not trigger a refresh loop. The interceptor detects this via exact path match (with/without trailing slash) using `getPathFromUrl()` which strips query strings and base URLs.

### 2.4 Silent Refresh Hook (`src/hooks/useAutoRefreshToken.js`)

Runs once at `AuthProvider` mount:

```js
useEffect(() => {
  // 1) every 10 minutes
  intervalRef.current = setInterval(silentRefresh, 10 * 60 * 1000);

  // 2) on tab visibility change (user comes back)
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') silentRefresh();
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  // ...
}, []);
```

**Critical design decision:** silent refresh **never** triggers logout on failure. Reasons:
- Network blips are temporary
- Server cold-starts on Render free tier can take 30+ seconds
- A real logout should only happen when an actual user action (an API call) returns 401

The actual logout path is owned by the response interceptor (see §2.3).

### 2.5 Role Switching Without Page Reload

The flagship UX feature. The flow when a customer taps "التحويل لوضع البائع" (Switch to Seller):

```
SwitchRoleButton.handleClick()
   │
   ├─► targetRole === "seller" && !hasSellerProfile
   │      │
   │      ├─► syncProfileFlags()      ← refresh from backend (handles stale state)
   │      │
   │      ├─► switchRoleAndNavigate("seller", navigate, { path, replace: true })
   │      │      │
   │      │      ├─► AuthContext.switchRole("seller")
   │      │      │     ├─► POST /api/auth/switch-role
   │      │      │     ├─► persistSession({ user, accessToken, refreshToken })
   │      │      │     ├─► flushStateUpdates()       ← wait for React commit
   │      │      │     ├─► dispatch auth-changed
   │      │      │     ├─► clearRoleCaches("customer", "seller")
   │      │      │     └─► reconnectSocketSafely()
   │      │      │
   │      │      └─► navigate("/seller/dashboard", { replace: true })
   │      │
   │      └─► if error is 404/403/409 → navigate("/customer/become-seller")
   │
   └─► (default branch)
          └─► switchRoleAndNavigate(targetRole, ...)
```

**`SwitchRoleButton` smart gate** (lines 99–145) protects against:
- Stale local state (user has a seller profile but local flag is `false`) → resolved by `syncProfileFlags()`
- Race conditions with route guards (e.g. `RequireSeller` auto-switching while user clicks the button) → resolved by the `switchInProgressRef` lock

**Route guards participate too:**

`RequireCustomer` and `RequireSeller` are nested-route wrappers that, on every render, check the auth state and either:
- Render the child route via `<Outlet />`
- Show `FullPageLoading` (the branded spinner component, no white flashes)
- Trigger their own `switchRole()` (e.g. customer navigates to `/home/customer` while in seller mode → auto-switch to customer)

`RequireAdmin` follows the same pattern but for admin pages.

### 2.6 JWT Helpers (`src/utils/jwt.js`)

```js
decodeJwt(token)         // base64url-decodes payload (no signature verification)
getRoleFromToken(token)  // reads payload.role
isTokenExpired(token, leewaySeconds = 30)  // exp - 30s <= now
```

Used to short-circuit auth flows when the token is already expired locally — avoids a wasted round-trip to the backend.

### 2.7 Auth Service (`src/services/authService.js`)

Pure API functions, no React dependencies:

| Function | Endpoint | Auth |
| --- | --- | --- |
| `loginCustomer(email, password)` | `POST /api/auth/customer/local/login` | none |
| `registerCustomer(formData)` | `POST /api/auth/customer/local/register` | none |
| `customerGoogleLogin(token)` | `POST /api/auth/customer/google/login` | none |
| `customerGoogleRegister(token)` | `POST /api/auth/customer/google/register` | none |
| `loginSeller`, `registerSeller`, `sellerGoogleLogin`, `sellerGoogleRegister/Init/Complete` | `/api/auth/seller/...` | none |
| `verifyEmail`, `resendCode` | `/api/auth/verify-email`, `/resend-verification-code` | none |
| `forgotPassword`, `verifyResetCode`, `resetPassword` | `/api/auth/forgot-password`, ... | none |
| `changePassword(body)` | `PUT /api/seller/profile/changePassword` | seller |
| `logout()` | `POST /api/auth/logout` | any |
| `logoutAll()` | `POST /api/auth/logout-all` | any |
| `refreshAccessToken()` | `POST /api/auth/refresh-token` | cookie |
| `getCart`, `addToCart`, `removeCartItem`, `clearServerCart` | `/api/customer/cart/...` | customer |
| `getCustomerWishlist`, `addToWishlist`, `removeFromWishlist` | `/api/customer/wishlist/...` | customer |

`getAuthToken()` and `getCurrentUser()` are pure localStorage readers — used by contexts, hooks, and the `CartContext` for `userId` scoping.

### 2.8 Session Helpers (`src/utils/authSession.js`)

Stateless helpers that always dispatch `gaza-gate-auth-changed` after mutating storage:

```js
saveCustomerSession(token, user, remember = true)
saveSellerSession(token, user, remember = true)
persistToken(token, remember = true)   // localStorage OR sessionStorage
clearAuthSession()                     // nukes all session keys + event
extractToken(data) / extractUser(data) // response unwrappers
isMissingAccountError(err)             // bilingual error classifier
```

---

## 3. API Integration & Data Binding

### 3.1 Service Layer (13 files in `src/services/`)

Each domain has a dedicated service. Every service is a thin wrapper over the shared `api` axios instance — none of them know about the interceptor, they just import `api` and call methods.

| Service | Domain | Auth Required |
| --- | --- | --- |
| `authService.js` | Login, register, password, verification, token, **cart**, **wishlist** | varies |
| `roleService.js` | Become seller/customer, switch role, **fetchProfileFlags** | varies |
| `productService.js` | Products CRUD (seller), public listing, **categories** | varies |
| `orderService.js` | Customer + seller order flows | customer / seller |
| `notificationService.js` | Customer + seller notifications | customer / seller |
| `reviewService.js` | Reviews (customer + seller) | varies |
| `profileService.js` | Customer profile | customer |
| `storeService.js` | Store profile (seller) | seller |
| `dashboardService.js` | Seller dashboard stats | seller |
| `conversationService.js` | Chat conversations + messages | any |
| `adminService.js` | Admin users, categories, settings | admin |
| `settingsService.js` | Admin settings (notifications) | admin |

### 3.2 Category Service — The Three-Tier Fallback

`getPublicCategories()` (in `productService.js`) is the most resilient API call in the project:

```js
export async function getPublicCategories() {
  // Tier 1: Authenticated, documented endpoint
  try {
    const res = await api.get('/api/category/all');
    const list = unwrapCategories(res.data);
    if (list.length > 0) return list.map(mapCategory).filter(Boolean);
    return [];                         // 200 OK but empty — respect that
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403 || status === 404) {
      // Tier 2: Public endpoint (no auth required)
      try {
        const res = await api.get('/api/category/public');
        return unwrapCategories(res.data).map(mapCategory).filter(Boolean);
      } catch {
        // Tier 3: Caller falls back to FALLBACK_CATEGORIES local constant
        return [];
      }
    }
    throw err;                         // 5xx / network → bubble up
  }
}
```

**Three response-shape unwrappers** are tried in order because the backend's envelope shape has been unstable across versions:
- `data.data.categories` ← current documented shape
- `data.categories` ← older shape
- `data.data` ← bare array wrapper
- `data` ← direct array

**`mapCategory` normalizes and translates** every category:
- Maps raw `id` and `name` from the backend
- Translates English `name` to Arabic `nameAr` via a 15-key `CATEGORY_NAME_MAP` (handles "electronics", "electronic", "food", "homemade", "home food", "clothes", "clothing", "fashion", etc.)
- Assigns an `iconKey` (used for icon resolution elsewhere)
- Reads `productCount` from any of `productCount` / `productsCount` / `_count.products`

**`FALLBACK_CATEGORIES` constant** in `CustomerHome.jsx` provides 9 hard-coded categories (electronics, food, clothes, handicraft, books, beauty, sports, toys, furniture) — used only when the API returns empty/fails, so the "Browse Categories" section is never blank.

### 3.3 Dynamic Category Rendering (CustomerHome)

`src/pages/CustomerHome.jsx` consumes the categories with full UX discipline:

```jsx
const [categories, setCategories] = useState([]);
const [categoriesLoading, setCategoriesLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      setCategoriesLoading(true);
      const list = await getPublicCategories();
      if (cancelled) return;
      const visible = list.length > 0 ? list : FALLBACK_CATEGORIES;
      setCategories(visible);
    } catch (err) {
      if (!cancelled) setCategories(FALLBACK_CATEGORIES);
    } finally {
      if (!cancelled) setCategoriesLoading(false);
    }
  })();
  return () => { cancelled = true; };   // ← unmount guard
}, []);
```

UI states:
- **Loading** — `Loader2` spinner + "جاري تحميل الأقسام…"
- **Empty** — "لا توجد أقسام حالياً" (won't happen in practice due to fallback)
- **Populated** — first 4 categories rendered as a CSS Grid (4 cols desktop, 2 cols mobile)

**Native CSS Grid layout** (in `CustomerHome.css`):

```css
.home-categories {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
@media (max-width: 768px) {
  .home-categories { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
}
@media (max-width: 480px) {
  .home-categories { gap: 6px; }
}
```

Each category card is a `<button>` (not a div) for accessibility — `Enter` and `Space` activate navigation to `/products?category=<id>`.

### 3.4 Response Unwrapping Convention

Most services follow this pattern (defensive against backend envelope drift):

```js
const data = res.data?.data?.thing ?? res.data?.thing ?? res.data?.data ?? res.data;
```

This makes the frontend resilient to any single field-wrapping inconsistency in the backend.

### 3.5 Data Fetching Patterns

| Pattern | Where Used | Why |
| --- | --- | --- |
| **useEffect + loading state + error state** | Most pages | Simple, idiomatic React |
| **`mounted` / `cancelled` flag in cleanup** | All async effects | Prevents setState-after-unmount warnings |
| **Fire-and-forget background flag sync** | `AuthContext.login` | Doesn't block the login UX |
| **`Promise.allSettled` for parallel checks** | `fetchProfileFlags` | Tolerates partial failure |
| **`AbortController` for cancelable requests** | Used in some search inputs | Cancels stale requests on new keystrokes |
| **`useNotificationCount` hook** | Polls notification count | Custom hook wrapping fetch + interval |
| **Socket.io for live updates** | Notifications, chat | Replaces polling for real-time events |
| **Optimistic UI updates** | Cart add, wishlist toggle | Local state updates before server confirms |

### 3.6 Error Handling

**Bilingual error classification** is provided by `utils/errorMessages.js` and `utils/errorHelper.js`. `errorHelper` extracts a friendly message from any axios error:

```js
err?.response?.data?.data?.message   // wrapped form
  || err?.response?.data?.message    // legacy form
  || err?.message                    // axios default
  || "حدث خطأ غير متوقع"             // ultimate fallback
```

**Specific error classifiers** in services:
- `SwitchRoleButton.isMissingProfileError(err)` — distinguishes "no seller profile" (404/403) from network errors
- `authSession.isMissingAccountError(err)` — detects 404 + bilingual message keywords
- `reviewService` defines a custom `ReviewError` class for known backend error codes

---

## 4. Progressive Web App (PWA) & Mobile Optimization

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  public/manifest.json          ← installability metadata  │
│  public/sw.js                  ← service worker (offline) │
│  index.html meta tags          ← Apple + Android hints     │
│  public/app-icon.png (512)     ← launcher icon             │
│  public/assets/pwa-icon.png    ← legacy 192 icon           │
└─────────────────────────────────────────────────────────────┘
        ▲
        │ uses
        │
┌─────────────────────────────────────────────────────────────┐
│  src/hooks/usePWAInstallationState.jsx                      │
│  src/components/PWAInstallBanner.jsx                        │
│  src/components/PWAInstallBanner.css                         │
│  src/main.jsx (SW registration on load)                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 `usePWAInstallationState` — The Custom Hook

Exposes a clean, testable API for the entire install flow:

```js
const {
  canInstall,    // beforeinstallprompt event has fired
  isVisible,     // banner should be shown
  isInstalled,   // app is running in standalone mode
  install,       // trigger the native install dialog
  dismiss,       // hide the banner (persisted to localStorage)
  resetDismissal,// show the banner again (testing / settings)
} = usePWAInstallationState();
```

**State management inside the hook:**

```js
const [deferredPrompt, setDeferredPrompt] = useState(null);
const [isDismissed, setIsDismissed] = useState(() => {
  // lazy initializer — reads localStorage once
  return localStorage.getItem('pwa-install-dismissed') === 'true';
});
const [isInstalled, setIsInstalled] = useState(false);
```

**Three `useEffect`s collaborate:**

1. **Standalone detection** — checks `display-mode: standalone` media query (Android/Chrome) and `navigator.standalone` (iOS Safari). Reacts to `change` events (e.g. user installs via browser menu, app re-launches standalone).
2. **`beforeinstallprompt` listener** — calls `e.preventDefault()` to suppress the browser's mini-infobar, then stashes the event in state for later use.
3. **Derived visibility** — `isVisible = canInstall && !isDismissed` (computed on every render, no effect needed).

**The `install()` callback:**

```js
const install = useCallback(async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();                    // show native dialog
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') dismiss();      // auto-hide on accept
  setDeferredPrompt(null);                    // can only use once
}, [deferredPrompt]);
```

**Persistence:** `dismiss()` writes `pwa-install-dismissed=true` to localStorage. The dismissal survives page reloads and tab close — users who say "no" once won't be asked again unless they call `resetDismissal()` (exposed for a future "Settings → Show install banner" toggle).

### 4.3 `PWAInstallBanner` Component

A sticky banner mounted at the top of the customer layout (above the navbar, z-index 1001):

```
┌────────────────────────────────────────────────────────────┐
│  📥  استمتع بتجربة تسوق أسرع وأسهل!                     │
│      حمّل تطبيق غزة جيت الآن   (خيار اختياري)            │
│                                  [تنزيل التطبيق] [ربما لاحقاً] │
└────────────────────────────────────────────────────────────┘
```

- **Slide-in animation** on mount (`cubic-bezier(0.22, 1, 0.36, 1)` 350ms)
- **Slide-out animation** on dismiss (300ms, then unmounts)
- **Responsive layout** — flex column on mobile, row on desktop
- **Dark/light mode aware** — gradient backgrounds adapt via `.dark` overrides
- **A11y** — `role="banner"`, `aria-label`, `aria-busy` on the action buttons
- **i18n** — all copy in Arabic; aligns with RTL page direction
- **Icons** — `lucide-react` (`Download`, `Smartphone`, `ChevronDown`, `X`)

A `forceShow` prop is exposed for visual testing without the actual prompt event.

### 4.4 Web App Manifest (`public/manifest.json`)

```json
{
  "name": "بوابة غزة - Gaza Gate",
  "short_name": "بوابة غزة",
  "description": "منصة تسوق غزة - Gaza Marketplace",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f97316",
  "orientation": "portrait-primary",
  "lang": "ar",
  "dir": "rtl",
  "categories": ["shopping", "business"],
  "icons": [
    { "src": "/app-icon.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/app-icon.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "shortcuts": [
    { "name": "المنتجات",   "url": "/products", "icons": [...] },
    { "name": "سلة التسوق", "url": "/cart",     "icons": [...] }
  ]
}
```

**Key design decisions:**
- `"purpose": "any maskable"` — single icon works for both standard and maskable contexts (Android launchers may circle, squircle, or square-clip)
- `"dir": "rtl"` — declared in manifest for proper splash layout on install
- **Shortcuts** — long-press on the launcher icon shows "المنتجات" and "سلة التسوق" jump-lists
- `"display": "standalone"` — no browser chrome after install (feels native)

### 4.5 HTML Meta Tags (`index.html`)

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>بوابة غزة</title>

<!-- PWA -->
<meta name="theme-color" content="#f97316" />
<meta name="description" content="منصة تسوق غزة - Gaza Marketplace" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="بوابة غزة" />
<link rel="manifest" href="/manifest.json" />
<link rel="icon" type="image/png" href="/app-icon.png" />
<link rel="apple-touch-icon" href="/app-icon.png" />
```

### 4.6 Service Worker (`public/sw.js`)

Classic precache + network-first strategy with offline fallback:

- **Install** — caches `/`, `/index.html`, `/manifest.json` (`gaza-gate-v1` cache)
- **Activate** — deletes old caches, calls `clients.claim()` to take control of open tabs
- **Fetch** — network-first for same-origin GETs; on failure, falls back to cache; for navigation requests, returns the cached `/` as an offline page
- **`SKIP_WAITING` message** — supported so future deploys can prompt users to update

Registered in `src/main.jsx` on the `window.load` event (non-blocking).

### 4.7 Cross-Platform Compatibility

| Platform | Install Trigger | Status Detection |
| --- | --- | --- |
| **Chrome / Edge (Android + Desktop)** | `beforeinstallprompt` event | `display-mode: standalone` media query |
| **Samsung Internet** | Same as Chrome | Same |
| **Safari (iOS)** | Manual via Share → Add to Home Screen | `navigator.standalone === true` |
| **Firefox** | Limited support — banner hidden gracefully | n/a |

The hook handles the iOS case explicitly because iOS doesn't fire `beforeinstallprompt`. The banner is shown only when `canInstall && !isDismissed`, so iOS users won't see a non-functional install button.

### 4.8 Mobile Optimization

Beyond the PWA, the project is built mobile-first:

- **Touch targets** — all interactive elements ≥ 44×44px
- **Bottom navigation** for the customer experience (mobile) vs top navbar (desktop)
- **Image optimization** — `loading="lazy"`, `decoding="async"`, `fetchpriority="high"` for above-the-fold, WebP for hero banner (96% smaller than the PNG original)
- **CSS Grid `auto-fit` / `minmax(0, 1fr)`** — prevents grid items from overflowing their cells
- **No layout shift** — all skeletons + placeholders are dimensioned
- **Swipe-to-dismiss** notifications via `useSwipeToDismiss` hook

---

## 5. UI Components & Branding Assets

### 5.1 Layout Components

#### `CustomerLayout`
Wraps every authenticated customer route:

```jsx
<>
  <PWAInstallBanner />
  <CustomerNavbar logo="/assets/logo-gaza-gate.png" ... />
  <Outlet />
</>
```

Mounted via the route guard (`<RequireCustomer><CustomerLayout>...</CustomerLayout></RequireCustomer>`).

#### `RequireCustomer` / `RequireSeller` / `RequireAdmin`
Nested route guards that:

1. Render a unified `FullPageLoading` (branded spinner) during bootstrap, switching, or waiting states
2. Auto-trigger `switchRole()` if the user's role doesn't match the route's expected role
3. Redirect to login or to the appropriate role's home when the auth state is settled
4. Render `<Outlet />` only when the user is fully authorized

Each has its own CSS file (`RequireCustomer.css`, `RequireSeller.css`, `RequireAdmin.css`) but shares the same loading-screen pattern.

#### Navbar Variants
- **`CustomerNavbar.jsx`** — orange-themed, with cart count, wishlist count, profile menu, switch-role button
- **`SellerNavbar.jsx`** — dark navy, with seller-specific links (Dashboard, Products, Orders, Ratings, Notifications)
- **`Navbar.jsx`** — legacy/generic navbar used on public auth pages
- **`AdminSidebar.jsx` + `AdminTopbar.jsx`** — admin shell (sidebar + topbar pattern)

### 5.2 Core Components Inventory

| Component | Purpose |
| --- | --- |
| `PWAInstallBanner` | Install prompt (see §4.3) |
| `SwitchRoleButton` | Smart role-switcher (see §2.5) |
| `RoleSwitchOverlay` | Global overlay during role switch (z-index 9999) |
| `RoleSwitchListener` | Renders `RoleSwitchOverlay` based on `AuthContext` state |
| `NotificationBell` + `NotificationDropdown` | Header notification widget with live updates |
| `BuyerProductReviewsSection` | Public product reviews display (read-only) |
| `SellerRatingsSection` | Seller-side ratings widget |
| `ReviewModal` | Review submission/edit modal (with star rating) |
| `ProductFormModal` | Add/Edit product (used in `ProductsList`) |
| `ProductDetailsModal` | View product details from seller dashboard |
| `BecomeSellerForm` | Multi-step "Become a Seller" form |
| `ConvertToBuyerModal` | Reverse — "Convert back to Customer" |
| `ConvertToSeller` page | Standalone "Become a Seller" landing |
| `CheckoutSteps` | Progress indicator for the checkout funnel |
| `CustomerChatWidget` + `FloatingChatWidget` | Customer-side / seller-side chat overlay |
| `ThemeToggle` + `FloatingThemeToggle` | Light/Dark mode toggle (FAB) |
| `ThemeLogo` | Logo that adapts to theme (light/dark variants) |
| `GoogleBtn` + `OAuthButtons` | Google OAuth sign-in buttons |
| `OnboardingStep` | Reusable step in the onboarding flow |
| `BuyerIllustration` + `SellerIllustration` | Onboarding illustrations (inline SVGs) |
| `FormCard` | Card wrapper for forms |
| `InputField` | Themed text input (label + error + icon) |
| `ToggleSwitch` | iOS-style toggle |
| `Toast` | Snackbar notifications |
| `ConfirmModal` | Generic confirmation dialog |
| `CancelOrderModal` | Order cancellation flow |
| `SidebarContext` | Shared state for sidebar collapse (admin) |
| `Skeleton` + `StateView` | Loading skeletons and empty/error states |
| `useSwipeToDismiss` hook | Touch gesture for notifications |

### 5.3 Page Inventory (50+ pages)

**Public (12):** `SplashScreen`, `Onboarding`, `BuyerOnboarding`, `SellerOnboarding`, `Login`, `LoginCustomer`, `RegisterCustomer`, `RegisterSeller`, `VerifyEmail`, `VerifyOTP`, `ForgotPassword`, `ChangePassword`, `AuthSuccess`

**Customer (15):** `CustomerHome`, `CustomerProducts`, `CustomerProductDetails`, `CustomerCart`, `CustomerFavorites`, `CustomerMyOrders`, `CustomerOrderTracking`, `CustomerCheckoutReview`, `CustomerCheckoutPayment`, `CustomerCheckoutConfirm`, `CustomerCheckoutFailed`, `CustomerNotifications`, `CustomerMessages`, `CustomerProfile`, `CustomerProfilePage`, `CustomerStoreProfile`, `ProductMissing`, `EditStoreProfile`

**Seller (8):** `Dashboard`, `ProductsList`, `OrdersManagement`, `OrderDetails`, `RatingsManagement`, `SellerNotifications`, `Messages`, `StoreProfile`, `EditStoreProfile`

**Admin (7):** `AdminDashboard`, `AdminUsers`, `AdminCategories`, `AdminReports`, `AdminNotifications`, `AdminSettings`, `AdminProfile`

### 5.4 Branding & Visual Identity

**Colors (locked in `tailwind.config.js` + `index.css`):**
- **Brand Orange `#F97316`** — primary CTA, accents, focus rings, theme color
  - `brand-50` (lightest tint) → `brand-900` (darkest)
  - **Stays identical in light and dark mode** (visual identity anchor)
- **Navy / Soft Dark** (slate-based, eye-comfortable):
  - `navy-950` → `navy-900` → `navy-800` (body + cards)
  - `navy-100` → `navy-200` → `navy-300` (text)
- **Emerald `#10B981`** — "متوفر" availability badge
- **Indigo accents** — chat widgets, info chips

**Typography:**
- **Tajawal** (Google Fonts) — Arabic + Latin, weights 400/500/700/800
- Loaded via `preconnect` for fast first paint
- Used project-wide; consistent in headings, body, and UI labels

**Logos & Icons:**
- `public/app-icon.png` (512×512, maskable) — Android launcher
- `public/logo.png` (149KB) — dark-surface logo
- `public/assets/logo-gaza-gate.png` (146KB) — full color logo
- `public/assets/pwa-icon.png` (legacy 192×192)
- `public/favicon.svg` — legacy tab icon
- `public/assets/icon.svg` — inline PWA icon
- `public/buyer.png`, `public/seller.png` — onboarding illustrations

**Branding iterations (4 commits in one week):**
1. Initial PWA manifest + favicon with the official project logo
2. App icon updated to textless centered logo
3. Icon updated with clean centered layout (3 successive refinements for safe-area compliance on all launchers)

**Dark mode strategy:**
- `darkMode: 'class'` in Tailwind
- `initTheme()` runs **before** React mounts to prevent FOUC
- CSS variables (`--bg-page`, `--text-dark`, etc.) swap on `.dark` class
- 3 user-selectable modes: **light**, **dark**, **system** (follows `prefers-color-scheme`)

### 5.5 Responsive Design

- **Breakpoints:** 480px (small mobile), 768px (large mobile/tablet), 1024px (tablet), 1280px+ (desktop)
- **Patterns:** CSS Grid for product/category grids, Flexbox for navbars and forms
- **Touch-friendly:** all buttons and inputs sized for finger taps
- **Bottom sheets on mobile** for modals (`ProductDetailsModal` adapts)
- **Swipe gestures** for notification dismissal

---

## 6. Technical Skills & Tools Checklist

### 6.1 React Hooks (in active use)

| Hook | Where | Why |
| --- | --- | --- |
| `useState` | Everywhere | Local state |
| `useEffect` | Data fetching, event listeners, theme sync, scroll, socket reconnection | Side effects |
| `useMemo` | `CustomerHome.userName`, `AuthContext` value object | Referential stability for expensive objects |
| `useCallback` | `SwitchRoleButton`, `CustomerHome` handlers, all event-emitting functions | Stable function references for child memoization |
| `useRef` | `AuthContext.switchInProgressRef`, `RequireCustomer.autoSwitchRanRef`, focus mgmt, `useAutoRefreshToken.intervalRef` | Mutable refs that don't trigger re-renders |
| `useContext` | `useAuth()`, `useCart()`, `useWishlist()`, `useTheme()` | Cross-cutting state |
| `useReducer` | `useLogin` hook (form state) | Complex form transitions |
| `useLayoutEffect` | `useSwipeToDismiss` | Pre-paint DOM measurements |
| `memo` | `ProductSkeleton`, `ProductCard` in `CustomerHome` | Skip re-render of expensive list items |

### 6.2 Design Patterns

| Pattern | Where | Purpose |
| --- | --- | --- |
| **Context + Reducer** | `AuthContext`, `CartContext`, `WishlistContext`, `useTheme` | Cross-cutting state without external library |
| **Custom Hooks** | `usePWAInstallationState`, `useAutoRefreshToken`, `useTheme`, `useLogin`, `useNotificationCount`, `useSwipeToDismiss` | Encapsulate reusable logic |
| **Route Guards** | `RequireCustomer`, `RequireSeller`, `RequireAdmin` | Nested-route auth checks with auto-switch |
| **Event Bus** | `gaza-gate-auth-changed`, `gaza-gate-role-cache-clear`, `gaza-gate-theme-changed` | Decouple contexts from consumers |
| **Module-level singleton** | `api` (axios), `refreshPromise` (in api.js) | Share one HTTP client + one refresh in-flight |
| **Lazy import** | `socket.js` inside `reconnectSocketSafely` | Code-split heavy dependencies |
| **Render Props / Slot** | `CustomerLayout` receives `cartCount`/`wishlistCount` | Layout composition |
| **Wrapper / Decorator** | `axios.interceptors.request.use`, `axios.interceptors.response.use` | Cross-cutting concerns on HTTP |
| **Race-condition lock** | `switchInProgressRef`, `isRefreshingForSocket` | Prevent duplicate async work |
| **Atomic state commit** | `flushStateUpdates()` (double `requestAnimationFrame`) | Sync state with navigation |
| **Fallback chain** | `getPublicCategories` (auth → public → local) | Resilient API integration |
| **Optimistic UI** | Cart and wishlist mutations | Snappy UX |
| **Provider composition** | `main.jsx` — strict nesting of 5 providers | Clear dependency order |

### 6.3 State Management

- **No external library** (no Redux, Zustand, Jotai, Recoil)
- React Context + `useReducer`/`useState` is the entire state layer
- **localStorage** is the source of truth for session; React state mirrors it
- **Event-driven cross-context sync** instead of context composition
- **Custom hooks** to slice the context API for specific concerns

### 6.4 Form Management

- **Formik** + **Yup** for all major forms (Login, Register, Onboarding, BecomeSeller, Product create/edit)
- Bilingual error messages (Arabic via Yup `.message()` callbacks)
- Reusable `FormCard`, `InputField`, `ToggleSwitch` components
- Optimistic submission with server-side validation errors

### 6.5 HTTP & Networking

- **Axios 1.17** with request/response interceptors
- **Single shared instance** — every service uses the same `api`
- **Bearer token auth** via `Authorization` header
- **withCredentials** for cookie-based refresh token
- **FormData support** with explicit `Content-Type: multipart/form-data` fix
- **Centralized 401 handling** with shared `refreshPromise`

### 6.6 Real-time

- **socket.io-client** for chat + notifications
- **Lazy-loaded** to keep initial bundle small
- **Auto-reconnect** with token refresh on `connect_error`
- **Disconnect/reconnect** cycle after every role switch (because JWT carries userId)

### 6.7 OAuth

- **@react-oauth/google** with `GoogleOAuthProvider` at the root
- **Customer Google Login/Register** (single-step)
- **Seller Google Login** (single-step) + **Register** (two-step: `init` → `complete`)

### 6.8 Build & Tooling

- **Vite 5.4** for dev + build
- **ESLint 8** with `react-hooks` and `react-refresh` plugins
- **Tailwind 3.4** + **PostCSS** + **Autoprefixer**
- **Sharp** for build-time image optimization
- **Git** with semantic commits (`feat:`, `fix:`, `refactor:`, `merge:`, `chore:`)

### 6.9 Performance Considerations

- **Code splitting** via dynamic imports (`socket.js`, `reconnectSocketSafely`)
- **Memoization** on hot paths (`ProductCard`, `SwitchRoleButton`, expensive selectors)
- **Image optimization** — WebP for hero, `loading="lazy"`, `fetchpriority="high"`, `decoding="async"`, `width`/`height` to prevent CLS
- **Service Worker** for offline support + asset caching
- **CSS variables** swap themes without re-renders
- **10-min token refresh** keeps sessions alive without spamming the backend
- **Shared `refreshPromise`** prevents N parallel refresh calls on simultaneous 401s

### 6.10 Accessibility

- Semantic HTML (`<button>`, `<nav>`, `<section>`, `<main>`)
- `aria-label`, `aria-busy`, `role="status"`, `role="alert"`, `role="banner"`
- Keyboard navigation: `Enter` / `Space` triggers on product cards
- `dir="rtl"` at the HTML root, plus per-component RTL testing
- Focus-visible styles (custom orange ring)

### 6.11 Testing & Quality

- Manual end-to-end flows documented in commit messages
- **Code review report** at `docs/CODE-REVIEW-REPORT.md` (642 lines, generated during a major merge)
- **Endpoint extraction scripts** in `scripts/` and `docs/` (sync the frontend with the Postman collection)
- **Branching strategy** — `development` (active), `main` (release), with merge commits resolving conflicts explicitly

### 6.12 Git Workflow

- **Conventional commits** with semantic prefixes
- **Frequent merges** between customer-side and seller-side branches
- **Conflict resolution commits** like `merge: integrate seller updates (productService, notifications, orders)` clearly describe what was resolved
- **Recent activity** — 8+ commits in the last 10 days, including the PWA integration series (`feat: setup PWA installation banner...` followed by 4 icon-refinement commits)

### 6.13 i18n

- **Primary language:** Arabic
- **Secondary:** English (technical comments, error fallback messages)
- **No i18n library** — strings are inline in components (acceptable for a single-language product, easily migrated to `react-i18next` later)
- **Bilingual error messages** — backend English messages are often translated at the frontend level

---

## Appendix A — File-by-File Reference

### A.1 `src/utils/`

| File | Purpose |
| --- | --- |
| `api.js` | Axios instance, request/response interceptors, `authAPI` helpers |
| `authSession.js` | localStorage session persistence + `gaza-gate-auth-changed` event |
| `jwt.js` | `decodeJwt`, `getRoleFromToken`, `isTokenExpired` |
| `socket.js` | Socket.io singleton with token-aware reconnect |
| `validators.js` | Generic input validators |
| `validationSchemas.js` | Yup schemas for forms |
| `userScope.js` | `scopedKey()` — per-user localStorage keys |
| `sellerHelpers.js` | Seller-specific formatting/calculations |
| `orderStatus.js` | Order status enum + display labels (bilingual) |
| `notificationRoutes.js` | Maps notification `type` → frontend route |
| `notificationRoleFilter.js` | Filters notifications by role |
| `reviewEligibility.js` | "Can this customer review this product?" logic |
| `googleAuth.js` | Google OAuth client-side helpers |
| `errorMessages.js` | Bilingual error message dictionary |
| `errorHelper.js` | `extractErrorMessage(err)` |
| `chatHelpers.js` | Conversation list/message utilities |

### A.2 `src/services/`

| File | Domain | Highlights |
| --- | --- | --- |
| `authService.js` | Auth + cart + wishlist | All login flows, `refreshAccessToken`, `getAuthToken`, `getCurrentUser` |
| `roleService.js` | Role transitions | `submitBecomeSeller`, `switchUserRole`, `submitBecomeCustomer`, `fetchProfileFlags` (parallel) |
| `productService.js` | Products + categories | CRUD, public listing, **3-tier category fallback** |
| `orderService.js` | Orders (both roles) | `createOrder`, `cancelOrder`, `rejectOrder`, `updateOrderStatus` |
| `notificationService.js` | Notifications (both roles) | Paginated, with `markRead`, `markAllRead`, `delete` |
| `reviewService.js` | Reviews (both roles) | Submit, reply, edit, delete, with `ReviewError` class |
| `profileService.js` | Customer profile | Get/update profile |
| `storeService.js` | Store profile | Get/update store data |
| `dashboardService.js` | Seller analytics | `getSellerDashboard()` |
| `conversationService.js` | Chat | Conversations + messages |
| `adminService.js` | Admin tools | Users, categories, settings |
| `settingsService.js` | Admin settings | Notification preferences |

### A.3 `src/context/`

| File | Purpose |
| --- | --- |
| `AuthContext.jsx` | Session, role, role-switching, auto-refresh — **the brain of the app** |
| `CartContext.jsx` | Cart items scoped per `userId` via `userScope.scopedKey()` |
| `WishlistContext.jsx` | Favorites, same scoping pattern |

### A.4 `src/hooks/`

| File | Purpose |
| --- | --- |
| `usePWAInstallationState.jsx` | PWA install prompt lifecycle (see §4.2) |
| `useAutoRefreshToken.js` | 10-min silent token refresh (see §2.4) |
| `useTheme.jsx` | Dark mode + 3 modes (light/dark/system) |
| `useNotificationCount.js` | Polls + listens for notification count |
| `useLogin.js` | Formik-powered login flow |
| `useSwipeToDismiss.js` | Touch gesture for notification dismissal |

---

## Appendix B — Recent Milestones (last 8 commits)

| Date | Commit | Description |
| --- | --- | --- |
| 2026-08-11 | `52a12e4` | fix: update PWA icon with clean centered layout |
| 2026-08-11 | `e62c9bc` | fix: update PWA icon with clean centered layout |
| 2026-08-11 | `8b74e5c` | fix: update PWA icon with clean centered layout |
| 2026-08-11 | `09f3a51` | fix: update PWA app icon to textless centered logo |
| 2026-08-11 | `8861e07` | fix: update PWA manifest and favicon with official project logo |
| 2026-08-11 | `f325e2c` | **feat: setup PWA installation banner and update project logo** (+2,519/-950 lines across 38 files) |
| 2026-08-05 | `30f83e1` | Resolve merge conflicts and update frontend features (+15,811 lines) |
| 2026-08-04 | `249825a` | Edits to seller files (+866/-181) |

---

## Appendix C — Environment & Configuration

**Environment Variables:**

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | Backend base URL | `https://gaza-gate-backend-f9hf.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client | (required for Google login) |

**Storage Keys Summary:**

| Key | Scope | Lifetime |
| --- | --- | --- |
| `token` | localStorage or sessionStorage | session (or 10-day if "remember me") |
| `refreshToken` | localStorage + HTTP-only cookie | session |
| `user` | localStorage | session |
| `userType` | localStorage | session |
| `sellerId` | localStorage | per-customer cached seller |
| `pwa-install-dismissed` | localStorage | persistent |
| `gaza-gate-theme` | localStorage (JSON) | persistent |
| `gaza-gate-cart` (per-user scoped) | localStorage | persistent per user |
| `gaza-gate-wishlist` (per-user scoped) | localStorage | persistent per user |

**Custom Events:**

| Event | Detail Payload | Listeners |
| --- | --- | --- |
| `gaza-gate-auth-changed` | none | All `useAuth()` consumers, Navbar, Cart, Wishlist |
| `gaza-gate-role-cache-clear` | `{ fromRole, toRole, ts }` | Cart, Wishlist, Notifications (clear stale data) |
| `gaza-gate-theme-changed` | `{ mode, effective }` | All CSS-variable consumers (auto via class) |

---

*This documentation covers the full frontend codebase as of 2026-08-11. For backend API contract details, see the Postman collection in the backend repository. For individual component behavior, see the in-file comments — every service and context is heavily documented in Arabic and English.*
