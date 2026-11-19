// Optimize hero slider images: resize to max 1920px wide, convert to WebP (q=80).
// Run once with: node scripts/optimize-hero-images.mjs
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src", "assets", "hero-source");
const OUT_DIR = path.resolve(__dirname, "..", "public", "assets", "hero");

const FILES = [
  { src: "perfume.jpeg", out: "hero-perfume.webp", alt: "عطر فاخر" },
  { src: "embroidery.jpeg", out: "hero-embroidery.webp", alt: "تطريز فلسطيني" },
  { src: "giftbox.jpeg", out: "hero-giftbox.webp", alt: "صندوق هدايا" },
  { src: "food.jpeg", out: "hero-food.webp", alt: "مأكولات تقليدية" },
  { src: "pottery.jpeg", out: "hero-pottery.webp", alt: "فخار يدوي" },
];

const MAX_WIDTH = 1920;
const QUALITY = 80;

await fs.mkdir(OUT_DIR, { recursive: true });

let totalBytes = 0;
for (const f of FILES) {
  const inputPath = path.join(SRC_DIR, f.src);
  const outputPath = path.join(OUT_DIR, f.out);

  const meta = await sharp(inputPath).metadata();
  const targetWidth = Math.min(meta.width, MAX_WIDTH);

  await sharp(inputPath)
    .rotate() // auto-rotate based on EXIF
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 4 })
    .toFile(outputPath);

  const stat = await fs.stat(outputPath);
  totalBytes += stat.size;
  console.log(
    `✓ ${f.out}  (${targetWidth}px wide, ${(stat.size / 1024).toFixed(1)} KB)`
  );
}

console.log(
  `\nDone. ${FILES.length} images, total ${(totalBytes / 1024).toFixed(
    1
  )} KB (avg ${(totalBytes / FILES.length / 1024).toFixed(1)} KB each)`
);
