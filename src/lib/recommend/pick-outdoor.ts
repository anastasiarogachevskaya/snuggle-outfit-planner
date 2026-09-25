import { TEMP, ageAdjustmentC, ageGroup, ageUnder, bandFor } from "./temperature";
import type { LayerNeed, AccessoryNeed } from "./layers";
import type { Situation, TransportMode } from "../recommend";
import type { WardrobeSlug } from "../wardrobe-catalog";

export type OutdoorContext = {
  feelsLikeC: number;
  tempPref: number; // 1 warm .. 5 cold
  situation: Exclude<Situation, "home">;
  transportMode?: TransportMode;
  isRaining?: boolean;
  durationMin?: number;
  ageMonths?: number | null;
  uvIndex?: number;
  /** Cloud cover 0–100%; heavy cloud suppresses moderate-UV sun advice. */
  cloudCoverPct?: number;
  /** Forecast "feels like" for roughly `durationMin` minutes from now. */
  feelsLikeAtEndC?: number;
};

export type OutdoorPick = {
  effectiveC: number;
  layers: LayerNeed;
  accessories: AccessoryNeed;
  notes: string[];
  safetyAdvice: string[];
  extras: { slug: WardrobeSlug; label: string; ownedRequired: boolean }[];
};

// Compute effective temperature. All modifiers live here so the layer
// picker only depends on a single number + context flags.
export function computeEffectiveTemp(ctx: OutdoorContext): number {
  let eff = ctx.situation === "car" ? ctx.feelsLikeC + 2 : ctx.feelsLikeC;

  // Preference (1 warm .. 5 cold). A missing value would make every
  // comparison below false and silently land on the warmest possible outfit,
  // so fall back to the neutral middle instead.
  const tempPref = Number.isFinite(ctx.tempPref) ? ctx.tempPref : 3;
  eff -= (tempPref - 3) * 1.5;

  // Transport
  if (ctx.situation === "walk") {
    if (ctx.transportMode === "pram") eff += 1;
    if (ctx.transportMode === "sitting-stroller") eff -= 1;
    if (ctx.transportMode === "carrier") {
      // Cap carrier bonus in warm weather — body heat can cause overheating.
      eff += ctx.feelsLikeC >= TEMP.WARM ? 1 : 3;
    }
  }

  // Duration influence — graduated, not a single 60-minute cutoff, so the
  // 30 / 60 / 60+ (90) picker options can actually differ. Only near
  // already-borderline temperatures: on a mild day, walk length doesn't
  // change what to wear.
  if (ctx.situation === "walk" && ctx.durationMin) {
    const shift =
      ctx.durationMin >= 90 ? 2.25 : ctx.durationMin >= 60 ? 1.5 : ctx.durationMin >= 30 ? 0.75 : 0;
    if (eff < TEMP.COOL) eff -= shift; // longer cold walk → dress warmer
    if (eff >= TEMP.HOT) eff += shift; // longer hot walk → dress lighter
  }

  // Age
  eff += ageAdjustmentC(ageGroup(ctx.ageMonths));

  return eff;
}

/**
 * Outside feels cooler than inside at the same reading (wind, shade, stillness
 * in a stroller), so the whole "warm" band (18–21°C) keeps long sleeves and
 * light socks. Short sleeves start once it is genuinely hot (22°C+).
 */
const OUTDOOR_SHORT_SLEEVE_FROM = TEMP.HOT;

function pickLayers(effectiveC: number): LayerNeed {
  const band = bandFor(effectiveC);
  switch (band) {
    case "very_hot":
      return { base: "sleeveless", bottom: "shorts", mid: "none", outer: "none" };
    case "hot":
      return { base: "short_sleeve", bottom: "shorts", mid: "none", outer: "none" };
    case "warm":
      // 18–21°C outdoors → long sleeves, never lighter than the same room temp indoors.
      return { base: "long_sleeve", bottom: "pants", mid: "none", outer: "none" };

    case "mild":
      // 15–17°C outdoors: a baby sitting still in a stroller isn't generating
      // heat the way a walking adult is, so a light mid layer belongs here.
      // Without it, 15–21°C collapsed into one flat 7-degree band.
      return { base: "long_sleeve", bottom: "pants", mid: "sweater", outer: "none" };
    case "cool":
      return { base: "long_sleeve", bottom: "pants", mid: "sweater", outer: "none" };
    case "cold":
      return { base: "long_sleeve", bottom: "warm_bottoms", mid: "fleece", outer: "none" };
    case "frost":
      return { base: "long_sleeve", bottom: "warm_bottoms", mid: "fleece", outer: "winter_overall" };
    case "freezing":
      return { base: "long_sleeve", bottom: "warm_bottoms", mid: "fleece", outer: "winter_overall" };
  }
}

