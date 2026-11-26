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
import { isDurationMinutes } from "./outing-duration";
import {
  normalizeOutingContext,
  GROUND_CONDITIONS,
  OUTDOOR_ACTIVITIES,
  OUTING_MOVEMENTS,
  OUTING_TRANSPORTS,
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

/**
 * The toddler outing answers kept for this browser session (T17A), so they
 * survive leaving Today for Wardrobe or Profile and coming back. Only stated
 * answers are stored; anything unrecognised reads back as unanswered.
 */
export type StoredOutingAnswers = Pick<
  TodayOutingAnswers,
  "toddlerTransport" | "movement" | "activity" | "ground"
> & { duration?: number };

export const outingAnswersKey = (babyId: string) => `layerly:outing:${babyId}`;

const pick = <T extends string>(list: readonly T[], v: unknown): T | undefined =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined;

export function parseStoredOutingAnswers(raw: string | null): StoredOutingAnswers {
  let v: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") v = parsed as Record<string, unknown>;
  } catch {
    return {};
  }
  const out: StoredOutingAnswers = {};
  const t = pick(OUTING_TRANSPORTS, v["toddlerTransport"]);
  const m = pick(OUTING_MOVEMENTS, v["movement"]);
  const a = pick(OUTDOOR_ACTIVITIES, v["activity"]);
  const g = pick(GROUND_CONDITIONS, v["ground"]);
  if (t) out.toddlerTransport = t;
  if (m) out.movement = m;
  if (a) out.activity = a;
  if (g) out.ground = g;
  if (isDurationMinutes(v["duration"])) out.duration = v["duration"];
  return out;
}
