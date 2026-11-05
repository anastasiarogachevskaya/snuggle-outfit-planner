/**
 * Optional per-garment details a parent can state about an owned item.
 * "unknown" always means the parent hasn't said — never infer it from the
 * slug or the catalogue warmth label (e.g. a legacy "snow_pants" row is not
 * assumed to be insulated or waterproof).
 */
export const INSULATION = ["unknown", "uninsulated", "light", "insulated"] as const;
export const WATERPROOF = ["unknown", "yes", "no"] as const;
export const AVAILABILITY = ["available", "temporarily_unavailable", "outgrown"] as const;
export const SLEEPWEAR_SHAPE = ["unknown", "one_piece", "two_piece"] as const;
export const FOOT_COVERAGE = ["unknown", "footed", "footless"] as const;
/** Wool leggings worn under other bottoms (thermal base) or on their own. */
export const LEGGINGS_USE = ["unknown", "thermal_base", "standalone"] as const;

export type GarmentDetails = {
  insulation: (typeof INSULATION)[number];
  waterproof: (typeof WATERPROOF)[number];
  availability: (typeof AVAILABILITY)[number];
  sleepwear_shape: (typeof SLEEPWEAR_SHAPE)[number];
  foot_coverage: (typeof FOOT_COVERAGE)[number];
  leggings_use: (typeof LEGGINGS_USE)[number];
};

export const DEFAULT_GARMENT_DETAILS: GarmentDetails = {
  insulation: "unknown",
  waterproof: "unknown",
  availability: "available",
  sleepwear_shape: "unknown",
  foot_coverage: "unknown",
  leggings_use: "unknown",
};

function pick<T extends readonly string[]>(allowed: T, v: unknown, fallback: T[number]): T[number] {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T[number]) : fallback;
}

/** Fill missing/invalid fields with the compatible defaults (unknown / available). */
export function normalizeGarmentDetails(raw: unknown): GarmentDetails {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_GARMENT_DETAILS;
  return {
    insulation: pick(INSULATION, r.insulation, d.insulation),
    waterproof: pick(WATERPROOF, r.waterproof, d.waterproof),
    availability: pick(AVAILABILITY, r.availability, d.availability),
    sleepwear_shape: pick(SLEEPWEAR_SHAPE, r.sleepwear_shape, d.sleepwear_shape),
    foot_coverage: pick(FOOT_COVERAGE, r.foot_coverage, d.foot_coverage),
    leggings_use: pick(LEGGINGS_USE, r.leggings_use, d.leggings_use),
  };
}

/** Only fields that differ from defaults — keeps local storage small. */
export function compactGarmentDetails(details: GarmentDetails): Partial<GarmentDetails> {
  const out: Partial<GarmentDetails> = {};
  for (const k of Object.keys(DEFAULT_GARMENT_DETAILS) as (keyof GarmentDetails)[]) {
    if (details[k] !== DEFAULT_GARMENT_DETAILS[k]) (out as Record<string, string>)[k] = details[k];
  }
  return out;
}

/** Owned and usable today: owned rows that aren't outgrown or temporarily away. */
export function isUsable(row: { owned: boolean; availability?: string | null }): boolean {
  return row.owned && (row.availability ?? "available") === "available";
}
