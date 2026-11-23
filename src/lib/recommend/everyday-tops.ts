/**
 * Everyday tops for toddlers (T12).
 *
 * For children the toddler rules apply to (12–35 months, behind the toddler
 * rollout switch), short- and long-sleeve tops become alternatives to the
 * matching everyday bodysuits, ordered by the parent's saved clothing style
 * and "easy toilet access" preference. It only reorders garments that already
 * suit today's sleeve choice: temperature thresholds, sleeve choice, bottoms
 * rules and age limits are unchanged, and nothing here reads nappy use or
 * writes a preference. Sleepwear and diaper-only outfits are left alone.
 */
import { toddlerRulesApply } from "../feature-flags";
import type { ChildPreferences } from "../child-preferences";
import type { WardrobeSlug } from "../wardrobe-catalog";
import type { BaseKind } from "./layers";

export type ClothingStyle = ChildPreferences["clothing_style"];

export type EverydayTopRules = {
  clothingStyle: ClothingStyle;
  easyToiletAccess: boolean;
};

/** Everyday tops. A thermal top is an underlayer, never one of these. */
export const EVERYDAY_TOP_SLUGS: WardrobeSlug[] = ["short_sleeve_top", "long_sleeve_top"];

export function isEverydayTop(slug: string): boolean {
  return (EVERYDAY_TOP_SLUGS as string[]).includes(slug);
}

/**
 * Garments that suit each everyday sleeve choice, most suitable first. Each
 * tier holds equally suitable garments; within a tier the bodysuit keeps its
 * existing place first. Bodysuit order matches the infant fallback lists.
 */
export const EVERYDAY_BASE_TIERS: Partial<Record<BaseKind, WardrobeSlug[][]>> = {
  sleeveless: [["sleeveless_bodysuit"], ["short_sleeve_bodysuit", "short_sleeve_top"]],
  short_sleeve: [["short_sleeve_bodysuit", "short_sleeve_top"], ["sleeveless_bodysuit"]],
  long_sleeve: [["long_sleeve_bodysuit", "long_sleeve_top"]],
};

/**
 * The rules for this outfit, or null when the existing bodysuit-only
 * behaviour applies (switch off, infant, unknown age, or sleep).
 */
export function everydayTopRules(
  input: {
    ageMonths?: number | null;
    preferences?: Partial<Pick<ChildPreferences, "clothing_style" | "easy_toilet_access">>;
    sleeping?: boolean;
  },
  enabled?: boolean,
): EverydayTopRules | null {
  if (input.sleeping) return null;
  const applies =
    enabled === undefined
      ? toddlerRulesApply(input.ageMonths)
      : toddlerRulesApply(input.ageMonths, enabled);
  if (!applies) return null;
  const style = input.preferences?.clothing_style;
  return {
    clothingStyle: style === "tops" || style === "bodysuits" ? style : "both",
    easyToiletAccess: input.preferences?.easy_toilet_access === true,
  };
}

/** One way to dress the base (and, for a one-piece, the bottom) slot. */
export type BaseOption = {
  slug: WardrobeSlug;
  /** A one-piece (romper) also fills the bottom slot. */
  onePiece: boolean;
  /** Suitability tier (0 = exact sleeve match). One-pieces count as tier 0. */
  tier: number;
  /** Position in the existing infant order; one-pieces come first (-1). */
  legacyPos: number;
  /** Every garment the option needs, bottoms included, is owned. */
  complete: boolean;
};

/**
 * Sort key for an owned option; lower wins. A complete outfit always beats
 * one with a missing bottom, so a preference never causes a missing garment
 * when an owned alternative would avoid it.
 *
 *   - Tops: tops first, then the existing order.
 *   - Bodysuits: bodysuits and one-pieces first, then tops.
 *   - Both: the existing order (bodysuit before an equally suitable top).
 *   - Both + easy toilet access: within each suitability tier, separates
 *     (a top) before a bodysuit or one-piece. Never overrides an explicit
 *     Tops or Bodysuits choice.
 */
export function baseOptionRank(o: BaseOption, rules: EverydayTopRules): number[] {
  const top = isEverydayTop(o.slug) ? 0 : 1;
  const incomplete = o.complete ? 0 : 1;
  switch (rules.clothingStyle) {
    case "tops":
      return [incomplete, top, o.legacyPos];
    case "bodysuits":
      return [incomplete, 1 - top, o.legacyPos];
    default:
      return rules.easyToiletAccess
        ? [incomplete, o.tier, top, o.legacyPos]
        : [incomplete, o.legacyPos];
  }
}

export function compareRank(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * What to report when nothing suitable is owned: the preferred style's most
 * suitable garment (a top for Tops, otherwise the existing bodysuit).
 */
export function missingBaseSlug(kind: BaseKind, rules: EverydayTopRules): WardrobeSlug | null {
  const all = (EVERYDAY_BASE_TIERS[kind] ?? []).flat();
  if (rules.clothingStyle === "tops") {
    const t = all.find(isEverydayTop);
    if (t) return t;
  }
  return all.find((s) => !isEverydayTop(s)) ?? null;
}
