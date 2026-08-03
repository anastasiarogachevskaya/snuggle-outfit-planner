#!/usr/bin/env node
/**
 * Regenerates ios-app/resources/AppIcon.appiconset from the committed master
 * artwork (ios-app/resources/AppIcon-master-1024.png), which itself is derived
 * from the PWA icon in public/icon-512.png — one source of truth for both.
 *
 * macOS only: uses the built-in `sips` tool, so there is no npm dependency.
 * You normally do NOT need to run this; the icon set is committed.
 */
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = path.resolve(here, "..", "resources");
const master = path.join(resources, "AppIcon-master-1024.png");
const outDir = path.join(resources, "AppIcon.appiconset");

if (!existsSync(master)) {
  console.error(`✖ Master icon missing: ${master}`);
  process.exit(1);
}
if (process.platform !== "darwin") {
  console.error("✖ This script needs macOS (`sips`). The icon set is committed, so this is only for regeneration.");
  process.exit(1);
}

const specs = [
  ["iphone", "20x20", "2x", 40], ["iphone", "20x20", "3x", 60],
  ["iphone", "29x29", "1x", 29], ["iphone", "29x29", "2x", 58], ["iphone", "29x29", "3x", 87],
  ["iphone", "40x40", "2x", 80], ["iphone", "40x40", "3x", 120],
  ["iphone", "57x57", "1x", 57], ["iphone", "57x57", "2x", 114],
  ["iphone", "60x60", "2x", 120], ["iphone", "60x60", "3x", 180],
  ["ipad", "20x20", "1x", 20], ["ipad", "20x20", "2x", 40],
  ["ipad", "29x29", "1x", 29], ["ipad", "29x29", "2x", 58],
  ["ipad", "40x40", "1x", 40], ["ipad", "40x40", "2x", 80],
  ["ipad", "50x50", "1x", 50], ["ipad", "50x50", "2x", 100],
  ["ipad", "72x72", "1x", 72], ["ipad", "72x72", "2x", 144],
  ["ipad", "76x76", "1x", 76], ["ipad", "76x76", "2x", 152],
  ["ipad", "83.5x83.5", "2x", 167],
  ["ios-marketing", "1024x1024", "1x", 1024],
];

mkdirSync(outDir, { recursive: true });

const written = new Set();
const images = specs.map(([idiom, size, scale, px]) => {
  const filename = `AppIcon-${px}.png`;
  if (!written.has(px)) {
    const target = path.join(outDir, filename);
    if (px === 1024) {
      copyFileSync(master, target);
    } else {
      const res = spawnSync("sips", ["-s", "format", "png", "-z", String(px), String(px), master, "--out", target], {
        stdio: "inherit",
      });
      if (res.status !== 0) process.exit(res.status ?? 1);
    }
    written.add(px);
  }
  return { filename, idiom, scale, size };
});

writeFileSync(
  path.join(outDir, "Contents.json"),
  JSON.stringify({ images, info: { author: "layerly", version: 1 } }, null, 2) + "\n",
);

console.log(`✔ Generated ${written.size} PNGs / ${images.length} catalog entries in ${outDir}`);
