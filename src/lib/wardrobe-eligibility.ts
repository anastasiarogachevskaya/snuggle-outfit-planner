/**
 * Which of the parent's clothes outfit recommendations may use.
 *
 * Every recommendation consumer — signed-in Today, the phone-kept trial,
 * the outfit checker, the bottoms comparison and the assistant (MCP) tool —
 * builds its wardrobe through this module so they all follow one rule:
 *
 *   - explicitly unowned rows (owned = false) are never used, in any state;
 *   - while availability filtering is on (the toddler rollout switch), owned
 *     items marked "temporarily_unavailable" or "outgrown" are set aside;
 *   - missing availability means "available" (legacy rows and profiles).
 *
 * It only decides eligibility. Saved garment details are kept, untouched,
 * for every owned item (eligible or set aside) so later tickets can read
 * them; nothing here interprets insulation or waterproofing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { toddlerSupportEnabled } from "@/lib/feature-flags";
import {
  garmentDetailFields,
  normalizeGarmentDetails,
  type GarmentDetails,
} from "@/lib/garment-details";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";

/** Columns every wardrobe read uses, so cached rows always carry availability. */
export const WARDROBE_ITEM_COLUMNS =
  "slug,owned,insulation,waterproof,availability,sleepwear_shape,foot_coverage,leggings_use" as const;

export type WardrobeItemRow = {
  slug: string;
  owned: boolean | null;
} & Partial<Record<keyof GarmentDetails, string | null>>;

export type SetAsideReason = Exclude<GarmentDetails["availability"], "available">;

export type EligibleWardrobe = {
  /** Slugs the outfit engine may use. */
  eligible: Set<WardrobeSlug>;
  /** Saved details for every owned item, eligible or set aside. */
  details: ReadonlyMap<WardrobeSlug, GarmentDetails>;
  /** Owned items left out because the parent marked them unavailable. */
  setAside: ReadonlyMap<WardrobeSlug, SetAsideReason>;
  /** Whether availability was taken into account for this wardrobe. */
  availabilityApplied: boolean;
};

/** Availability filtering follows the toddler rollout switch (T01). */
export function availabilityFilteringEnabled(): boolean {
  return toddlerSupportEnabled();
}

/**
 * Whether an owned item has any detail question to show right now. With
 * availability filtering off, items whose only question is Availability
 * get no Details action; their stored availability is untouched.
 */
export function hasDetailQuestions(
  slug: string,
  availability = availabilityFilteringEnabled(),
): boolean {
  return garmentDetailFields(slug, { availability }).length > 0;
}

export function resolveEligibleWardrobe(
  rows: Iterable<WardrobeItemRow>,
  opts: { availabilityFilter?: boolean } = {},
): EligibleWardrobe {
  const applyAvailability = opts.availabilityFilter ?? availabilityFilteringEnabled();
  const eligible = new Set<WardrobeSlug>();
  const details = new Map<WardrobeSlug, GarmentDetails>();
  const setAside = new Map<WardrobeSlug, SetAsideReason>();
  for (const row of rows) {
    if (row.owned !== true) continue;
    const slug = row.slug as WardrobeSlug;
    const d = normalizeGarmentDetails(row);
    details.set(slug, d);
    if (applyAvailability && d.availability !== "available") {
      setAside.set(slug, d.availability);
      continue;
    }
    eligible.add(slug);
  }
  return { eligible, details, setAside, availabilityApplied: applyAvailability };
}

/** Phone-kept profile → the same row shape the database returns. */
export function guestWardrobeRows(profile: {
  wardrobe: readonly WardrobeSlug[];
  wardrobeDetails?: Partial<Record<WardrobeSlug, Partial<GarmentDetails>>>;
}): WardrobeItemRow[] {
  return profile.wardrobe.map((slug) => ({
    ...(profile.wardrobeDetails?.[slug] ?? {}),
    slug,
    owned: true,
  }));
}

type WardrobeReader = Pick<SupabaseClient<Database>, "from">;

/** One child's wardrobe rows (owned and unowned) with every detail column. */
export async function fetchWardrobeItems(
  client: WardrobeReader,
  babyId: string,
): Promise<WardrobeItemRow[]> {
  const { data, error } = await client
    .from("wardrobe_items")
    .select(WARDROBE_ITEM_COLUMNS)
    .eq("baby_id", babyId);
  if (error) throw new Error(error.message);
  return (data ?? []) as WardrobeItemRow[];
}

/** Short note for an item an outfit needs that can't be used right now. */
export function missingItemNote(
  slug: WardrobeSlug,
  setAside?: ReadonlyMap<WardrobeSlug, SetAsideReason>,
): string {
  const reason = setAside?.get(slug);
  if (reason === "outgrown") return "Marked outgrown in your wardrobe";
  if (reason === "temporarily_unavailable") return "Marked unavailable in your wardrobe";
  return "Not in your wardrobe";
}

/**
 * Tip for a helpful extra the outfit can't use. An owned item the parent set
 * aside is named as such; only a truly unowned item gets the "No … in your
 * wardrobe" wording (`unownedTip`). `name` is the lower-case garment name.
 */
export function extraItemTip(
  slug: WardrobeSlug,
  name: string,
  unownedTip: string,
  setAside?: ReadonlyMap<WardrobeSlug, SetAsideReason>,
): string {
  const reason = setAside?.get(slug);
  if (reason === "outgrown") return `Your ${name} is marked outgrown.`;
  if (reason === "temporarily_unavailable") return `Your ${name} is marked temporarily unavailable.`;
  return unownedTip;
}
