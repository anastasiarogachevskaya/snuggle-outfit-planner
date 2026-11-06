/**
 * How wardrobe setup is laid out for a child. Pure and shared by phone-kept
 * and signed-in setup so both follow the same selection rules. It only
 * decides what is shown first, what sits behind "View all" and what is
 * suggested; it never ticks, unticks or deletes anything.
 */
import type { WardrobeItem, WardrobeSlug, WardrobeStep } from "@/lib/wardrobe-catalog";
import type { ChildPreferences } from "@/lib/child-preferences";

export type SetupAudience = "infant" | "toddler";

export type PlannedStep = Omit<WardrobeStep, "items"> & {
  /** Shown straight away. Always includes every owned item of the step. */
  primary: WardrobeItem[];
  /** Behind "View all". Never contains an owned item. */
  more: WardrobeItem[];
};

const BODYSUITS: WardrobeSlug[] = ["sleeveless_bodysuit", "short_sleeve_bodysuit", "long_sleeve_bodysuit"];
const TOPS: WardrobeSlug[] = ["short_sleeve_top", "long_sleeve_top"];
/** Newborn items kept out of the default toddler setup (ownership is kept). */
const TODDLER_TUCKED_AWAY: WardrobeSlug[] = ["swaddle"];
/** Footwear first in the toddler accessories step. */
const TODDLER_FOOTWEAR_FIRST: WardrobeSlug[] = ["everyday_shoes", "rain_boots", "winter_boots"];

/** Toddler basics shown with a "Suggested" tag — never ticked automatically. */
export function toddlerSuggestions(style: ChildPreferences["clothing_style"]): WardrobeSlug[] {
  const base: WardrobeSlug[] =
    style === "bodysuits"
      ? ["short_sleeve_bodysuit", "long_sleeve_bodysuit"]
      : style === "tops"
        ? ["short_sleeve_top", "long_sleeve_top"]
        : ["long_sleeve_bodysuit", "long_sleeve_top"];
  return [
    ...base,
    "pajamas",
    "pants",
    "leggings",
    "sweater",
    "fleece_layer",
    "waterproof_jacket",
    "rain_pants",
    "everyday_shoes",
    "rain_boots",
    "thin_hat",
    "warm_hat",
    "cotton_socks",
  ];
}

function tuckedAway(
  slug: WardrobeSlug,
  item: WardrobeItem,
  audience: SetupAudience,
  style: ChildPreferences["clothing_style"],
): boolean {
  if (audience === "infant") return !!item.toddlerOnly;
  if (TODDLER_TUCKED_AWAY.includes(slug)) return true;
  if (style === "tops" && BODYSUITS.includes(slug)) return true;
  if (style === "bodysuits" && TOPS.includes(slug)) return true;
  return false;
}

function priority(slug: WardrobeSlug, audience: SetupAudience, style: ChildPreferences["clothing_style"]): number {
  if (audience === "infant") return 0;
  const foot = TODDLER_FOOTWEAR_FIRST.indexOf(slug);
  if (foot >= 0) return -10 + foot;
  if (style === "tops" && TOPS.includes(slug)) return -5;
  return 0;
}

export function planWardrobeSetup(
  steps: WardrobeStep[],
  opts: {
    audience: SetupAudience;
    clothingStyle: ChildPreferences["clothing_style"];
    owned: Iterable<WardrobeSlug>;
  },
): PlannedStep[] {
  const owned = new Set(opts.owned);
  return steps.map(({ items, ...step }) => {
    const ordered = items
      .map((item, i) => ({ item, i, p: priority(item.slug, opts.audience, opts.clothingStyle) }))
      .sort((a, b) => a.p - b.p || a.i - b.i)
      .map((x) => x.item);
    const primary: WardrobeItem[] = [];
    const more: WardrobeItem[] = [];
    for (const item of ordered) {
      const hide = !owned.has(item.slug) && tuckedAway(item.slug, item, opts.audience, opts.clothingStyle);
      (hide ? more : primary).push(item);
    }
    return { ...step, primary, more };
  });
}
