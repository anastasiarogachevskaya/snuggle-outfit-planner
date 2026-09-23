import type { WardrobeSlug } from "@/lib/wardrobe-catalog";
import {
  BODYSUIT_SLUGS,
  SLEEPSUIT_SLUGS,
  BOTTOM_SLUGS,
  MID_SLUGS,
  OUTER_SLUGS,
  HAT_SLUGS,
  SOCK_SLUGS,
  type SlotAdjustment,
  type SlotKey,
} from "./warmth";

const SLOT_OPTIONS: Partial<Record<SlotKey, WardrobeSlug[]>> = {
  bodysuit: BODYSUIT_SLUGS,
  sleepsuit: SLEEPSUIT_SLUGS,
  bottom: BOTTOM_SLUGS,
  mid: MID_SLUGS,
  outer: OUTER_SLUGS,
  hat: HAT_SLUGS,
  socks: SOCK_SLUGS,
};

/**
 * Keeps only the adjustments a parent can actually act on in Layer up.
 * An "add" pointing at an item they don't own would highlight nothing, so the
 * check could never clear — those are dropped, unless the parent owns another
 * garment in the same slot (any garment there counts), in which case the slot
 * hint is kept without the unowned suggestion. "Remove" adjustments always
 * refer to something already selected.
 */
export function actionableAdjustments(
  adjustments: SlotAdjustment[],
  owned: Set<WardrobeSlug>,
): SlotAdjustment[] {
  const out: SlotAdjustment[] = [];
  for (const a of adjustments) {
    if (a.type !== "add") {
      out.push(a);
      continue;
    }
    if (a.slot === "mittens") {
      if (owned.has("mittens")) out.push(a);
      continue;
    }
    if (a.slot === "snowPants") {
      if (owned.has("snow_pants")) out.push(a);
      continue;
    }
    if (!a.idealSlug || owned.has(a.idealSlug)) {
      out.push(a);
      continue;
    }
    // Suggested garment isn't owned — keep the slot hint only if some other
    // garment in the same slot is, so the parent has something to tap.
    const options = SLOT_OPTIONS[a.slot] ?? [];
    if (options.some((s) => owned.has(s))) {
      out.push({ ...a, idealSlug: undefined });
    }
  }
  return out;
}
