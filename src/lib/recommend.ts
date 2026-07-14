import { type WardrobeSlug } from "./wardrobe-catalog";

export type Situation = "home" | "walk" | "car";
export type TransportMode = "pram" | "sitting-stroller" | "carrier";
export type HomeActivity = "playing" | "sleeping";

export type RecommendInput = {
  feelsLikeC: number;
  tempPref: number; // 1 warm .. 5 cold
  situation: Situation;
  roomTempC?: number;
  transportMode?: TransportMode;
  isRaining?: boolean;
  durationMin?: number;
  owned: Set<WardrobeSlug>;
  homeActivity?: HomeActivity;
  ageMonths?: number | null;
  uvIndex?: number;
};

// slug can be a real WardrobeSlug or a synthetic display-only value like "diaper_only"
export type Layer = {
  slot: "base" | "bottom" | "mid" | "outer";
  slug: WardrobeSlug | "diaper_only";
  label: string;
};
export type Accessory = { slug: WardrobeSlug; label: string };

export type Recommendation = {
  babyClothing: Layer[];
  accessories: Accessory[];
  sleepAccessories: Accessory[];
  transportExtras: Accessory[];
  missingHelpfulItems: Accessory[];
  missing: WardrobeSlug[]; // missing baby clothing / accessory items only
  reason: string;
  notes: string[];
  safetyAdvice: string[];
  effectiveTempC: number;
};

const L = (slot: Layer["slot"], slug: Layer["slug"], label: string): Layer => ({ slot, slug, label });
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
    homeActivity = "playing",
    ageMonths,
    uvIndex,
  } = input;

  // ============================================================
  // HOME MODE — handled specially, returns early with its own shape
  // ============================================================
  if (situation === "home") {
    return recommendHome({
      roomTempC: roomTempC ?? 21,
      homeActivity,
      ageMonths: ageMonths ?? null,
      owned,
    });
  }

  // ============================================================
  // OUTDOOR (walk / car) — existing effective-temp logic
  // ============================================================
  let effective = situation === "car" ? feelsLikeC + 2 : feelsLikeC;
  effective -= (tempPref - 3) * 1.5;

  const transportExtras: Accessory[] = [];
  const missingHelpfulItems: Accessory[] = [];
  const notes: string[] = [];
  const safetyAdvice: string[] = [];
  const usedExtras: Set<WardrobeSlug> = new Set();
  const missingExtras: Set<WardrobeSlug> = new Set();

  const consider = (slug: WardrobeSlug, label: string, warmthBoost: number) => {
    if (owned.has(slug)) {
      transportExtras.push(A(slug, label));
      usedExtras.add(slug);
      effective += warmthBoost;
    } else {
      missingHelpfulItems.push(A(slug, label));
      missingExtras.add(slug);
    }
  };

  if (situation === "walk") {
    if (transportMode === "pram") effective += 1;
    if (transportMode === "sitting-stroller") effective -= 1;
    if (transportMode === "carrier") effective += 3;

    const isStrollerLike = transportMode === "pram" || transportMode === "sitting-stroller";

    if (isStrollerLike) {
      if (isRaining) consider("rain_cover", "Rain cover", 2);
      if (effective < 10) consider("footmuff", "Footmuff", 2);
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

  // Head — sun hat on warm walks takes priority
  const wantsSunHat = situation === "walk" && effective >= 18;
  if (wantsSunHat) {
    if (owned.has("sun_hat")) {
      accessories.push(A("sun_hat", "Sun hat"));
    } else {
      missingHelpfulItems.push(A("sun_hat", "Sun hat"));
      missingExtras.add("sun_hat");
    }
  } else if (effective < 22 && effective >= 14) {
    accessories.push(A("thin_hat", "Thin cotton hat"));
  } else if (effective < 14) {
    accessories.push(A("warm_hat", "Warm hat"));
  }

  // Socks
  if (effective < 20) accessories.push(A("wool_socks", "Warm socks"));

  // Mittens
  if (effective < 4) accessories.push(A("mittens", "Mittens"));

  // De-duplicate accessories by slug
  const seen = new Set<string>();
  const accs = accessories.filter((a) => (seen.has(a.slug) ? false : (seen.add(a.slug), true)));

  const clothingSlugs = [
    ...babyClothing.map((l) => l.slug).filter((s): s is WardrobeSlug => s !== "diaper_only"),
    ...accs.map((a) => a.slug),
  ];
  const missing = clothingSlugs.filter((s) => !owned.has(s));

  // Transport / carrier notes
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
    if (
      missingExtras.has("blanket") &&
      !usedExtras.has("footmuff") &&
      !usedExtras.has("babywearing_cover")
    ) {
      notes.push("No blanket available — outfit kept warmer instead.");
    }
  }

  // ---- Sun & UV safety advice (walk only) ----
  if (situation === "walk") {
    const uv = typeof uvIndex === "number" ? uvIndex : undefined;
    const warmEnough = feelsLikeC >= 22 || (uv !== undefined && uv >= 3);
    if (warmEnough) {
      if (ageMonths !== null && ageMonths !== undefined && ageMonths < 6) {
        safetyAdvice.push("☀️ Keep baby in the shade whenever possible.");
        safetyAdvice.push("☀️ Avoid direct sunlight.");
        safetyAdvice.push(
          "☀️ Dress baby in lightweight clothing and always use a sun hat if available.",
        );
      } else {
        safetyAdvice.push(
          "☀️ Use a sun hat, seek shade whenever possible, and apply broad-spectrum SPF 30+ to exposed skin before going outside.",
        );
        safetyAdvice.push(
          "☀️ Reapply sunscreen per product instructions, especially after sweating or getting wet.",
        );
      }
    }
    if (uv !== undefined) {
      if (uv >= 8) safetyAdvice.push("☀️ Very strong UV today. Minimize direct sun exposure.");
      else if (uv >= 6)
        safetyAdvice.push("☀️ Strong sun today. Keep baby in the shade when possible.");
      else if (uv >= 3) safetyAdvice.push("☀️ Sun protection is recommended.");
    }
  }

  const reason = buildReason(feelsLikeC, effective, situation, transportMode, usedExtras);

  return {
    babyClothing,
    accessories: accs,
    sleepAccessories: [],
    transportExtras,
    missingHelpfulItems,
    missing,
    reason,
    notes,
    safetyAdvice,
    effectiveTempC: effective,
  };
}

