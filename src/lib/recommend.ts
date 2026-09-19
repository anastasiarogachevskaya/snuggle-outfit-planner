import { type WardrobeSlug } from "./wardrobe-catalog";
import { pickOutdoor, type OutdoorContext } from "./recommend/pick-outdoor";
import { pickHome } from "./recommend/pick-home";
import { mapWardrobe } from "./recommend/map-wardrobe";
import { TEMP } from "./recommend/temperature";

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
  /** Cloud cover 0–100%, used to soften sun advice under overcast skies. */
  cloudCoverPct?: number;
  /** Forecast "feels like" for roughly `durationMin` minutes from now. */
  feelsLikeAtEndC?: number;
};

// slug can be a real WardrobeSlug or a synthetic display-only value like "diaper_only"
export type Layer = {
  slot: "base" | "bottom" | "mid" | "outer";
  slug: WardrobeSlug | "diaper_only";
  label: string;
  /** Set when `slug` is a stand-in: the name of the item actually owned. */
  usingLabel?: string;
};
export type Accessory = { slug: WardrobeSlug; label: string; usingLabel?: string };
/** A transport extra that isn't recommended today but still fits the trip. */
export type OptionalAccessory = Accessory & { owned: boolean };

const TRANSPORT_EXTRA_LABELS: Record<string, string> = {
  rain_cover: "Rain cover",
  footmuff: "Footmuff",
  blanket: "Blanket",
  babywearing_cover: "Babywearing cover",
  car_seat_blanket: "Car seat blanket",
};

/**
 * Every transport extra that makes sense for a trip, regardless of today's
 * weather. Layer up uses this so parents can build any outfit, not just the
 * recommended one.
 */
export function transportExtraCandidates(
  situation: Situation,
  transportMode?: TransportMode,
): WardrobeSlug[] {
  if (situation === "car") return ["blanket", "car_seat_blanket"];
  if (situation !== "walk") return [];
  if (transportMode === "carrier") return ["babywearing_cover", "blanket"];
  if (transportMode === "pram" || transportMode === "sitting-stroller")
    return ["rain_cover", "footmuff", "blanket"];
  return [];
}

export type Recommendation = {
  babyClothing: Layer[];
  accessories: Accessory[];
  sleepAccessories: Accessory[];
  transportExtras: Accessory[];
  /** Extras that fit the trip but aren't recommended for today's weather. */
  optionalTransportExtras: OptionalAccessory[];
  missingHelpfulItems: Accessory[];
  missing: WardrobeSlug[]; // missing baby clothing / accessory items only
  reason: string;
  notes: string[];
  safetyAdvice: string[];
  effectiveTempC: number;
};

export function recommend(input: RecommendInput): Recommendation {
  if (input.situation === "home") {
    const home = pickHome({
      roomTempC: input.roomTempC ?? 21,
      homeActivity: input.homeActivity ?? "playing",
      ageMonths: input.ageMonths ?? null,
      owned: input.owned,
    });
    const mapped = mapWardrobe(home.layers, home.accessories, input.owned);
    const sleepAccessories: Accessory[] = home.sleepAccessories.map((s) => ({
      slug: s.slug,
      label: s.label,
    }));
    const missingHelpfulItems: Accessory[] = home.missingSleep.map((s) => ({
      slug: s.slug,
      label: s.label,
    }));
    return {
      babyClothing: mapped.babyClothing,
      accessories: mapped.accessories,
      sleepAccessories,
      transportExtras: [],
      optionalTransportExtras: [],
      missingHelpfulItems,
      missing: mapped.missing,
      reason: home.reason,
      notes: home.notes,
      safetyAdvice: home.safetyAdvice,
      effectiveTempC: home.effectiveC,
    };
  }

  const ctx: OutdoorContext = {
    feelsLikeC: input.feelsLikeC,
    tempPref: input.tempPref,
    situation: input.situation,
    transportMode: input.transportMode,
    isRaining: input.isRaining,
    durationMin: input.durationMin,
    ageMonths: input.ageMonths,
    uvIndex: input.uvIndex,
    cloudCoverPct: input.cloudCoverPct,
    feelsLikeAtEndC: input.feelsLikeAtEndC,
  };
  const out = pickOutdoor(ctx);
  const mapped = mapWardrobe(out.layers, out.accessories, input.owned, input.situation === "car");

  const transportExtras: Accessory[] = [];
  const missingHelpfulItems: Accessory[] = [];
  const usedExtras = new Set<WardrobeSlug>();
  const missingExtras = new Set<WardrobeSlug>();
  for (const e of out.extras) {
    // A car seat blanket is the purpose-made version of the over-harness
    // blanket, so prefer it when the parent has one.
    const slug =
      e.slug === "blanket" && input.situation === "car" && input.owned.has("car_seat_blanket")
        ? ("car_seat_blanket" as WardrobeSlug)
        : e.slug;
    if (input.owned.has(slug)) {
      transportExtras.push({ slug, label: e.label });
      usedExtras.add(slug);
    } else {
      missingHelpfulItems.push({ slug, label: e.label });
      missingExtras.add(slug);
    }
  }

  // Extra notes about missing helpful items
  const notes = [...out.notes];
  if (input.situation === "walk") {
    if (missingExtras.has("footmuff"))
      notes.push("No footmuff in your wardrobe — consider one for cold stroller walks.");
    if (missingExtras.has("rain_cover") && input.isRaining)
      notes.push("No rain cover in your wardrobe — consider one to keep baby dry.");
    if (usedExtras.has("rain_cover"))
      notes.push(
        "Rain cover makes the stroller warmer and reduces airflow. Check baby's neck or chest regularly.",
      );
  }

  const reason = buildReason(input, out.effectiveC, usedExtras);

  return {
    babyClothing: mapped.babyClothing,
    accessories: mapped.accessories,
    sleepAccessories: [],
    transportExtras,
    missingHelpfulItems,
    missing: mapped.missing,
    reason,
    notes,
    safetyAdvice: out.safetyAdvice,
    effectiveTempC: out.effectiveC,
  };
}

function buildReason(
  input: RecommendInput,
  effective: number,
  usedExtras: Set<WardrobeSlug>,
): string {
  const rounded = Math.round(input.feelsLikeC);
  const eff = Math.round(effective);
  if (input.situation === "car") return `Feels like ${rounded}°C outside — cabin will be warmer.`;

  let base: string;
  switch (input.transportMode) {
    case "pram":
      base = `Feels like ${rounded}°C. Pram is a bit protected, so outfit is slightly warmer than open air.`;
      break;
    case "sitting-stroller":
      base = `Feels like ${rounded}°C. Sitting stroller is more exposed, so outfit is slightly warmer.`;
      break;
    case "carrier":
      base =
        input.feelsLikeC >= TEMP.WARM
          ? `Feels like ${rounded}°C. Carrier adds body heat — outfit is kept light to avoid overheating.`
          : `Feels like ${rounded}°C. Carrier adds warmth from body heat, so baby needs fewer layers.`;
      break;
    default:
      base = `Feels like ${rounded}°C for a baby (${eff}°C with preference and context).`;
  }
  if (usedExtras.has("rain_cover")) base += " Rain cover adds warmth and reduces airflow.";
  if (usedExtras.has("footmuff")) base += " Footmuff adds warmth, so the outfit is lighter.";
  if (usedExtras.has("blanket")) base += " A blanket adds a little extra warmth.";
  return base;
}
