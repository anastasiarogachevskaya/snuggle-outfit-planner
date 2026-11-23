/**
 * Thermal underlayers and separate lower-body roles for toddlers (T13).
 *
 * Lower-body clothing has three separate roles: a thermal underlayer, the
 * everyday bottoms and outer bottoms (snow pants with a jacket). Filling
 * one never removes another, and one garment never fills two roles.
 *
 * Policy gap: no existing outfit rule says when a thermal underlayer is
 * needed, so the engine never asks for one (`LayerNeed.thermal` is unset by
 * every rule). Owning thermals alone therefore never adds them to an outfit.
 * What is live on the gated toddler path is the parent's wool-leggings
 * answer: leggings stated as a thermal underlayer are no longer used as the
 * everyday bottoms on their own. "Not sure" keeps the existing fallback.
 *
 * Nothing here reads insulation or waterproofing, or the catalogue's warmth
 * tags; rain/snow protection selection is a later ticket.
 */
import type { GarmentDetails } from "../garment-details";
import { LABEL_BY_SLUG, type WardrobeSlug } from "../wardrobe-catalog";

export type GarmentDetailsMap = ReadonlyMap<WardrobeSlug, Partial<GarmentDetails>>;
export type LeggingsUse = GarmentDetails["leggings_use"];

/** The parent's wool-leggings answer; "unknown" when unstated. */
export function woolLeggingsUse(details?: GarmentDetailsMap | null): LeggingsUse {
  return details?.get("wool_leggings")?.leggings_use ?? "unknown";
}

/** Garments for a thermal underlayer, most suitable first. */
export function thermalEntry(
  area: "upper" | "lower",
  details?: GarmentDetailsMap | null,
): { slugs: WardrobeSlug[]; label: string } {
  if (area === "upper") return { slugs: ["thermal_top"], label: LABEL_BY_SLUG.thermal_top };
  return {
    slugs:
      woolLeggingsUse(details) === "thermal_base"
        ? ["thermal_bottom", "wool_leggings"]
        : ["thermal_bottom"],
    label: LABEL_BY_SLUG.thermal_bottom,
  };
}

/**
 * Whether a garment may be the everyday bottoms in this outfit:
 *   - never one already worn as the thermal underlayer;
 *   - wool leggings stated as a thermal underlayer are not worn on their own;
 *   - wool leggings of unknown use aren't stacked over a thermal underlayer
 *     (two equivalent layers); stated "on their own" they still may be.
 */
export function allowedAsEverydayBottom(
  slug: WardrobeSlug,
  ctx: { details?: GarmentDetailsMap | null; thermalLower: WardrobeSlug | null },
): boolean {
  if (slug === ctx.thermalLower) return false;
  if (slug !== "wool_leggings") return true;
  const use = woolLeggingsUse(ctx.details);
  if (use === "thermal_base") return false;
  if (use === "unknown" && ctx.thermalLower !== null) return false;
  return true;
}