// ============================================================
// HOME
// ============================================================
function recommendHome(args: {
  roomTempC: number;
  homeActivity: HomeActivity;
  ageMonths: number | null;
  owned: Set<WardrobeSlug>;
}): Recommendation {
  const { roomTempC, homeActivity, ageMonths, owned } = args;

  const babyClothing: Layer[] = [];
  const accessories: Accessory[] = [];
  const sleepAccessories: Accessory[] = [];
  const missingHelpfulItems: Accessory[] = [];
  const safetyAdvice: string[] = [];
  const notes: string[] = [];

  const suggest = (slug: WardrobeSlug, label: string) => {
    if (owned.has(slug)) sleepAccessories.push(A(slug, label));
    else missingHelpfulItems.push(A(slug, label));
  };

  let reason = "";

  if (homeActivity === "sleeping") {
    // Sleep-specific bands based on room temperature.
    if (roomTempC >= 27) {
      babyClothing.push(L("base", "diaper_only", "Diaper only"));
      safetyAdvice.push("🌡️ The room is very warm. Avoid sleep sacks and extra blankets.");
      safetyAdvice.push("🌡️ Check baby's neck or chest for signs of overheating.");
      reason = `Room is ~${Math.round(roomTempC)}°C — very warm for sleep, so no sleep clothing needed.`;
    } else if (roomTempC >= 24) {
      babyClothing.push(L("base", "short_sleeve_bodysuit", "Short-sleeve bodysuit"));
      safetyAdvice.push("🌡️ Warm room — skip the sleep sack or use only a very lightweight one.");
      reason = `Room is ~${Math.round(roomTempC)}°C — a short-sleeve bodysuit is enough for sleep.`;
    } else if (roomTempC >= 21) {
      babyClothing.push(L("base", "pajamas", "Lightweight pajamas"));
      const newborn = ageMonths !== null && ageMonths < 4;
      if (newborn && owned.has("swaddle")) {
        sleepAccessories.push(A("swaddle", "Swaddle"));
      } else {
        suggest("sleep_sack_light", "Light sleep sack");
      }
      reason = `Room is ~${Math.round(roomTempC)}°C — pajamas with a light sleep sack.`;
    } else {
      // 18–20 (and below)
      babyClothing.push(L("base", "pajamas", "Long-sleeve pajamas"));
      const newborn = ageMonths !== null && ageMonths < 4;
      if (newborn && owned.has("swaddle")) {
        sleepAccessories.push(A("swaddle", "Swaddle"));
      } else if (owned.has("sleep_sack_warm")) {
        sleepAccessories.push(A("sleep_sack_warm", "Warm sleep sack"));
      } else if (owned.has("sleep_sack_light")) {
        sleepAccessories.push(A("sleep_sack_light", "Light sleep sack"));
        notes.push("No warm sleep sack — using a light one; add pajamas underneath if baby feels cool.");
      } else {
        missingHelpfulItems.push(A("sleep_sack_warm", "Warm sleep sack"));
      }
      reason = `Room is ~${Math.round(roomTempC)}°C — pajamas and a sleep sack for warmth.`;
    }
  } else {
    // Playing / awake — daytime clothing with hot-room overrides.
    if (roomTempC >= 28) {
      babyClothing.push(L("base", "diaper_only", "Diaper only"));
      safetyAdvice.push(
        "🌡️ The room is very warm. Keeping baby in only a diaper helps reduce overheating.",
      );
      safetyAdvice.push("🌡️ Avoid extra blankets. Check baby's neck/chest for signs of overheating.");
      reason = `Room is ~${Math.round(roomTempC)}°C — very warm, so reduce layers.`;
    } else if (roomTempC >= 26) {
      babyClothing.push(L("base", "short_sleeve_bodysuit", "Short-sleeve bodysuit"));
      safetyAdvice.push("🌡️ Warm room — keep it to a single light layer and skip extra blankets.");
      reason = `Room is ~${Math.round(roomTempC)}°C — warm, so a single light layer is enough.`;
    } else if (roomTempC >= 24) {
      babyClothing.push(L("base", "short_sleeve_bodysuit", "Short-sleeve bodysuit"));
      babyClothing.push(L("bottom", "pants", "Light pants"));
      reason = `Room is ~${Math.round(roomTempC)}°C — light clothing only.`;
    } else if (roomTempC >= 20) {
      babyClothing.push(L("base", "long_sleeve_bodysuit", "Long-sleeve bodysuit"));
      babyClothing.push(L("bottom", "pants", "Pants"));
      reason = `Room is ~${Math.round(roomTempC)}°C — comfortable for a regular outfit.`;
    } else {
      babyClothing.push(L("base", "long_sleeve_bodysuit", "Long-sleeve bodysuit"));
      babyClothing.push(L("bottom", "leggings", "Leggings"));
      babyClothing.push(L("mid", "sweater", "Sweater"));
      accessories.push(A("wool_socks", "Warm socks"));
      reason = `Room is ~${Math.round(roomTempC)}°C — add a mid layer to keep baby warm.`;
    }
  }

  const clothingSlugs = [
    ...babyClothing.map((l) => l.slug).filter((s): s is WardrobeSlug => s !== "diaper_only"),
    ...accessories.map((a) => a.slug),
  ];
  const missing = clothingSlugs.filter((s) => !owned.has(s));

  return {
    babyClothing,
    accessories,
    sleepAccessories,
    transportExtras: [],
    missingHelpfulItems,
    missing,
    reason,
    notes,
    safetyAdvice,
    effectiveTempC: roomTempC,
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
  if (usedExtras.has("sun_hat")) base += " A sun hat helps protect from direct sunlight.";
  return base;
}