function pickAccessories(effectiveC: number, ctx: OutdoorContext): AccessoryNeed {
  const band = bandFor(effectiveC);
  const uv = ctx.uvIndex ?? 0;

  let hat: AccessoryNeed["hat"] = "none";
  if (ctx.situation === "walk") {
    if (band === "very_hot" || band === "hot") hat = "sun";
    else if (band === "warm") hat = uv >= 3 ? "sun" : "thin";
    else if (band === "mild" || band === "cool") hat = "thin";
    else hat = "warm";
  } else {
    // Car — light coverage only when cold
    if (effectiveC < TEMP.MILD) hat = effectiveC < TEMP.COOL ? "warm" : "thin";
  }

  let socks: AccessoryNeed["socks"] = "none";
  if (effectiveC < TEMP.COOL) socks = "wool";
  else if (effectiveC < OUTDOOR_SHORT_SLEEVE_FROM) socks = "cotton";
  // At 22°C and above → bare feet / no socks outdoors.

  const mittens = effectiveC < TEMP.COLD;

  return { hat, socks, mittens };
}

// Extras (footmuff / blanket / rain cover / carrier cover / car blanket).
// Only kick in when actually useful — never in warm weather.
function pickExtras(effectiveC: number, ctx: OutdoorContext) {
  const extras: OutdoorPick["extras"] = [];
  const notes: string[] = [];

  if (ctx.situation === "walk") {
    const stroller = ctx.transportMode === "pram" || ctx.transportMode === "sitting-stroller";
    if (stroller) {
      if (ctx.isRaining)
        extras.push({ slug: "rain_cover", label: "Rain cover", ownedRequired: true });
      if (effectiveC < TEMP.COOL)
        extras.push({ slug: "footmuff", label: "Footmuff", ownedRequired: true });
      else if (effectiveC < TEMP.MILD)
        extras.push({ slug: "blanket", label: "Blanket", ownedRequired: true });
    } else if (ctx.transportMode === "carrier") {
      if (effectiveC < TEMP.COLD)
        extras.push({ slug: "babywearing_cover", label: "Babywearing cover", ownedRequired: true });
      else if (effectiveC < TEMP.COOL)
        extras.push({ slug: "blanket", label: "Blanket", ownedRequired: true });
    }
  }

  // Not gated on trip length: this blanket replaces the outer layer the car
  // seat can't safely take, so a 10-minute cold drive needs it just as much.
  if (ctx.situation === "car" && effectiveC < TEMP.MILD) {
    extras.push({
      slug: "blanket",
      label: "Blanket — tuck over the harness once baby is buckled",
      ownedRequired: true,
    });
  }

  return { extras, notes };
}

const HAT_LABEL: Record<Exclude<AccessoryNeed["hat"], "none">, string> = {
  sun: "sun hat",
  thin: "thin hat",
  warm: "warm hat",
};

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Compares the outfit picked for right now against the outfit that would be
 * picked for the forecast temperature at the end of the walk, and names
 * only what's actually practical to take off outdoors without a full change
 * of clothes — the outer layer, mittens, and a hat swap. Base/bottom/mid
 * layers and socks are skipped even when they technically differ too: you
 * can't realistically swap a baby's leggings for pants mid-walk.
 */
