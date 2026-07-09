import { type WardrobeSlug } from "./wardrobe-catalog";

export type Situation = "home" | "walk" | "car";

export type RecommendInput = {
  feelsLikeC: number;
  tempPref: number; // 1 warm .. 5 cold
  situation: Situation;
  roomTempC?: number;
  strollerMode?: "stroller" | "carrier";
  durationMin?: number;
  owned: Set<WardrobeSlug>;
};

export type Layer = { slot: "base" | "bottom" | "mid" | "outer"; slug: WardrobeSlug; label: string };
export type Accessory = { slug: WardrobeSlug; label: string };

export type Recommendation = {
  layers: Layer[];
  accessories: Accessory[];
  missing: WardrobeSlug[];
  reason: string;
  effectiveTempC: number;
};

const L = (slot: Layer["slot"], slug: WardrobeSlug, label: string): Layer => ({ slot, slug, label });
const A = (slug: WardrobeSlug, label: string): Accessory => ({ slug, label });

export function recommend(input: RecommendInput): Recommendation {
  const { feelsLikeC, tempPref, situation, roomTempC, strollerMode, durationMin, owned } = input;

  // Home uses room temp when provided; walk uses outdoor; car uses outdoor minus a hair (cabin cools).
  let effective =
    situation === "home" && typeof roomTempC === "number"
      ? roomTempC
      : situation === "car"
        ? feelsLikeC + 2 // car warms up
        : feelsLikeC;

  // Baby-specific pref: cold-leaning babies (pref 5) dress warmer
  effective -= (tempPref - 3) * 1.5;

  const layers: Layer[] = [];
  const accessories: Accessory[] = [];

  // Base layer
  if (effective >= 22) layers.push(L("base", "short_sleeve_bodysuit", "Short-sleeve bodysuit"));
  else layers.push(L("base", "long_sleeve_bodysuit", "Long-sleeve bodysuit"));

  // Bottom (skip only when very warm indoors)
  if (effective < 24) layers.push(L("bottom", effective < 15 ? "leggings" : "pants", effective < 15 ? "Leggings" : "Pants"));

  // Mid layer
  if (effective < 20 && effective >= 10) layers.push(L("mid", "sweater", "Sweater"));
  else if (effective < 10 && effective >= 4) layers.push(L("mid", "fleece_overall", "Fleece overall"));

  // Outer layer
  if (effective < 4) layers.push(L("outer", "winter_overall", "Winter overall"));

  // Head
  if (effective < 22 && effective >= 14) accessories.push(A("thin_hat", "Thin cotton hat"));
  else if (effective < 14) accessories.push(A("wool_hat", "Wool hat"));

  // Socks
  if (effective < 20) accessories.push(A("wool_socks", "Warm socks"));

  // Mittens
  if (effective < 4) accessories.push(A("mittens", "Mittens"));

  // Situation extras
  if (situation === "walk") {
    if (strollerMode === "stroller" && effective < 10) accessories.push(A("footmuff", "Footmuff in the stroller"));
    if (strollerMode === "stroller" && effective < 16) accessories.push(A("blanket", "Blanket over the legs"));
    if ((durationMin ?? 0) >= 60 && effective < 12) accessories.push(A("blanket", "Extra blanket for the long walk"));
  }
  if (situation === "car" && (durationMin ?? 0) >= 30 && effective < 15) {
    accessories.push(A("blanket", "Blanket — remove the winter overall in the car seat"));
  }

  // Missing = things we recommended but user doesn't own
  const recommendedSlugs = [...layers.map((l) => l.slug), ...accessories.map((a) => a.slug)];
  const missing = recommendedSlugs.filter((s) => !owned.has(s));

  // De-duplicate accessories by slug
  const seen = new Set<string>();
  const accs = accessories.filter((a) => (seen.has(a.slug) ? false : (seen.add(a.slug), true)));

  const reason = buildReason(feelsLikeC, effective, situation);

  return { layers, accessories: accs, missing, reason, effectiveTempC: effective };
}

function buildReason(feelsLike: number, effective: number, situation: Situation) {
  const rounded = Math.round(feelsLike);
  const eff = Math.round(effective);
  if (situation === "home") return `Room feels around ${eff}°C for a baby.`;
  if (situation === "car") return `Feels like ${rounded}°C outside — cabin will be warmer.`;
  return `Feels like ${rounded}°C outside for a baby (${eff}°C once you factor in preference).`;
}
