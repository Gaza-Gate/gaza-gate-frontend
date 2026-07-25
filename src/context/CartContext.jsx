import { createContext, useContext, useEffect, useState } from "react";
import { addToCart, getAuthToken } from "../services/authService";
import { getPublicProductDetails } from "../services/productService";
import { getCurrentUserId, scopedKey } from "../utils/userScope";

const CART_BASE_KEY = "gaza-gate-cart";

const CartContext = createContext(null);

function extractSellerId(product) {
  return (
    product?.sellerId ||
    product?.seller?._id ||
    product?.seller?.id ||
    null
  );
}

function loadItemsForCurrentUser() {
  try {
    const saved = localStorage.getItem(scopedKey(CART_BASE_KEY));
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [userId, setUserId] = useState(getCurrentUserId());
  const [items, setItems] = useState(() => loadItemsForCurrentUser());

  // إعادة تحميل السلة عند تسجيل دخول/خروج (بدون الحاجة لإعادة تحميل الصفحة)
  useEffect(() => {
    function handleAuthChanged() {
      setUserId(getCurrentUserId());
    }
    window.addEventListener("gaza-gate-auth-changed", handleAuthChanged);
    return () =>
      window.removeEventListener("gaza-gate-auth-changed", handleAuthChanged);
  }, []);

  // كل ما يتغير المستخدم، حمّلي سلته الخاصة
  useEffect(() => {
    setItems(loadItemsForCurrentUser());
  }, [userId]);

  // احفظي أي تغيير بالسلة بمفتاح خاص بالمستخدم الحالي
  useEffect(() => {
    localStorage.setItem(scopedKey(CART_BASE_KEY), JSON.stringify(items));
  }, [items, userId]);

 const addItem = async (product, quantity = 1) => {
    const productId = product.id || product._id;
    let enrichedProduct = product;
    let sellerId = extractSellerId(product);

    if (!sellerId) {
      try {
        const fullProduct = await getPublicProductDetails(productId);
        sellerId = extractSellerId(fullProduct);
        enrichedProduct = { ...product, ...fullProduct };
      } catch (err) {
        console.error("تعذر جلب تفاصيل المنتج لمعرفة البائع:", err);
      }
    }

    const token = getAuthToken();
    if (!token) {
      throw new Error("الرجاء تسجيل الدخول لإضافة المنتج للسلة");
    }

    // ننادي السيرفر أولاً - لو رفض، منوقف هون ومنرمي الخطأ
    await addToCart(productId, quantity, token);

    // لو نجح السيرفر، هلأ منحدث السلة المحلية
    setItems((prev) => {
      const existing = prev.find((i) => i.id === productId);
      if (existing) {
        return prev.map((i) =>
          i.id === productId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...enrichedProduct, id: productId, quantity, sellerId }];
    });
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, cartCount, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}