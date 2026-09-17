// Rough clo-style warmth values per real wardrobe item, for "Check my
// outfit" — comparing what a parent says baby is actually wearing against
// what recommend() would have picked for the same conditions. Values are
// deliberately approximate (not a clinical clo measurement): they only need
// to be consistent enough, relative to each other, for the comparison to
// point in the right direction. Derived from LAYER_WARMTH (temperature.ts's
// sibling file, layers.ts) wherever a garment maps to one of those kinds.
//
// Deliberately excludes: sleep sacks/swaddle (TOG-rated, a different scale
// tied to room temperature — see pick-sleep.ts) and transport-only items
// (stroller, footmuff, blanket, rain cover, carrier, covers) that aren't
// worn on baby's body.
import type { WardrobeSlug } from "../wardrobe-catalog";

export const CLO_BY_SLUG: Partial<Record<WardrobeSlug, number>> = {
  // Base
  sleeveless_bodysuit: 0.15,
  short_sleeve_bodysuit: 0.2,
  long_sleeve_bodysuit: 0.3,
  romper: 0.3, // one-piece covering base + bottom
  pajamas: 0.4,

  // Bottoms
  shorts: 0.1,
  pants: 0.2,
  leggings: 0.25,
  tights: 0.2,
  wool_leggings: 0.35,

  // Mid
  sweater: 0.35,
  cardigan: 0.35,
  hoodie: 0.35,
  fleece_layer: 0.5,
  wool_layer: 0.5,

  // Outer
  light_overall: 0.4,
  fleece_overall: 0.5,
  wool_overall: 0.5,
  softshell_overall: 0.6,
  rain_overall: 0.3,
  winter_overall: 1.2,
  jacket: 0.5,
  snow_pants: 0.6,

  // Accessories
  thin_hat: 0.05,
  warm_hat: 0.15,
  balaclava: 0.2,
  mittens: 0.1,
  cotton_socks: 0.05,
  wool_socks: 0.15,
  booties: 0.05,
  winter_boots: 0.15,
  neck_warmer: 0.05,
  // Sun hat protects from UV, not cold — no warmth contribution.
  sun_hat: 0,
};

/** Wardrobe categories that belong in an outfit check — see the exclusions above. */
export const OUTFIT_CHECK_STEP_IDS = ["base", "bottoms", "mid", "outer", "accessories"];

export function outfitWarmth(slugs: Iterable<WardrobeSlug>): number {
  let total = 0;
  for (const s of slugs) total += CLO_BY_SLUG[s] ?? 0;
  return total;
}

/** Sums the warmth of whatever recommend() actually picked for the conditions. */
export function recommendedWarmth(rec: {
  babyClothing: { slug: WardrobeSlug | "diaper_only" }[];
  accessories: { slug: WardrobeSlug }[];
}): number {
  let total = 0;
  for (const l of rec.babyClothing) {
    if (l.slug === "diaper_only") continue;
    total += CLO_BY_SLUG[l.slug] ?? 0;
  }
  for (const a of rec.accessories) total += CLO_BY_SLUG[a.slug] ?? 0;
  return total;
}

export type OutfitVerdict = "too_cold" | "just_right" | "too_warm";

/**
 * Tolerance band around the ideal warmth before calling it too warm/cold —
 * roughly half a mid-layer's worth (a sweater is 0.35), so swapping just a
 * hat or socks (~0.1) doesn't flip the verdict but skipping a whole layer
 * does. Tune this if real usage says it's too sensitive or not sensitive
 * enough.
 */
export const VERDICT_TOLERANCE = 0.15;

export function verdictFor(
  actualClo: number,
  idealClo: number,
): { verdict: OutfitVerdict; diff: number } {
  const diff = actualClo - idealClo;
  if (diff > VERDICT_TOLERANCE) return { verdict: "too_warm", diff };
  if (diff < -VERDICT_TOLERANCE) return { verdict: "too_cold", diff };
  return { verdict: "just_right", diff };
}
