/**
 * Shared rollout switches. Values come from Vite build-time env, so the same
 * value is inlined into SSR, browser hydration, server functions and MCP tools
 * — they can never disagree.
 *
 * VITE_TODDLER_ROLLOUT:
 *   "off"     (default) — toddler support hidden everywhere.
 *   "preview" — enabled only in the dev/preview server, never in published builds.
 *   "public"  — enabled everywhere (final release ticket only).
 *
 * Turning it off only hides toddler UI/rules; it never touches saved
 * profiles, wardrobes or feedback.
 */
export type Rollout = "off" | "preview" | "public";

export function parseRollout(value: unknown): Rollout {
  return value === "preview" || value === "public" ? value : "off";
}

export function isRolloutEnabled(rollout: Rollout, isDev: boolean): boolean {
  if (rollout === "public") return true;
  if (rollout === "preview") return isDev;
  return false;
}

export const TODDLER_ROLLOUT: Rollout = parseRollout(import.meta.env.VITE_TODDLER_ROLLOUT);

export function toddlerSupportEnabled(): boolean {
  return isRolloutEnabled(TODDLER_ROLLOUT, Boolean(import.meta.env.DEV));
}

/** First completed month covered by toddler support (12–35 months). */
export const TODDLER_MIN_MONTHS = 12;
export const TODDLER_MAX_MONTHS = 35;

/** True when toddler-specific rules should apply for this age. */
export function toddlerRulesApply(ageMonths: number | null | undefined, enabled = toddlerSupportEnabled()): boolean {
  return enabled && ageMonths != null && ageMonths >= TODDLER_MIN_MONTHS && ageMonths <= TODDLER_MAX_MONTHS;
}
