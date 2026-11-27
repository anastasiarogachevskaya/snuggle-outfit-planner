import { LABEL_BY_SLUG, type WardrobeSlug } from "./wardrobe-catalog";
import { pickOutdoor, type OutdoorContext } from "./recommend/pick-outdoor";
import { pickHome } from "./recommend/pick-home";
import { mapWardrobe } from "./recommend/map-wardrobe";
import { TEMP } from "./recommend/temperature";
import { extraItemTip, type SetAsideReason } from "./wardrobe-eligibility";
import { normalizeOutingContext, type OutingContext } from "./outing-context";
import type { ChildPreferences } from "./child-preferences";
import type { GarmentDetails } from "./garment-details";
import { everydayTopRules } from "./recommend/everyday-tops";
import {
  selectWalkingFootwear,
  walkingFootwearApplies,
  type FootwearNeed,
} from "./recommend/footwear";
import { selectRainProtection, type RainProtectionNeed } from "./recommend/rain-protection";
import {
  pickWalkingWithRide,
  rideTransport,
  type WalkingWarmthPhases,
} from "./recommend/walking-warmth";
import type { OutingWeather } from "./outing-weather";
import { toddlerRulesApply } from "./feature-flags";
import { buildOutingPreparation, type OutingPreparation } from "./recommend/outing-preparation";

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
  /**
   * Owned items left out of `owned` because the parent set them aside
   * (from resolveEligibleWardrobe). Only changes tip wording, never choices.
   */
  setAside?: ReadonlyMap<WardrobeSlug, SetAsideReason>;
  homeActivity?: HomeActivity;
  ageMonths?: number | null;
  uvIndex?: number;
  /** Cloud cover 0–100%, used to soften sun advice under overcast skies. */
  cloudCoverPct?: number;
  /** Forecast "feels like" for roughly `durationMin` minutes from now. */
  feelsLikeAtEndC?: number;
  /**
   * Shared outing context (see outing-context.ts). Pass it with
   * `...outingEngineFields(outing)` so `situation`/`transportMode` agree.
   * Older callers may omit it; it's then normalized from those two fields.
   * Read only by the gated toddler walking rules (recommend/footwear.ts and
   * recommend/rain-protection.ts): a stated walking/active/mixed movement,
   * the stated ground and (for a note only) the activity.
   */
  outing?: OutingContext;
  /**
   * The parent's saved clothing style and easy-toilet-access choice. Read
   * only by the gated toddler everyday-tops rule (recommend/everyday-tops.ts);
   * nappy use is never read here.
   */
  childPreferences?: Partial<Pick<ChildPreferences, "clothing_style" | "easy_toilet_access">>;
  /**
   * Saved garment details (`details` from resolveEligibleWardrobe). Read only
   * on the gated toddler path: the wool-leggings answer and the stated
   * waterproofing of footwear and rain shells.
   */
  garmentDetails?: ReadonlyMap<WardrobeSlug, Partial<GarmentDetails>>;
  /**
   * T19's exact outing intervals. On the gated 12–35-month walk path only,
   * later covered instants add structured changes and packing while the
   * departure outfit stays "Wear now". Older callers and all other paths are
   * unchanged.
   */
  outingWeather?: OutingWeather;
};

/**
 * The outing a recommendation is made for. A supplied context is used when it
 * matches the engine fields; otherwise (older callers, or a mismatch) it's
 * normalized from `situation` and `transportMode`, which stay authoritative.
 */
export function resolveRecommendOuting(
  input: Pick<RecommendInput, "situation" | "transportMode" | "outing">,
): OutingContext {
  const fromEngine = normalizeOutingContext({
    situation: input.situation,
    transportMode: input.transportMode,
  });
  const o = input.outing;
  if (!o || o.situation !== input.situation) return fromEngine;
  const seat = o.transport && o.transport !== "none" ? o.transport : undefined;
  if (input.situation === "walk" && seat !== input.transportMode) return fromEngine;
  return o;
}

// slug can be a real WardrobeSlug or a synthetic display-only value like "diaper_only"
export type Layer = {
  /** "thermal" is an underlayer worn under the base and bottoms. */
  slot: "thermal" | "base" | "bottom" | "mid" | "outer";
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
  if (transportMode === "carrier") return ["babywearing_cover"];
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
  /**
   * Walking-footwear decision (toddler walking/active/mixed outings only;
   * omitted otherwise so existing outputs are unchanged). The chosen or
   * missing footwear is also in `accessories`, once, after socks.
   */
  footwear?: FootwearNeed;
  /**
   * Wearable rain-protection decision (same toddler walking/active/mixed
   * outings as `footwear`; omitted otherwise). Shells it adds are in
   * `babyClothing` (outer slot), listed in `rainProtection.added`.
   */
  rainProtection?: RainProtectionNeed;
  /**
   * Toddler walking/active/mixed outings with a stroller or carrier only
   * (omitted otherwise): worn clothing is chosen for walking without the
   * ride's warmth offset; transport extras stay for riding.
   */
  walkingWarmth?: WalkingWarmthPhases;
  /** Later covered-weather changes and packing; never merged into Wear now. */
  outingPreparation?: OutingPreparation;
};

export function recommend(input: RecommendInput): Recommendation {
  if (input.situation !== "walk" || !input.outingWeather || !toddlerRulesApply(input.ageMonths))
    return recommendAtInstant(input);

  const weather = input.outingWeather;
  // T20 supersedes the legacy endpoint-only note on this gated path. Every
  // covered interval is assessed instead; infant and switch-off notes remain.
  const departureInput = { ...input, feelsLikeAtEndC: undefined };
  const departure = recommendAtInstant(departureInput);
  return {
    ...departure,
    outingPreparation: buildOutingPreparation(
      departureInput,
      weather,
      departure,
      recommendAtInstant,
    ),
  };
}

