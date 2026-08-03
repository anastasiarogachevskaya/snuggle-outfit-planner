// Detects the static web output directory produced by the root build.
// Reads the build manifest (Nitro/TanStack Start) when present instead of
// hardcoding project-specific paths, with sensible fallbacks.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const webRoot = path.resolve(here, "..", "..");

// Build manifests written by Nitro; publicDir is relative to the manifest dir.
const manifests = [
  path.join(webRoot, ".output", "nitro.json"),
  path.join(webRoot, "dist", "nitro.json"),
];

// Fallbacks, in preference order.
const fallbacks = [
  path.join(webRoot, ".output", "public"),
  path.join(webRoot, "dist", "client"),
  path.join(webRoot, "dist"),
];

export function detectWebOutputDir() {
  for (const manifest of manifests) {
    if (!existsSync(manifest)) continue;
    try {
      const json = JSON.parse(readFileSync(manifest, "utf8"));
      if (json?.publicDir) {
        const dir = path.resolve(path.dirname(manifest), json.publicDir);
        if (existsSync(dir)) return dir;
      }
    } catch {
      // ignore malformed manifest and fall through to the fallbacks
    }
  }
  for (const dir of fallbacks) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

export function relativeWebOutputDir(fromDir) {
  const dir = detectWebOutputDir();
  return dir ? path.relative(fromDir, dir).split(path.sep).join("/") : null;
}
