/**
 * Shared outing context: what the child will do (movement, activity, ground)
 * kept separate from how they travel (transport).
 *
 * Data foundation only. No outfit rule reads movement, activity or ground yet;
 * the engine still uses `situation` and `transportMode`, which
 * `outingEngineFields` derives from this model so every consumer stays in
 * agreement.
 *
 * Rules:
 * - Unstated means omitted. Nothing is ever derived from age, and ground is
 *   never derived from current rainfall or from the chosen activity.
 * - Home and car keep their existing meaning; outdoor-only fields are dropped.
 * - A walk in a pram, sitting stroller or carrier without a stated movement
 *   keeps today's seated/carried meaning (`movementSource: "transport"`).
 * - A stated movement is always kept as stated, alongside any transport.
 * - Unrecognised or missing values (older callers, saved data) are omitted,
 *   never guessed.
 */
import type { Situation, TransportMode } from "./recommend";

export const OUTING_MOVEMENTS = ["seated", "walking", "active", "mixed"] as const;
/** seated = seated or carried; walking = gentle walking; active = active play. */
export type OutingMovement = (typeof OUTING_MOVEMENTS)[number];

export const OUTDOOR_ACTIVITIES = ["stroll", "playground", "wet_play", "snow_play"] as const;
export type OutdoorActivity = (typeof OUTDOOR_ACTIVITIES)[number];

export const GROUND_CONDITIONS = ["dry", "wet", "snow"] as const;
export type GroundCondition = (typeof GROUND_CONDITIONS)[number];

export const OUTING_TRANSPORTS = ["pram", "sitting-stroller", "carrier", "none"] as const;
/** Existing transport choices plus "none" for walking outings. */
export type OutingTransport = TransportMode | "none";

const SITUATIONS: readonly Situation[] = ["home", "walk", "car"];

export type OutingContext = {
  situation: Situation;
  /** Omitted when not stated and not implied by a seat/carrier. */
  movement?: OutingMovement;
  /** "stated" by the parent, or kept from a legacy seated "transport". */
  movementSource?: "stated" | "transport";
  activity?: OutdoorActivity;
  ground?: GroundCondition;
  /** Omitted when not stated; "none" when the parent said no transport. */
  transport?: OutingTransport;
};

/** Loose input accepted from UI state, assistant input and saved records. */
export type OutingInput = {
  situation: Situation;
  transportMode?: string | null;
  movement?: string | null;
  activity?: string | null;
  ground?: string | null;
};

function pick<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** The one normalization path for existing and new outing inputs. */
export function normalizeOutingContext(input: OutingInput): OutingContext {
  const situation = input.situation;
  if (situation !== "walk") return { situation };

  const out: OutingContext = { situation };
  const transport = pick(OUTING_TRANSPORTS, input.transportMode);
  const movement = pick(OUTING_MOVEMENTS, input.movement);
  const activity = pick(OUTDOOR_ACTIVITIES, input.activity);
  const ground = pick(GROUND_CONDITIONS, input.ground);

  if (movement) {
    out.movement = movement;
    out.movementSource = "stated";
  } else if (transport && transport !== "none") {
    // Existing stroller/carrier outings: the child rides, as before.
    out.movement = "seated";
    out.movementSource = "transport";
  }
  if (activity) out.activity = activity;
  if (ground) out.ground = ground;
  if (transport) out.transport = transport;
  return out;
}

/**
 * Reads an outing from a saved record (feedback row, local-profile feedback
 * details, older payloads). Accepts snake_case or camelCase keys. Returns null
 * only when the record has no recognisable situation.
 */
export function parseOutingContext(raw: unknown): OutingContext | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const situation = pick(SITUATIONS, r.situation ?? r.activity_situation);
  if (!situation) return null;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return normalizeOutingContext({
    situation,
    transportMode: str(r.transport_mode ?? r.transportMode ?? r.transport),
    movement: str(r.movement),
    activity: str(r.outdoor_activity ?? r.outdoorActivity),
    ground: str(r.ground ?? r.ground_conditions ?? r.groundConditions),
  });
}

/** The engine's existing inputs, derived from the outing so they never disagree. */
export function outingEngineFields(outing: OutingContext): {
  situation: Situation;
  transportMode?: TransportMode;
  outing: OutingContext;
} {
  const t = outing.transport;
  return {
    situation: outing.situation,
    ...(t && t !== "none" ? { transportMode: t } : {}),
    outing,
  };
}
