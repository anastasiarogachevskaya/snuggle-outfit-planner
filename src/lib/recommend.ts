import { type WardrobeSlug } from "./wardrobe-catalog";

export type Situation = "home" | "walk" | "car";
export type TransportMode = "pram" | "sitting-stroller" | "carrier";

export type RecommendInput = {
  feelsLikeC: number;
  tempPref: number; // 1 warm .. 5 cold
  situation: Situation;
  roomTempC?: number;
  transportMode?: TransportMode;
  isRaining?: boolean;
  durationMin?: number;
  owned: Set<WardrobeSlug>;
};

export type Layer = { slot: "base" | "bottom" | "mid" | "outer"; slug: WardrobeSlug; label: string };
export type Accessory = { slug: WardrobeSlug; label: string };

export type Recommendation = {
  babyClothing: Layer[];
  accessories: Accessory[];
  transportExtras: Accessory[];
  missingHelpfulItems: Accessory[];
  missing: WardrobeSlug[]; // missing baby clothing / accessory items only
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
    isRaining,
    durationMin,
    owned,
  } = input;

  // Base effective temperature (before extras)
  let effective =
    situation === "home" && typeof roomTempC === "number"
      ? roomTempC
      : situation === "car"
        ? feelsLikeC + 2
        : feelsLikeC;

  effective -= (tempPref - 3) * 1.5;

  const transportExtras: Accessory[] = [];
  const missingHelpfulItems: Accessory[] = [];
  const notes: string[] = [];
  const usedExtras: Set<WardrobeSlug> = new Set();
  const missingExtras: Set<WardrobeSlug> = new Set();

  const consider = (
    slug: WardrobeSlug,
    label: string,
    warmthBoost: number,
  ) => {
    if (owned.has(slug)) {
      transportExtras.push(A(slug, label));
      usedExtras.add(slug);
      effective += warmthBoost;
    } else {
      missingHelpfulItems.push(A(slug, label));
      missingExtras.add(slug);
    }
  };

  // Walk transport modifiers + auto extras
  if (situation === "walk") {
    if (transportMode === "pram") effective += 1;
    if (transportMode === "sitting-stroller") effective -= 1;
    if (transportMode === "carrier") effective += 3;

    const isStrollerLike = transportMode === "pram" || transportMode === "sitting-stroller";

    if (isStrollerLike) {
      if (isRaining) consider("rain_cover", "Rain cover", 2);
      if (effective < 10) consider("footmuff", "Footmuff", 2);
      // Blanket if still cool, or as a fallback when footmuff is missing
      if (effective < 16 && !usedExtras.has("footmuff")) {
        consider("blanket", "Blanket", 1);
      }
    } else if (transportMode === "carrier") {
      if (effective < 8) consider("babywearing_cover", "Babywearing cover", 2);
      if (effective < 12 && !usedExtras.has("babywearing_cover")) {
        consider("blanket", "Blanket", 1);
      }
    }
  }

  // Car: long cold trip → blanket instead of overall in seat
  if (situation === "car" && (durationMin ?? 0) >= 30 && effective < 15) {
    if (owned.has("blanket")) {
      transportExtras.push(A("blanket", "Blanket — remove the winter overall in the car seat"));
      usedExtras.add("blanket");
    } else {
      missingHelpfulItems.push(A("blanket", "Blanket for the car seat"));
      missingExtras.add("blanket");
    }
  }

  const babyClothing: Layer[] = [];
  const accessories: Accessory[] = [];

  // Base
  if (effective >= 22) babyClothing.push(L("base", "short_sleeve_bodysuit", "Short-sleeve bodysuit"));
  else babyClothing.push(L("base", "long_sleeve_bodysuit", "Long-sleeve bodysuit"));

  // Bottom
  if (effective < 24) babyClothing.push(L("bottom", effective < 15 ? "leggings" : "pants", effective < 15 ? "Leggings" : "Pants"));

  // Mid
  if (effective < 20 && effective >= 10) babyClothing.push(L("mid", "sweater", "Sweater"));
  else if (effective < 10 && effective >= 4) babyClothing.push(L("mid", "fleece_overall", "Fleece overall"));

  // Outer
  if (effective < 4) babyClothing.push(L("outer", "winter_overall", "Winter overall"));

  // Head
  if (effective < 22 && effective >= 14) accessories.push(A("thin_hat", "Thin cotton hat"));
  else if (effective < 14) accessories.push(A("warm_hat", "Warm hat"));

  // Socks
  if (effective < 20) accessories.push(A("wool_socks", "Warm socks"));

  // Mittens
  if (effective < 4) accessories.push(A("mittens", "Mittens"));

  // De-duplicate accessories by slug
  const seen = new Set<string>();
  const accs = accessories.filter((a) => (seen.has(a.slug) ? false : (seen.add(a.slug), true)));

  const clothingSlugs = [...babyClothing.map((l) => l.slug), ...accs.map((a) => a.slug)];
  const missing = clothingSlugs.filter((s) => !owned.has(s));

  // Safety & context notes — only for extras actually used
  if (situation === "walk") {
    if (usedExtras.has("rain_cover")) {
      notes.push(
        "Rain cover makes the stroller warmer and reduces airflow. Check baby's neck or chest regularly and remove a layer if baby feels hot.",
      );
    }
    if (transportMode === "carrier") {
      notes.push(
        "Carrier keeps baby warmer because of adult body heat. Dress baby slightly lighter than for a stroller walk and check baby's neck/chest during the walk.",
      );
      if (usedExtras.has("babywearing_cover")) {
        notes.push("Babywearing cover adds extra warmth. Avoid too many thick layers under it.");
      }
    }
    if (missingExtras.has("footmuff")) {
      notes.push("No footmuff in your wardrobe — outfit adjusted a bit warmer to compensate.");
    }
    if (missingExtras.has("rain_cover") && isRaining) {
      notes.push("No rain cover in your wardrobe — consider a rain overall to keep baby dry.");
    }
    if (missingExtras.has("blanket") && !usedExtras.has("footmuff") && !usedExtras.has("babywearing_cover")) {
      notes.push("No blanket available — outfit kept warmer instead.");
    }
  }

  const reason = buildReason(feelsLikeC, effective, situation, transportMode, usedExtras);

  return {
    babyClothing,
    accessories: accs,
    transportExtras,
    missingHelpfulItems,
    missing,
    reason,
    notes,
    effectiveTempC: effective,
  };
}

function buildReason(
  feelsLike: number,
  effective: number,
  situation: Situation,
  transportMode: TransportMode | undefined,
  usedExtras: Set<WardrobeSlug>,
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
  if (usedExtras.has("rain_cover")) base += " Rain cover adds warmth and reduces airflow, so the outfit is lighter.";
  if (usedExtras.has("footmuff")) base += " Footmuff adds warmth, so the outfit is lighter.";
  if (usedExtras.has("blanket")) base += " A blanket adds a little extra warmth.";
  return base;
}
