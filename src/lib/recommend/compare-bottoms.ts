// "What if I picked different bottoms?" — parents asked why thin leggings,
// pants and wool leggings aren't interchangeable. This takes the outfit
// recommend() already picked for the current situation, swaps only the
// bottom layer, and reports how the rest of the outfit has to change.
import { LABEL_BY_SLUG, type WardrobeSlug } from "../wardrobe-catalog";
import type { Accessory, Layer, Recommendation } from "../recommend";
import {
  CLO_BY_SLUG,
  HAT_SLUGS,
  SOCK_SLUGS,
  compareOutfits,
  idealOutfitFrom,
  outfitClo,
  type ActualOutfit,
  type OutfitVerdict,
  type SlotAdjustment,
} from "./warmth";

/** The three everyday bottoms parents compare, lightest first. */
export const COMPARABLE_BOTTOMS: WardrobeSlug[] = ["leggings", "pants", "wool_leggings"];

export type BottomOption = {
  slug: WardrobeSlug;
  /** True when recommend() picked exactly this garment for today. */
  isRecommended: boolean;
  /** True when the parent has this in their wardrobe. */
  owned: boolean;
  /** Warmth of the whole outfit with this bottom, in rough clo. */
  totalClo: number;
  /** Warmth difference against the recommended outfit (negative = lighter). */
  diff: number;
  verdict: OutfitVerdict;
  /** What else has to change elsewhere to make this choice work. */
  adjustments: SlotAdjustment[];
};

function withBottom(outfit: ActualOutfit, bottom: WardrobeSlug): ActualOutfit {
  return { ...outfit, bottom };
}

function pickOwned(prefs: WardrobeSlug[], owned: Set<WardrobeSlug>): WardrobeSlug {
  return prefs.find((s) => owned.has(s)) ?? prefs[0];
}

/** One concrete change elsewhere in the outfit that offsets a lighter/warmer bottom. */
function compensate(
  candidate: ActualOutfit,
  verdict: OutfitVerdict,
  owned: Set<WardrobeSlug>,
): SlotAdjustment[] {
  if (verdict === "too_warm") {
    if (candidate.mid !== "none") return [{ slot: "mid", type: "remove", actualSlug: candidate.mid }];
    return [];
  }
  if (verdict === "too_cold") {
    if (candidate.mid === "none") {
      return [{ slot: "mid", type: "add", idealSlug: pickOwned(["sweater", "cardigan", "light_merino_layer", "hoodie", "fleece_layer"], owned) }];
    }
    if (candidate.socks !== "wool_socks") return [{ slot: "socks", type: "add", idealSlug: "wool_socks" }];
    const warmerMids: WardrobeSlug[] = ["fleece_layer", "wool_layer", "fleece_overall", "wool_overall"];
    if ((CLO_BY_SLUG[candidate.mid as WardrobeSlug] ?? 0) < 0.5 && warmerMids.some((s) => owned.has(s))) {
      return [{ slot: "mid", type: "add", idealSlug: pickOwned(warmerMids, owned) }];
    }
    // Hats and snow pants only make sense outdoors (an outer layer is on).
    const outdoors = candidate.outer !== "none";
    if (outdoors && (candidate.hat === "none" || candidate.hat === "thin_hat" || candidate.hat === "sun_hat")) {
      return [{ slot: "hat", type: "add", idealSlug: "warm_hat" }];
    }
    if (outdoors && owned.has("snow_pants") && !candidate.snowPants && candidate.outer !== "winter_overall") {
      return [{ slot: "snowPants", type: "add" }];
    }
  }
  return [];
}

/**
 * Builds one entry per comparable bottom for the current recommendation.
 * Returns an empty list when the recommendation has no bottom layer at all
 * (hot days, sleep), where swapping bottoms is not a meaningful choice.
 */