function buildForecastShiftNote(
  ctx: OutdoorContext,
  layers: LayerNeed,
  accessories: AccessoryNeed,
): string | null {
  if (
    ctx.situation !== "walk" ||
    !ctx.durationMin ||
    ctx.feelsLikeAtEndC === undefined ||
    ctx.feelsLikeAtEndC === ctx.feelsLikeC
  ) {
    return null;
  }

  const laterCtx: OutdoorContext = { ...ctx, feelsLikeC: ctx.feelsLikeAtEndC };
  const laterEffectiveC = computeEffectiveTemp(laterCtx);
  const laterAccessories = pickAccessories(laterEffectiveC, laterCtx);
  const laterOuter = pickLayers(laterEffectiveC).outer;

  // Getting colder is the more dangerous direction, and the fix has to be
  // packed before leaving — you cannot put on a layer you didn't bring.
  if (ctx.feelsLikeAtEndC < ctx.feelsLikeC) {
    return buildCoolingNote(ctx, layers, accessories, laterOuter, laterAccessories);
  }

  const removable: string[] = [];
  if (layers.outer === "winter_overall" && laterOuter === "none") {
    removable.push("winter overall");
  }
  if (accessories.mittens && !laterAccessories.mittens) {
    removable.push("mittens");
  }

  const actions = removable.length ? [`take off the ${joinWithAnd(removable)}`] : [];
  if (accessories.hat !== "none" && laterAccessories.hat === "none") {
    actions.push("leave off the hat");
  } else if (
    accessories.hat !== "none" &&
    laterAccessories.hat !== "none" &&
    accessories.hat !== laterAccessories.hat
  ) {
    actions.push(`swap to the ${HAT_LABEL[laterAccessories.hat]}`);
  }

  if (actions.length === 0) return null;

  const nowRounded = Math.round(ctx.feelsLikeC);
  const laterRounded = Math.round(ctx.feelsLikeAtEndC);
  return `It's ${nowRounded}°C now but expected to warm up to about ${laterRounded}°C by the time you're back — plan to ${joinWithAnd(actions)} partway through.`;
}

/**
 * Mirror of the warm-up note: names what the later, colder outfit has that
 * the current one doesn't, so it can be packed rather than wished for.
 */
function buildCoolingNote(
  ctx: OutdoorContext,
  layers: LayerNeed,
  accessories: AccessoryNeed,
  laterOuter: LayerNeed["outer"],
  laterAccessories: AccessoryNeed,
): string | null {
  const toBring: string[] = [];
  if (layers.outer === "none" && laterOuter !== "none") {
    toBring.push("an extra outer layer");
  }
  if (!accessories.mittens && laterAccessories.mittens) {
    toBring.push("mittens");
  }
  if (accessories.hat === "none" && laterAccessories.hat !== "none") {
    toBring.push(`a ${HAT_LABEL[laterAccessories.hat]}`);
  } else if (accessories.hat === "thin" && laterAccessories.hat === "warm") {
    toBring.push("a warm hat");
  }

  if (toBring.length === 0) return null;

  const nowRounded = Math.round(ctx.feelsLikeC);
  const laterRounded = Math.round(ctx.feelsLikeAtEndC!);
  return `It's ${nowRounded}°C now but expected to drop to about ${laterRounded}°C by the time you're back — take ${joinWithAnd(toBring)} along.`;
}

function buildNotes(
  ctx: OutdoorContext,
  effectiveC: number,
  layers: LayerNeed,
  accessories: AccessoryNeed,
): string[] {
  const notes: string[] = [];
  if (ctx.situation === "walk" && ctx.transportMode === "carrier") {
    if (ctx.feelsLikeC >= TEMP.WARM)
      notes.push(
        "Carrier adds body heat and can cause overheating in warm weather. Dress baby slightly lighter and check baby's neck or chest regularly.",
      );
    else
      notes.push(
        "Carrier keeps baby warmer because of adult body heat. Check baby's neck or chest during the walk.",
      );
  }
  if (ctx.situation === "walk" && ctx.durationMin && ctx.durationMin >= 30) {
    const long = ctx.durationMin >= 60;
    if (effectiveC >= TEMP.HOT)
      notes.push(
        long
          ? "Long walk in warm weather — take shade breaks and offer water often."
          : "Warm weather — bring water and watch for overheating.",
      );
    else if (effectiveC < TEMP.COOL)
      notes.push(
        long
          ? "Long cold walk — outfit adjusted a bit warmer."
          : "Cool weather — outfit adjusted slightly warmer.",
      );
  }

  const forecastShift = buildForecastShiftNote(ctx, layers, accessories);
  if (forecastShift) notes.push(forecastShift);

  return notes;
}

