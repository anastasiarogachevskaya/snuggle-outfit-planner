// Rough clo-style warmth values per real wardrobe item, for "Check my
// outfit" — comparing what a parent says baby is actually wearing against
// what recommend() would have picked for the same conditions. Values are
// deliberately approximate (not a clinical clo measurement): they only need
// to be consistent enough, relative to each other, for the comparison to
// point in the right direction. Derived from LAYER_WARMTH (layers.ts)
// wherever a garment maps to one of those kinds.
//
// Deliberately excludes: sleep sacks/swaddle (TOG-rated, a different scale
// tied to room temperature — see pick-sleep.ts) and transport-only items
// (stroller, footmuff, blanket, rain cover, carrier, covers) that aren't
// worn on baby's body.
import type { WardrobeSlug } from "../wardrobe-catalog";
import type { Recommendation } from "../recommend";

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
  // Sun hat protects from UV, not cold — no warmth contribution.
  sun_hat: 0,
};

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

// --- Slot model for "Check my outfit" -------------------------------------
//
// A free-for-all "tick everything baby is wearing" picker let a parent tick
// short-sleeve + long-sleeve + pajamas bodysuits all at once and call it a
// valid outfit. Real dressing has slots: one bodysuit (not three), but a
// bodysuit AND a sleepsuit layered over it is completely normal. So each
// slot below is a single choice — mirroring recommend()'s own internal
// LayerNeed/AccessoryNeed shape — except snow pants and mittens, which are
// independent add-ons that layer over whatever else is chosen.

/** Variants of "the bodysuit" — mutually exclusive, you wear exactly one. */
export const BODYSUIT_SLUGS: WardrobeSlug[] = [
  "sleeveless_bodysuit",
  "short_sleeve_bodysuit",
  "long_sleeve_bodysuit",
];
/** A sleepsuit/romper can be worn instead of, or layered over, a bodysuit. */
export const SLEEPSUIT_SLUGS: WardrobeSlug[] = ["pajamas", "romper"];
export const BOTTOM_SLUGS: WardrobeSlug[] = [
  "shorts",
  "pants",
  "leggings",
  "tights",
  "wool_leggings",
];
export const MID_SLUGS: WardrobeSlug[] = [
  "sweater",
  "cardigan",
  "hoodie",
  "fleece_layer",
  "wool_layer",
];
/** Snow pants excluded here — it's the independent add-on below. */
export const OUTER_SLUGS: WardrobeSlug[] = [
  "light_overall",
  "fleece_overall",
  "wool_overall",
  "softshell_overall",
  "rain_overall",
  "winter_overall",
  "jacket",
];
export const HAT_SLUGS: WardrobeSlug[] = ["thin_hat", "warm_hat", "sun_hat", "balaclava"];
export const SOCK_SLUGS: WardrobeSlug[] = ["cotton_socks", "wool_socks"];

export type ActualOutfit = {
  bodysuit: WardrobeSlug | "none";
  sleepsuit: WardrobeSlug | "none";
  bottom: WardrobeSlug | "none";
  mid: WardrobeSlug | "none";
  outer: WardrobeSlug | "none";
  snowPants: boolean;
  hat: WardrobeSlug | "none";
  socks: WardrobeSlug | "none";
  mittens: boolean;
};

export const EMPTY_OUTFIT: ActualOutfit = {
  bodysuit: "none",
  sleepsuit: "none",
  bottom: "none",
  mid: "none",
  outer: "none",
  snowPants: false,
  hat: "none",
  socks: "none",
  mittens: false,
};

export function outfitClo(o: ActualOutfit): number {
  const single: (WardrobeSlug | "none")[] = [
    o.bodysuit,
    o.sleepsuit,
    o.bottom,
    o.mid,
    o.outer,
    o.hat,
    o.socks,
  ];
  let total = single.reduce((sum, s) => sum + (s === "none" ? 0 : (CLO_BY_SLUG[s] ?? 0)), 0);
  if (o.snowPants) total += CLO_BY_SLUG.snow_pants ?? 0;
  if (o.mittens) total += CLO_BY_SLUG.mittens ?? 0;
  return total;
}