export function compareBottoms(
  rec: Recommendation,
  owned: Set<WardrobeSlug>,
): { ideal: ActualOutfit; options: BottomOption[] } {
  const ideal = idealOutfitFrom(rec);
  if (ideal.bottom === "none") return { ideal, options: [] };

  const options = COMPARABLE_BOTTOMS.map((slug) => {
    const candidate = withBottom(ideal, slug);
    const { verdict, diff, adjustments } = compareOutfits(ideal, candidate);
    // compareOutfits only flags empty-vs-filled slots, and a bottom swap never
    // empties a slot — so compensate for the warmth gap explicitly.
    const compensation = compensate(candidate, verdict, owned);
    return {
      slug,
      isRecommended: ideal.bottom === slug,
      owned: owned.has(slug),
      totalClo: outfitClo(candidate),
      diff,
      verdict,
      // The bottom itself is the thing being swapped, never an instruction.
      adjustments: [...adjustments.filter((a) => a.slot !== "bottom"), ...compensation].filter(
        (a, i, all) => all.findIndex((b) => b.slot === a.slot && b.type === a.type) === i,
      ),
    };
  });

  return { ideal, options };
}

/** Rough clo of a single bottom garment, for the warmth tag in the UI. */
export function bottomClo(slug: WardrobeSlug): number {
  return CLO_BY_SLUG[slug] ?? 0;
}

const SLOT_ORDER: Record<Layer["slot"], number> = { base: 0, bottom: 1, mid: 2, outer: 3 };

/**
 * Rewrites today's recommendation around a bottom the parent picked in the
 * comparison, applying the same adjustments the preview promised so the
 * outfit card and the preview never disagree.
 */
export function applyBottomChoice(
  rec: Recommendation,
  slug: WardrobeSlug,
  owned: Set<WardrobeSlug>,
): Recommendation {
  const { options } = compareBottoms(rec, owned);
  const option = options.find((o) => o.slug === slug);
  if (!option || option.isRecommended) return rec;

  const babyClothing: Layer[] = rec.babyClothing.map((l) =>
    l.slot === "bottom" ? { slot: "bottom", slug, label: LABEL_BY_SLUG[slug] } : l,
  );
  let accessories: Accessory[] = [...rec.accessories];

  for (const a of option.adjustments) {
    if (a.slot === "hat" || a.slot === "socks" || a.slot === "mittens") {
      const accSlug = a.type === "add" ? a.idealSlug : a.actualSlug;
      if (a.type === "add") {
        if (accSlug && !accessories.some((x) => x.slug === accSlug)) {
          const group = a.slot === "hat" ? HAT_SLUGS : a.slot === "socks" ? SOCK_SLUGS : [];
          accessories = accessories.filter((x) => !group.includes(x.slug));
          accessories.push({ slug: accSlug, label: LABEL_BY_SLUG[accSlug] });
        }
      } else if (accSlug) {
        accessories = accessories.filter((x) => x.slug !== accSlug);
      }
      continue;
    }

    if (a.type === "add" && a.idealSlug) {
      const addSlug = a.idealSlug;
      const slot: Layer["slot"] =
        a.slot === "bodysuit" || a.slot === "sleepsuit"
          ? "base"
          : a.slot === "mid"
            ? "mid"
            : "outer";
      if (!babyClothing.some((l) => l.slug === addSlug)) {
        // A warmer mid layer replaces the lighter one instead of stacking.
        if (slot === "mid") {
          const i = babyClothing.findIndex((l) => l.slot === "mid");
          if (i !== -1) babyClothing.splice(i, 1);
        }
        babyClothing.push({ slot, slug: addSlug, label: LABEL_BY_SLUG[addSlug] });
      }
    } else if (a.type === "remove" && a.actualSlug) {
      const removeSlug = a.actualSlug;
      const index = babyClothing.findIndex((l) => l.slug === removeSlug);
      if (index !== -1) babyClothing.splice(index, 1);
    } else if (a.slot === "snowPants") {
      if (a.type === "add" && !babyClothing.some((l) => l.slug === "snow_pants")) {
        babyClothing.push({ slot: "outer", slug: "snow_pants", label: LABEL_BY_SLUG.snow_pants });
      }
      if (a.type === "remove") {
        const index = babyClothing.findIndex((l) => l.slug === "snow_pants");
        if (index !== -1) babyClothing.splice(index, 1);
      }
    }
  }

  babyClothing.sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);

  const allSlugs = [
    ...babyClothing.map((l) => l.slug),
    ...accessories.map((a) => a.slug),
  ].filter((s): s is WardrobeSlug => s !== "diaper_only");

  return {
    ...rec,
    babyClothing,
    accessories,
    missing: allSlugs.filter((s) => !owned.has(s)),
    notes: [...rec.notes, `Adjusted for ${LABEL_BY_SLUG[slug].toLowerCase()} instead of today's pick.`],
  };
}
