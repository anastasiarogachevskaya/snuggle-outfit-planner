/**
 * Optional child-level preferences. Parent-stated only: age never sets
 * nappy use or toileting status. Missing values use compatible defaults.
 */
export const CLOTHING_STYLE = ["bodysuits", "tops", "both"] as const;
export const NAPPY_USE = ["yes", "no", "unknown"] as const;

export type ChildPreferences = {
  clothing_style: (typeof CLOTHING_STYLE)[number];
  nappy_use: (typeof NAPPY_USE)[number];
  easy_toilet_access: boolean;
};

export const DEFAULT_CHILD_PREFERENCES: ChildPreferences = {
  clothing_style: "both",
  nappy_use: "unknown",
  easy_toilet_access: false,
};

export function normalizeChildPreferences(raw: unknown): ChildPreferences {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_CHILD_PREFERENCES;
  return {
    clothing_style: (CLOTHING_STYLE as readonly unknown[]).includes(r.clothing_style)
      ? (r.clothing_style as ChildPreferences["clothing_style"])
      : d.clothing_style,
    nappy_use: (NAPPY_USE as readonly unknown[]).includes(r.nappy_use)
      ? (r.nappy_use as ChildPreferences["nappy_use"])
      : d.nappy_use,
    easy_toilet_access:
      typeof r.easy_toilet_access === "boolean" ? r.easy_toilet_access : d.easy_toilet_access,
  };
}

/** Only non-default fields — keeps local storage small. */
export function compactChildPreferences(p: ChildPreferences): Partial<ChildPreferences> {
  const out: Partial<ChildPreferences> = {};
  for (const k of Object.keys(DEFAULT_CHILD_PREFERENCES) as (keyof ChildPreferences)[]) {
    if (p[k] !== DEFAULT_CHILD_PREFERENCES[k]) (out as Record<string, unknown>)[k] = p[k];
  }
  return out;
}