function recommendAtInstant(input: RecommendInput): Recommendation {
  const tops = everydayTopRules({
    ageMonths: input.ageMonths,
    preferences: input.childPreferences,
    // Sleepwear has its own later ticket.
    sleeping: input.situation === "home" && (input.homeActivity ?? "playing") === "sleeping",
  });
  if (input.situation === "home") {
    const home = pickHome({
      roomTempC: input.roomTempC ?? 21,
      homeActivity: input.homeActivity ?? "playing",
      ageMonths: input.ageMonths ?? null,
      owned: input.owned,
    });
    const mapped = mapWardrobe(
      home.layers,
      home.accessories,
      input.owned,
      false,
      tops,
      input.garmentDetails,
    );
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
    outing: resolveRecommendOuting(input),
  };
  // Toddler walking footwear / rain / walking warmth share one gate.
  const walkingMovement = walkingFootwearApplies({
    situation: input.situation,
    ageMonths: input.ageMonths,
    outing: ctx.outing,
  });
  const ride = walkingMovement ? rideTransport(ctx.outing) : null;
  const walkingRide =
    walkingMovement && ride ? pickWalkingWithRide(ctx, walkingMovement, ride) : null;
  const out = walkingRide ? walkingRide.pick : pickOutdoor(ctx);
  const mapped = mapWardrobe(
    out.layers,
    out.accessories,
    input.owned,
    input.situation === "car",
    tops,
    input.garmentDetails,
  );

  // Toddler walking footwear: its own role beside socks, one item at most.
  const footwear = walkingMovement
    ? selectWalkingFootwear({
        movement: walkingMovement,
        ground: ctx.outing?.ground,
        owned: input.owned,
        setAside: input.setAside,
        details: input.garmentDetails,
      })
    : null;
  // Toddler wearable rain protection: shells only added over the outfit,
  // never replacing an insulating layer or bottoms (recommend/rain-protection.ts).
  const rainProtection = walkingMovement
    ? selectRainProtection({
        movement: walkingMovement,
        isRaining: input.isRaining,
        outing: ctx.outing,
        outfit: mapped.babyClothing,
        outfitMissing: mapped.missing,
        owned: input.owned,
        setAside: input.setAside,
        details: input.garmentDetails,
        transportExtras: out.extras.map((e) => e.slug).filter((s) => input.owned.has(s)),
      })
    : null;
  if (rainProtection && rainProtection.added.length) {
    // `missing` lists clothing before accessories (as mapWardrobe builds it).
    const clothing = new Set<string>(mapped.babyClothing.map((l) => l.slug));
    const clothingMissing = mapped.missing.filter((s) => clothing.has(s));
    const accessoryMissing = mapped.missing.filter((s) => !clothing.has(s));
    for (const slug of rainProtection.added) {
      mapped.babyClothing.push({ slot: "outer", slug, label: LABEL_BY_SLUG[slug] });
      if (!input.owned.has(slug)) clothingMissing.push(slug);
    }
    mapped.missing = [...clothingMissing, ...accessoryMissing];
  }

  if (footwear) {
    const slug = footwear.selected ?? footwear.missingSlug;
    if (slug) {
      mapped.accessories.push({ slug, label: LABEL_BY_SLUG[slug] });
      if (!footwear.selected) mapped.missing.push(slug);
    }
  }

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
  const notes = [...out.notes, ...(rainProtection?.notes ?? []), ...(footwear?.notes ?? [])];
  if (input.situation === "walk") {
    if (missingExtras.has("footmuff"))
      notes.push(
        extraItemTip(
          "footmuff",
          "footmuff",
          "No footmuff in your wardrobe — consider one for cold stroller walks.",
          input.setAside,
        ),
      );
    if (missingExtras.has("rain_cover") && input.isRaining)
      notes.push(
        extraItemTip(
          "rain_cover",
          "rain cover",
          "No rain cover in your wardrobe — consider one to keep baby dry.",
          input.setAside,
        ),
      );
    if (usedExtras.has("rain_cover"))
      notes.push(
        "Rain cover makes the stroller warmer and reduces airflow. Check baby's neck or chest regularly.",
      );
  }

  const reason = walkingRide
    ? `Feels like ${Math.round(input.feelsLikeC)}°C. Clothing is chosen for walking (${Math.round(out.effectiveC)}°C with preference and context); the ${ride === "carrier" ? "carrier" : ride === "pram" ? "pram" : "stroller"} and its extras don't make it lighter.`
    : buildReason(input, out.effectiveC, usedExtras);

  // Everything else that fits this trip: shown as quiet, optional choices so a
  // parent can build any outfit in Layer up, not only the recommended one.
  const shown = new Set<WardrobeSlug>([...usedExtras, ...missingExtras]);
  const optionalTransportExtras: OptionalAccessory[] = transportExtraCandidates(
    input.situation,
    input.transportMode,
  )
    .filter((slug) => !shown.has(slug))
    .map((slug) => ({
      slug,
      label: TRANSPORT_EXTRA_LABELS[slug] ?? slug,
      owned: input.owned.has(slug),
    }));

  return {
    babyClothing: mapped.babyClothing,
    accessories: mapped.accessories,
    sleepAccessories: [],
    transportExtras,
    optionalTransportExtras,
    missingHelpfulItems,
    missing: mapped.missing,
    reason,
    notes,
    safetyAdvice: out.safetyAdvice,
    effectiveTempC: out.effectiveC,
    ...(footwear ? { footwear } : {}),
    ...(rainProtection ? { rainProtection } : {}),
    ...(walkingRide ? { walkingWarmth: walkingRide.phases } : {}),
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
