import productJambari from "../assets/product-jambari.jpg";
import productShirt from "../assets/product-shirt.jpg";
import productOliveOil from "../assets/product-oliveoil.jpg";

export const customerProducts = [
  {
    id: 1,
    slug: "zayt-zaytun-asli",
    name: "زيت زيتون أصلي",
    store: "متجر فلسطين",
    price: 45,
    qty: 20,
    rating: 4.8,
    reviewCount: 92,
    category: "food",
    categoryLabel: "أطعمة",
    status: "نشط",
    available: true,
    freeShipping: true,
    description:
      "زيت زيتون بكر ممتاز 100% من أشجار فلسطينية، عصرة أولى باردة، غني بالنكهة والفوائد الصحية.",
    image: productOliveOil,
  },
  {
    id: 2,
    slug: "qamees-qotni-kajwal",
    name: "قميص قطني كاجوال",
    store: "فاشون هاوس",
    price: 95,
    qty: 10,
    rating: 4.3,
    reviewCount: 156,
    category: "clothes",
    categoryLabel: "ملابس",
    status: "نشط",
    available: true,
    freeShipping: true,
    description:
      "قميص قطني 100% بقصة مريحة، متوفر بألوان متعددة ومقاسات S-XL، مناسب للاستخدام اليومي والسفر.",
    image: productShirt,
  },
  {
    id: 3,
    slug: "jambri",
    name: "جمبري",
    store: "شيف هيا",
    price: 100,
    qty: 10,
    rating: 4.3,
    reviewCount: 48,
    category: "food",
    categoryLabel: "أطعمة",
    status: "نشط",
    available: true,
    freeShipping: false,
    description:
      "جمبري طازج محضّر بعناية، مثالي للوجبات العائلية والمناسبات، يُسلّم مبرداً للحفاظ على الجودة.",
    image: productJambari,
  },
  
];

export function getProductBySlug(slug) {
  return customerProducts.find((p) => p.slug === slug);
}

export function getProductById(id) {
  return customerProducts.find((p) => p.id === Number(id));
}

export function getProductPath(product) {
  return `/products/${product.slug}`;
}
