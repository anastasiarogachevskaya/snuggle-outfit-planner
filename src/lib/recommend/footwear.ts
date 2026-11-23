/**
 * Walking footwear for toddlers (T14).
 *
 * Applies only on the gated toddler path (12–35 months, toddler switch on,
 * not asleep) for an outdoor walk whose movement the parent *stated* as
 * gentle walking, active play or mixed. Walking is never inferred from age
 * or from "no transport"; a stroller/carrier walk without a stated movement
 * keeps its seated/carried meaning, while "mixed" with a stroller still
 * needs walking footwear.
 *
 * Rules:
 *   - Footwear is its own role, separate from socks (socks keep their rule).
 *   - Candidates: walking shoes, rain boots, winter boots. Booties never
 *     satisfy a walking need and are never substituted.
 *   - Only owned and available items are used; at most one is chosen.
 *   - Protection is the parent's stated detail only. Footwear type, name or
 *     catalogue hint ("Waterproof boots for puddles") is never taken as a
 *     waterproof or insulation claim; "unknown" stays unknown.
 *   - Wet or snowy ground asks for waterproofing (stated "yes" first).
 *     No temperature cutoff, warmth score or activity offset is used.
 *
 * Policy gaps (not decided here):
 *   - No rule says when footwear must be insulated, so temperature never
 *     changes the choice; snowy ground prefers winter boots by type only.
 *   - Without a stated ground, waterproofing isn't considered.
 */
import { toddlerOutfitRulesApply } from "../feature-flags";
import type { GarmentDetails } from "../garment-details";
import type { GroundCondition, OutingContext, OutingMovement } from "../outing-context";
import { LABEL_BY_SLUG, type WardrobeSlug } from "../wardrobe-catalog";
import type { SetAsideReason } from "../wardrobe-eligibility";

export const WALKING_FOOTWEAR_SLUGS = ["everyday_shoes", "rain_boots", "winter_boots"] as const;
export type WalkingFootwearSlug = (typeof WALKING_FOOTWEAR_SLUGS)[number];

export const WALKING_MOVEMENTS = ["walking", "active", "mixed"] as const;
export type WalkingMovement = Extract<OutingMovement, (typeof WALKING_MOVEMENTS)[number]>;

export type FootwearGround = GroundCondition | "unknown";

/** Type order per ground, most suitable first. Never a protection claim. */
export const FOOTWEAR_TYPE_ORDER: Record<FootwearGround, readonly WalkingFootwearSlug[]> = {
  dry: ["everyday_shoes", "winter_boots", "rain_boots"],
  unknown: ["everyday_shoes", "winter_boots", "rain_boots"],
  wet: ["rain_boots", "winter_boots", "everyday_shoes"],
  snow: ["winter_boots", "rain_boots", "everyday_shoes"],
};

export type UnusableReason = "not_owned" | SetAsideReason;

export type FootwearNeed = {
  need: "walking";
  movement: WalkingMovement;
  ground: FootwearGround;
  /** True on wet or snowy ground. */
  waterproofRequired: boolean;
  /** Owned, available footwear chosen for the outing, or null. */
  selected: WalkingFootwearSlug | null;
  /** When nothing is selectable: the footwear type the outing needs. */
  missingSlug: WalkingFootwearSlug | null;
  /** Parent-stated protection of the selected item ("unknown" when unstated). */
  protection: Pick<GarmentDetails, "waterproof" | "insulation"> | null;
  /**
   * confirmed / unconfirmed / stated_no when waterproofing is required;
   * not_assessed when the ground doesn't ask for it (or nothing is selected).
   */
  waterproof: "confirmed" | "unconfirmed" | "stated_no" | "not_assessed";
  /** Every candidate that couldn't be used, with why. */
  unusable: { slug: WalkingFootwearSlug; reason: UnusableReason }[];
  /** Explanations shown with the outfit. */
  notes: string[];
};

