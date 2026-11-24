/**
 * Today's outing answers → the shared outing context (T17).
 *
 * The toddler outing controls (movement, transport incl. "none", activity,
 * ground) are offered only when toddler rules apply to the child's age. Each
 * answer is passed through as stated; nothing is inferred from age, transport,
 * activity or rainfall. Everything else goes through `normalizeOutingContext`,
 * so home/car drop retained outdoor answers and legacy seated/carried walks
 * keep their meaning. Without toddler rules the context is exactly the
 * pre-T17 one (situation + transport).
 */
import { toddlerRulesApply } from "./feature-flags";
import {
  normalizeOutingContext,
  type GroundCondition,
  type OutdoorActivity,
  type OutingContext,
  type OutingMovement,
  type OutingTransport,
} from "./outing-context";
import type { Situation, TransportMode } from "./recommend";

export type TodayOutingAnswers = {
  situation: Situation;
  /** Existing ride choice (legacy picker). */
  transportMode: TransportMode;
  /** Toddler transport answer; "none" = no transport. Unset = use transportMode. */
  toddlerTransport?: OutingTransport;
  movement?: OutingMovement;
  activity?: OutdoorActivity;
  ground?: GroundCondition;
};

export function todayOutingControlsShown(ageMonths: number | null, enabled?: boolean): boolean {
  return toddlerRulesApply(ageMonths, enabled);
}

export function todayOutingContext(
  a: TodayOutingAnswers,
  ageMonths: number | null,
  enabled?: boolean,
): OutingContext {
  if (!todayOutingControlsShown(ageMonths, enabled)) {
    return normalizeOutingContext({ situation: a.situation, transportMode: a.transportMode });
  }
  return normalizeOutingContext({
    situation: a.situation,
    transportMode: a.toddlerTransport ?? a.transportMode,
    movement: a.movement ?? null,
    activity: a.activity ?? null,
    ground: a.ground ?? null,
  });
}
