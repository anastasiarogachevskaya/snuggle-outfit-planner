import type { WardrobeSlug } from "@/lib/wardrobe-catalog";
import type { SlotAdjustment } from "./warmth";

/**
 * Keeps only the adjustments a parent can actually act on in Layer up.
 * An "add" pointing at an item they don't own would highlight nothing, so the
 * check could never clear — those are dropped before the verdict copy is
 * chosen. "Remove" adjustments always refer to something already selected.
 */
export function actionableAdjustments(
  adjustments: SlotAdjustment[],
  owned: Set<WardrobeSlug>,
): SlotAdjustment[] {
  return adjustments.filter((a) => {
    if (a.type !== "add") return true;
    if (a.slot === "mittens") return owned.has("mittens");
    if (a.slot === "snowPants") return owned.has("snow_pants");
    return a.idealSlug ? owned.has(a.idealSlug) : true;
  });
}
