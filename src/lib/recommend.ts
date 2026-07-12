import { type WardrobeSlug } from "./wardrobe-catalog";

export type Situation = "home" | "walk" | "car";
export type TransportMode = "pram" | "sitting-stroller" | "carrier";

export type RecommendInput = {
  feelsLikeC: number;
  tempPref: number; // 1 warm .. 5 cold
  situation: Situation;
  roomTempC?: number;
  transportMode?: TransportMode;
  rainCoverUsed?: boolean;
  footmuffUsed?: boolean;
  blanketUsed?: boolean;
  babywearingCoverUsed?: boolean;
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
  notes: string[];
  effectiveTempC: number;
};

const L = (slot: Layer["slot"], slug: WardrobeSlug, label: string): Layer => ({ slot, slug, label });
const A = (slug: WardrobeSlug, label: string): Accessory => ({ slug, label });

export function recommend(input: RecommendInput): Recommendation {
  const {
    feelsLikeC,
    tempPref,
    situation,
    roomTempC,
    transportMode,
    rainCoverUsed,
    footmuffUsed,
    blanketUsed,
    babywearingCoverUsed,
    durationMin,
    owned,
  } = input;

  let effective =
    situation === "home" && typeof roomTempC === "number"
      ? roomTempC
      : situation === "car"
        ? feelsLikeC + 2
        : feelsLikeC;

  effective -= (tempPref - 3) * 1.5;

  // Walk transport & cover modifiers
  if (situation === "walk") {
    if (transportMode === "pram") effective += 1;
    if (transportMode === "sitting-stroller") effective -= 1;
    if (transportMode === "carrier") effective += 3;
    if (transportMode === "carrier" && babywearingCoverUsed) effective += 2;
    if (rainCoverUsed) effective += 2;
    if (footmuffUsed) effective += 2;
    if (blanketUsed) effective += 1;
  }

  const layers: Layer[] = [];
  const accessories: Accessory[] = [];

  // Base
  if (effective >= 22) layers.push(L("base", "short_sleeve_bodysuit", "Short-sleeve bodysuit"));
  else layers.push(L("base", "long_sleeve_bodysuit", "Long-sleeve bodysuit"));

  // Bottom
  if (effective < 24) layers.push(L("bottom", effective < 15 ? "leggings" : "pants", effective < 15 ? "Leggings" : "Pants"));

  // Mid
  if (effective < 20 && effective >= 10) layers.push(L("mid", "sweater", "Sweater"));
  else if (effective < 10 && effective >= 4) layers.push(L("mid", "fleece_overall", "Fleece overall"));

  // Outer
  if (effective < 4) layers.push(L("outer", "winter_overall", "Winter overall"));

  // Head
  if (effective < 22 && effective >= 14) accessories.push(A("thin_hat", "Thin cotton hat"));
  else if (effective < 14) accessories.push(A("warm_hat", "Warm hat"));

  // Socks
  if (effective < 20) accessories.push(A("wool_socks", "Warm socks"));

  // Mittens
  if (effective < 4) accessories.push(A("mittens", "Mittens"));

  // Situation extras
  if (situation === "walk") {
    const isStrollerLike = transportMode === "pram" || transportMode === "sitting-stroller";
    if (isStrollerLike) {
      if (effective < 10 && !footmuffUsed) accessories.push(A("footmuff", "Footmuff in the stroller"));
      if (effective < 16 && !blanketUsed) accessories.push(A("blanket", "Blanket over the legs"));
      if ((durationMin ?? 0) >= 60 && effective < 12 && !blanketUsed) {
        accessories.push(A("blanket", "Extra blanket for the long walk"));
      }
    } else if (transportMode === "carrier") {
      if (effective < 8 && !babywearingCoverUsed) {
        accessories.push(A("babywearing_cover", "Babywearing cover"));
      }
    }
  }
  if (situation === "car" && (durationMin ?? 0) >= 30 && effective < 15) {
    accessories.push(A("blanket", "Blanket — remove the winter overall in the car seat"));
  }

  // De-duplicate accessories by slug
  const seen = new Set<string>();
  const accs = accessories.filter((a) => (seen.has(a.slug) ? false : (seen.add(a.slug), true)));

  const recommendedSlugs = [...layers.map((l) => l.slug), ...accs.map((a) => a.slug)];
  const missing = recommendedSlugs.filter((s) => !owned.has(s));

  const notes: string[] = [];
  if (situation === "walk") {
    if (rainCoverUsed) {
      notes.push(
        "Rain cover makes the stroller warmer and reduces airflow. Check baby's neck or chest regularly and remove a layer if baby feels hot.",
      );
    }
    if (transportMode === "carrier") {
      notes.push(
        "Carrier keeps baby warmer because of adult body heat. Dress baby slightly lighter than for a stroller walk and check baby's neck/chest during the walk.",
      );
      if (babywearingCoverUsed) {
        notes.push("Babywearing cover adds extra warmth. Avoid too many thick layers under it.");
      }
    }
  }

  const reason = buildReason(feelsLikeC, effective, situation, transportMode, rainCoverUsed);

  return { layers, accessories: accs, missing, reason, notes, effectiveTempC: effective };
}

function buildReason(
  feelsLike: number,
  effective: number,
  situation: Situation,
  transportMode?: TransportMode,
  rainCoverUsed?: boolean,
) {
  const rounded = Math.round(feelsLike);
  const eff = Math.round(effective);
  if (situation === "home") return `Room feels around ${eff}°C for a baby.`;
  if (situation === "car") return `Feels like ${rounded}°C outside — cabin will be warmer.`;

  let base: string;
  switch (transportMode) {
    case "pram":
      base = `Feels like ${rounded}°C outside. Pram is slightly more protected, so outfit is adjusted a little warmer than open air.`;
      break;
    case "sitting-stroller":
      base = `Feels like ${rounded}°C outside. Sitting stroller is more exposed to wind, so outfit is adjusted slightly warmer.`;
      break;
    case "carrier":
      base = `Feels like ${rounded}°C outside. Carrier adds warmth from adult body heat, so baby needs fewer layers than in a stroller.`;
      break;
    default:
      base = `Feels like ${rounded}°C outside for a baby (${eff}°C once you factor in preference).`;
  }
  if (rainCoverUsed) base += " Rain cover adds warmth and reduces airflow, so the outfit is adjusted lighter.";
  return base;
}