/** Whether this outing gets the walking-footwear path. */
export function walkingFootwearApplies(
  input: { situation: string; ageMonths?: number | null; outing?: OutingContext },
  enabled?: boolean,
): WalkingMovement | null {
  if (input.situation !== "walk") return null;
  const o = input.outing;
  if (!o || o.situation !== "walk" || o.movementSource !== "stated") return null;
  const m = o.movement;
  if (!m || !(WALKING_MOVEMENTS as readonly string[]).includes(m)) return null;
  if (!toddlerOutfitRulesApply({ ageMonths: input.ageMonths, sleeping: false }, enabled))
    return null;
  return m as WalkingMovement;
}

const name = (slug: WardrobeSlug) => LABEL_BY_SLUG[slug].toLowerCase();
const WATERPROOF_TIER: Record<GarmentDetails["waterproof"], number> = { yes: 0, unknown: 1, no: 2 };

export function selectWalkingFootwear(input: {
  movement: WalkingMovement;
  ground?: GroundCondition;
  /** Eligible wardrobe (owned and available). */
  owned: ReadonlySet<WardrobeSlug>;
  setAside?: ReadonlyMap<WardrobeSlug, SetAsideReason>;
  details?: ReadonlyMap<WardrobeSlug, Partial<GarmentDetails>> | null;
}): FootwearNeed {
  const ground: FootwearGround = input.ground ?? "unknown";
  const waterproofRequired = ground === "wet" || ground === "snow";
  const order = FOOTWEAR_TYPE_ORDER[ground];
  const stated = (slug: WardrobeSlug) => ({
    waterproof: input.details?.get(slug)?.waterproof ?? "unknown",
    insulation: input.details?.get(slug)?.insulation ?? "unknown",
  });

  const unusable: FootwearNeed["unusable"] = [];
  const usable: WalkingFootwearSlug[] = [];
  for (const slug of order) {
    if (input.owned.has(slug)) usable.push(slug);
    else unusable.push({ slug, reason: input.setAside?.get(slug) ?? "not_owned" });
  }
  const ranked = waterproofRequired
    ? [...usable].sort(
        (a, b) =>
          WATERPROOF_TIER[stated(a).waterproof] - WATERPROOF_TIER[stated(b).waterproof] ||
          order.indexOf(a) - order.indexOf(b),
      )
    : usable;
  const selected = ranked[0] ?? null;
  const groundWord = ground === "snow" ? "snowy" : "wet";
  const notes: string[] = [];

  if (!selected) {
    const missingSlug = order[0]!;
    notes.push(
      "This outing needs walking footwear, but none of your walking shoes or boots can be used right now.",
    );
    for (const u of unusable) {
      if (u.reason === "outgrown") notes.push(`Your ${name(u.slug)} are marked outgrown.`);
      else if (u.reason === "temporarily_unavailable")
        notes.push(`Your ${name(u.slug)} are marked temporarily unavailable.`);
    }
    if (input.owned.has("booties") || input.setAside?.has("booties"))
      notes.push("Booties aren't walking footwear, so they weren't used.");
    return {
      need: "walking",
      movement: input.movement,
      ground,
      waterproofRequired,
      selected: null,
      missingSlug,
      protection: null,
      waterproof: "not_assessed",
      unusable,
      notes,
    };
  }

  const protection = stated(selected);
  let waterproof: FootwearNeed["waterproof"] = "not_assessed";
  if (waterproofRequired) {
    if (protection.waterproof === "yes") waterproof = "confirmed";
    else if (protection.waterproof === "no") {
      waterproof = "stated_no";
      notes.push(
        `Your ${name(selected)} are marked not waterproof — feet may get wet on ${groundWord} ground.`,
      );
    } else {
      waterproof = "unconfirmed";
      notes.push(
        `Your ${name(selected)} aren't confirmed as waterproof — check them before ${groundWord} ground, or add it in Wardrobe details.`,
      );
    }
  } else if (ground === "unknown") {
    notes.push("Ground conditions weren't given, so waterproofing wasn't considered for footwear.");
  }
  if (ground === "snow")
    notes.push(
      `Layerly doesn't yet judge how warm footwear needs to be for snow — check your ${name(selected)} keep feet warm.`,
    );

  return {
    need: "walking",
    movement: input.movement,
    ground,
    waterproofRequired,
    selected,
    missingSlug: null,
    protection,
    waterproof,
    unusable,
    notes,
  };
}
