// "What if I picked different bottoms?" — parents asked why thin leggings,
// pants and wool leggings aren't interchangeable. This takes the outfit
// recommend() already picked for the current situation, swaps only the
// bottom layer, and reports how the rest of the outfit has to change.
import type { WardrobeSlug } from "../wardrobe-catalog";
import type { Recommendation } from "../recommend";
import {
  CLO_BY_SLUG,
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
    return {
      slug,
      isRecommended: ideal.bottom === slug,
      owned: owned.has(slug),
      totalClo: outfitClo(candidate),
      diff,
      verdict,
      // The bottom itself is the thing being swapped, never an instruction.
      adjustments: adjustments.filter((a) => a.slot !== "bottom"),
    };
  });

  return { ideal, options };
}

/** Rough clo of a single bottom garment, for the warmth tag in the UI. */
export function bottomClo(slug: WardrobeSlug): number {
  return CLO_BY_SLUG[slug] ?? 0;
}
