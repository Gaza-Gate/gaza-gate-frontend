/**
 * scripts/optimize-hero.mjs
 * ─────────────────────────
 * يحوّل hero-banner.png إلى WebP + نسخة PNG مضغوطة
 * يقلّل الحجم بشكل كبير (~13.9MB → ~300KB WebP)
 *
 * الاستخدام: node scripts/optimize-hero.mjs
 */

import sharp from "sharp";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "src/assets/hero-banner.png");
const OUT_WEBP = resolve(ROOT, "src/assets/hero-banner.webp");
const OUT_PNG = resolve(ROOT, "src/assets/hero-banner.opt.png");

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const beforeStat = await stat(SRC);
  console.log(`📦 الأصل:  ${fmtBytes(beforeStat.size)}`);

  // ── WebP: quality 80, max width 1920 (full HD) ──
  await sharp(SRC)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(OUT_WEBP);

  // ── PNG مضغوط كـ fallback للمتصفحات القديمة ──
  await sharp(SRC)
    .resize({ width: 1920, withoutEnlargement: true })
    .png({ quality: 80, compressionLevel: 9, effort: 10 })
    .toFile(OUT_PNG);

  const webpStat = await stat(OUT_WEBP);
  const pngStat = await stat(OUT_PNG);

  console.log(`✨ WebP:    ${fmtBytes(webpStat.size)}  (${((1 - webpStat.size / beforeStat.size) * 100).toFixed(1)}% أصغر)`);
  console.log(`📐 PNG:     ${fmtBytes(pngStat.size)}  (${((1 - pngStat.size / beforeStat.size) * 100).toFixed(1)}% أصغر)`);
  console.log(`\n✅ خلصنا!`);
  console.log(`   - src/assets/hero-banner.webp`);
  console.log(`   - src/assets/hero-banner.opt.png`);
  console.log(`\n💡 الـ PNG الأصلي (13.9MB) لسا موجود. لو بدك تنقّص dist أكثر:`);
  console.log(`   - استخدم hero-banner.webp (دائماً أصغر)`);
  console.log(`   - أو احذف hero-banner.png الأصلي بعد التأكد إنه مش مستخدم`);
}

main().catch((err) => {
  console.error("❌ فشل التحويل:", err);
  process.exit(1);
});
