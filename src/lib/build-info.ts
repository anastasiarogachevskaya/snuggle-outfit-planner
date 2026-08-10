import { getPlatform, isNativeApp } from "@/lib/platform";

/**
 * Where the running app was loaded from, and which build it is.
 * Used by the dev-only badge and the startup log so there is never any
 * ambiguity about what the iOS wrapper is actually rendering.
 */

export type AppSource =
  | { kind: "remote"; origin: string }
  | { kind: "bundled"; origin: string };

/** Bundled Capacitor assets are served from capacitor://, ionic:// or file://. */
const BUNDLED_PROTOCOLS = ["capacitor:", "ionic:", "file:"];

export function getAppSource(): AppSource {
  if (typeof window === "undefined") return { kind: "remote", origin: "server" };
  const { protocol, origin, href } = window.location;
  const kind = BUNDLED_PROTOCOLS.includes(protocol) ? "bundled" : "remote";
  return { kind, origin: origin && origin !== "null" ? origin : href };
}

/** Short build identifier (commit SHA when the build injects one). */
export function getBuildId(): string {
  const raw = import.meta.env.VITE_BUILD_ID as string | undefined;
  if (raw && raw.trim()) return raw.trim().slice(0, 7);
  return import.meta.env.DEV ? "dev" : "unknown";
}

/** e.g. "iOS • production web • f25075e" or "Web • dev". */
export function getBuildLabel(): string {
  const platform = getPlatform();
  const prefix = platform === "ios" ? "iOS" : platform === "android" ? "Android" : "Web";
  const source = getAppSource();
  const where = !isNativeApp()
    ? null
    : source.kind === "bundled"
      ? "bundled"
      : source.origin.includes("layerly.online")
        ? "production web"
        : source.origin;
  return [prefix, where, getBuildId()].filter(Boolean).join(" • ");
}

let logged = false;

/** Logs the loaded source exactly once (native app, or dev on the web). */
export function logAppSource(): void {
  if (logged) return;
  if (typeof window === "undefined") return;
  logged = true;
  const source = getAppSource();
  const target = source.kind === "bundled" ? "bundled" : source.origin;
  if (isNativeApp()) {
    console.info(`Layerly ${getPlatform()} source: ${target} (build ${getBuildId()})`);
  } else if (import.meta.env.DEV) {
    console.info(`Layerly web source: ${target} (build ${getBuildId()})`);
  }
}