function buildSafety(ctx: OutdoorContext, effectiveC: number): string[] {
  const advice: string[] = [];

  // Car-seat harness safety. Bulky outerwear compresses in a crash, leaving
  // the harness loose enough for the baby to be thrown from it, so the engine
  // never puts an outer layer under the straps (see pickOutdoor) and says why.
  if (ctx.situation === "car") {
    if (effectiveC < TEMP.MILD) {
      advice.push(
        "🚗 Never buckle a baby into a car seat wearing a winter overall or thick coat — it compresses in a crash and leaves the harness dangerously loose.",
      );
      advice.push(
        "🚗 Dress baby in thin warm layers, tighten the harness, then tuck a coat or blanket over the straps.",
      );
    }
    return advice;
  }

  if (ctx.situation !== "walk") return advice;

  // Under 2 months, a baby generates no body heat of their own outdoors —
  // they're carried or seated, not moving — so the real age-driven risk in
  // cold weather is exposure duration, not clothing weight. See
  // docs/research-outdoor-dressing-by-age.md.
  const veryYoung = ageUnder(ctx.ageMonths, 2);
  if (veryYoung) {
    if (ctx.feelsLikeC < TEMP.FREEZING) {
      advice.push(
        "🥶 Under 2 months and below freezing — skip the outdoor trip if you can, or keep it very brief.",
      );
    } else if (ctx.feelsLikeC < TEMP.COOL) {
      advice.push("🥶 Under 2 months in cold weather — keep outdoor time to about 10–15 minutes.");
    }
  }

  const uv = ctx.uvIndex;
  const cloud = ctx.cloudCoverPct;
  const overcast = cloud !== undefined && cloud >= 70;
  // A moderate UV reading under a thick overcast sky isn't worth a sunscreen
  // card; strong UV (6+) can still burn through broken cloud.
  const sunny = uv !== undefined && (uv >= 6 || (uv >= 4 && !overcast));
  const hot = ctx.feelsLikeC >= TEMP.HOT;
  const infant = ageUnder(ctx.ageMonths, 6);

  // At most two sun lines: what to do, then how strong it is.
  if (hot || sunny) {
    advice.push(
      infant
        ? "☀️ Keep baby in the shade and out of direct sunlight."
        : "☀️ Seek shade where you can, and apply broad-spectrum SPF 30+ to exposed skin.",
    );
    if (hot) {
      advice.push(
        infant
          ? "☀️ Dress baby in lightweight clothing and always use a sun hat if available."
          : "☀️ Use a sun hat to keep the sun off baby's face and neck.",
      );
    } else if (uv !== undefined && uv >= 8) {
      advice.push("☀️ Very strong UV today. Minimize direct sun exposure.");
    } else if (uv !== undefined && uv >= 6) {
      advice.push("☀️ Strong sun today. Keep baby in the shade when possible.");
    } else {
      // Bright winter days hit UV 4+ at freezing temperatures, where "lightweight
      // clothing" would contradict the warm layers the engine just picked.
      advice.push("☀️ Bright but cold — keep the sun off baby's face without losing any layers.");
    }
  }
  return advice;
}

export function pickOutdoor(ctx: OutdoorContext): OutdoorPick {
  const effectiveC = computeEffectiveTemp(ctx);
  const layers = pickLayers(effectiveC);
  const accessories = pickAccessories(effectiveC, ctx);
  const { extras } = pickExtras(effectiveC, ctx);
  const notes = buildNotes(ctx, effectiveC, layers, accessories);
  const safetyAdvice = buildSafety(ctx, effectiveC);

  // A bulky outer layer under a car-seat harness is a crash hazard, so it is
  // stripped here rather than in pickLayers — the temperature-driven pick
  // stays honest, and buildSafety explains the swap.
  if (ctx.situation === "car" && layers.outer !== "none") {
    layers.outer = "none";
  }

  return { effectiveC, layers, accessories, extras, notes, safetyAdvice };
}
