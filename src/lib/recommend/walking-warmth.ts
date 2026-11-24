import type { OutingContext, OutingTransport } from "../outing-context";
import type { WardrobeSlug } from "../wardrobe-catalog";
import { pickOutdoor, type OutdoorContext, type OutdoorPick } from "./pick-outdoor";
import type { WalkingMovement } from "./footwear";

/**
 * Walking warmth kept apart from transport warmth (T16).
 *
 * Existing transport-related warmth adjustments and what they affect:
 *   - Pram (+1 °C to the effective temperature): sheltered ride → worn clothing.
 *   - Sitting stroller (−1 °C): exposed ride → worn clothing (slightly warmer).
 *   - Carrier (+3 °C, +1 °C from WARM up): adult body heat → worn clothing.
 *   - Footmuff, blanket, rain cover, babywearing cover: transport extras
 *     only. They never change the worn layers chosen by the engine; their
 *     warmth (TRANSPORT_CLO_BY_SLUG) is used only by the outfit check.
 *
 * On the gated toddler path with a *stated* walking/active/mixed movement and
 * a stroller or carrier, worn clothing is picked as if there were no ride:
 * the same weather, preference, duration and age adjustments, without the
 * ride's offset. No activity bonus, no layer removed for active play.
 * Transport extras keep the existing riding calculation, because they apply
 * only while riding, and stay transport extras: they never fill a clothing
 * or protection gap. Seated/carried, unstated movement, infants, unknown age
 * and switch-off never reach this path.
 */

export type RideTransport = Exclude<OutingTransport, "none">;

export type WalkingWarmthPhases = {
  movement: WalkingMovement;
  transport: RideTransport;
  /** Effective °C the worn clothing was chosen for (no ride offset). */
  wornEffectiveC: number;
  /** Effective °C with the ride offset; transport extras use this. */
  ridingEffectiveC: number;
  /** Transport extras chosen for riding (owned or missing), never worn clothing. */
  ridingExtras: WardrobeSlug[];
  /**
   * What Layerly hasn't assessed: the worn clothing is checked for walking
   * only; whether it suits the riding portion (seated in an exposed stroller,
   * or carried against an adult) is not judged by one warmth assessment.
   */
  notJudged: ("riding_warmth_of_walking_outfit" | "carried_overheating")[];
};

export function rideTransport(outing?: OutingContext): RideTransport | null {
  const t = outing?.transport;
  return t && t !== "none" ? t : null;
}

const RIDE_NAME: Record<RideTransport, string> = {
  pram: "pram",
  "sitting-stroller": "stroller",
  carrier: "carrier",
};

/** Picks worn clothing for walking and transport extras for riding. */
export function pickWalkingWithRide(
  ctx: OutdoorContext,
  movement: WalkingMovement,
  transport: RideTransport,
): { pick: OutdoorPick; phases: WalkingWarmthPhases } {
  const riding = pickOutdoor(ctx);
  const walking = pickOutdoor({ ...ctx, transportMode: undefined });
  const ride = RIDE_NAME[transport];
  const notJudged: WalkingWarmthPhases["notJudged"] = ["riding_warmth_of_walking_outfit"];
  if (transport === "carrier") notJudged.push("carried_overheating");

  const notes = [...walking.notes];
  notes.push(
    movement === "mixed"
      ? `Clothing is chosen for the walking part. The ${ride} doesn't make it lighter; any ${ride} extras are only for riding.`
      : `Clothing is chosen for walking. Bringing the ${ride} doesn't make it lighter.`,
  );
  if (riding.extras.length)
    notes.push(
      `Extras like a footmuff, blanket or cover keep your child warm or dry only while riding — not while walking.`,
    );
  notes.push(
    transport === "carrier"
      ? "Layerly hasn't checked this outfit for being carried. Adult body heat adds warmth, so check your child's neck or chest while carrying."
      : `Layerly hasn't checked this outfit for sitting in the ${ride}. Check your child's neck or chest while they ride.`,
  );

  return {
    pick: { ...walking, notes, extras: riding.extras },
    phases: {
      movement,
      transport,
      wornEffectiveC: walking.effectiveC,
      ridingEffectiveC: riding.effectiveC,
      ridingExtras: riding.extras.map((e) => e.slug),
      notJudged,
    },
  };
}