/** Reconstructs the slotted shape from what recommend() actually picked. */
export function idealOutfitFrom(rec: Recommendation): ActualOutfit {
  const out: ActualOutfit = { ...EMPTY_OUTFIT };
  for (const l of rec.babyClothing) {
    if (l.slug === "diaper_only") continue;
    const slug = l.slug as WardrobeSlug;
    if (l.slot === "base") {
      if (BODYSUIT_SLUGS.includes(slug)) out.bodysuit = slug;
      else if (SLEEPSUIT_SLUGS.includes(slug)) out.sleepsuit = slug;
    } else if (l.slot === "bottom") {
      out.bottom = slug;
    } else if (l.slot === "mid") {
      out.mid = slug;
    } else if (l.slot === "outer") {
      if (slug === "snow_pants") out.snowPants = true;
      else out.outer = slug;
    }
  }
  for (const a of rec.accessories) {
    if (HAT_SLUGS.includes(a.slug)) out.hat = a.slug;
    else if (SOCK_SLUGS.includes(a.slug)) out.socks = a.slug;
    else if (a.slug === "mittens") out.mittens = true;
  }
  return out;
}

/** Every slot a parent can set in the actual-outfit picker. */
export type SlotKey =
  | "bodysuit"
  | "sleepsuit"
  | "bottom"
  | "mid"
  | "outer"
  | "hat"
  | "socks"
  | "snowPants"
  | "mittens";

/**
 * Structured, not display text — the UI highlights the actual slot/chip
 * rather than only listing this as a sentence, so it only carries what's
 * needed to do that: which slot, which direction, and which slug (if any)
 * ideally belongs there.
 */
export type SlotAdjustment = {
  slot: SlotKey;
  type: "add" | "remove";
  /** The slug recommend() picked for this slot, when adding. */
  idealSlug?: WardrobeSlug;
  /** The slug currently selected for this slot, when removing. */
  actualSlug?: WardrobeSlug;
};

function slotAdjustment(
  slot: SlotKey,
  idealVal: WardrobeSlug | "none",
  actualVal: WardrobeSlug | "none",
): SlotAdjustment | null {
  const idealHas = idealVal !== "none";
  const actualHas = actualVal !== "none";
  if (idealHas && !actualHas) return { slot, type: "add", idealSlug: idealVal };
  if (!idealHas && actualHas) return { slot, type: "remove", actualSlug: actualVal };
  return null;
}

/**
 * Compares an actual outfit against what recommend() picked, slot by slot,
 * so the parent gets concrete guidance (which slot to add to, which item to
 * remove) rather than just an overall too-warm/too-cold verdict. Two
 * different items filling the same slot (e.g. ideal wants a sweater, actual
 * has a cardigan) isn't flagged — any garment covering that slot is treated
 * as satisfying it.
 */
export function compareOutfits(
  ideal: ActualOutfit,
  actual: ActualOutfit,
): { verdict: OutfitVerdict; diff: number; adjustments: SlotAdjustment[] } {
  const { verdict, diff } = verdictFor(outfitClo(actual), outfitClo(ideal));

  const adjustments: SlotAdjustment[] = [];
  const push = (a: SlotAdjustment | null) => {
    if (a) adjustments.push(a);
  };
  push(slotAdjustment("bodysuit", ideal.bodysuit, actual.bodysuit));
  push(slotAdjustment("sleepsuit", ideal.sleepsuit, actual.sleepsuit));
  push(slotAdjustment("bottom", ideal.bottom, actual.bottom));
  push(slotAdjustment("mid", ideal.mid, actual.mid));
  push(slotAdjustment("outer", ideal.outer, actual.outer));
  push(slotAdjustment("hat", ideal.hat, actual.hat));
  push(slotAdjustment("socks", ideal.socks, actual.socks));

  if (ideal.snowPants && !actual.snowPants) adjustments.push({ slot: "snowPants", type: "add" });
  else if (!ideal.snowPants && actual.snowPants)
    adjustments.push({ slot: "snowPants", type: "remove" });

  if (ideal.mittens && !actual.mittens) adjustments.push({ slot: "mittens", type: "add" });
  else if (!ideal.mittens && actual.mittens) adjustments.push({ slot: "mittens", type: "remove" });

  return { verdict, diff, adjustments };
}
