#!/usr/bin/env node
/**
 * Generate every PNG icon size we need from public/icon.svg.
 * Outputs:
 *   public/icon-192.png   (PWA manifest)
 *   public/icon-512.png   (PWA manifest)
 *   public/apple-touch-icon.png         (iOS home-screen, 180x180)
 *   public/favicon-32.png / -16.png     (legacy favicons)
 *   ios/OracleApp/AppIcon.appiconset/*  (all required iOS marketing sizes)
 *
 * Usage:  pnpm icons
 * Requires `sharp` (devDep).
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "public/icon.svg");

const PWA_OUTPUTS = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["public/favicon-32.png", 32],
  ["public/favicon-16.png", 16],
];

// iOS marketing icon sizes per Apple Human Interface Guidelines (April 2024).
// Single 1024x1024 marketing icon is required by App Store Connect; iOS pulls
// the rest from the app bundle's AppIcon.appiconset.
const IOS_OUTPUTS = [
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-1024.png", 1024],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-180.png", 180],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-167.png", 167],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-152.png", 152],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-120.png", 120],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-87.png", 87],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-80.png", 80],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-76.png", 76],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-58.png", 58],
  ["ios/OracleApp/AppIcon.appiconset/AppIcon-40.png", 40],
];

if (!existsSync(SRC)) {
  console.error(`Source SVG missing at ${SRC}`);
  process.exit(1);
}

const svg = await readFile(SRC);

async function emit(relativePath, size) {
  const out = resolve(ROOT, relativePath);
  await mkdir(dirname(out), { recursive: true });
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9, quality: 95 })
    .toFile(out);
  console.log(`  ${relativePath}  ${size}x${size}`);
}

console.log("PWA icons:");
for (const [path, size] of PWA_OUTPUTS) await emit(path, size);

console.log("iOS icons:");
for (const [path, size] of IOS_OUTPUTS) await emit(path, size);

const contentsJson = {
  images: [
    { idiom: "iphone", scale: "2x", size: "20x20", filename: "AppIcon-40.png" },
    { idiom: "iphone", scale: "3x", size: "20x20", filename: "AppIcon-58.png" },
    { idiom: "iphone", scale: "2x", size: "29x29", filename: "AppIcon-58.png" },
    { idiom: "iphone", scale: "3x", size: "29x29", filename: "AppIcon-87.png" },
    { idiom: "iphone", scale: "2x", size: "40x40", filename: "AppIcon-80.png" },
    { idiom: "iphone", scale: "3x", size: "40x40", filename: "AppIcon-120.png" },
    { idiom: "iphone", scale: "2x", size: "60x60", filename: "AppIcon-120.png" },
    { idiom: "iphone", scale: "3x", size: "60x60", filename: "AppIcon-180.png" },
    { idiom: "ipad", scale: "1x", size: "76x76", filename: "AppIcon-76.png" },
    { idiom: "ipad", scale: "2x", size: "76x76", filename: "AppIcon-152.png" },
    { idiom: "ipad", scale: "2x", size: "83.5x83.5", filename: "AppIcon-167.png" },
    { idiom: "ios-marketing", scale: "1x", size: "1024x1024", filename: "AppIcon-1024.png" },
  ],
  info: { author: "xcode", version: 1 },
};
await writeFile(
  resolve(ROOT, "ios/OracleApp/AppIcon.appiconset/Contents.json"),
  JSON.stringify(contentsJson, null, 2) + "\n",
);
console.log("\nContents.json written.");
