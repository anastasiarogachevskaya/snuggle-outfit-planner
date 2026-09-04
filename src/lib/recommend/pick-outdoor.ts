import { TEMP, ageAdjustmentC, ageGroup, bandFor } from "./temperature";
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

  // Preference (1 warm .. 5 cold)
  eff -= (ctx.tempPref - 3) * 1.5;

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
      return { base: "long_sleeve", bottom: "pants", mid: "none", outer: "none" };
    case "cool":
      return { base: "long_sleeve", bottom: "pants", mid: "sweater", outer: "none" };
    case "cold":
      return { base: "long_sleeve", bottom: "leggings", mid: "fleece", outer: "none" };
    case "frost":
      return { base: "long_sleeve", bottom: "leggings", mid: "fleece", outer: "winter_overall" };
    case "freezing":
      return { base: "long_sleeve", bottom: "leggings", mid: "fleece", outer: "winter_overall" };
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
      if (ctx.isRaining) extras.push({ slug: "rain_cover", label: "Rain cover", ownedRequired: true });
      if (effectiveC < TEMP.COOL) extras.push({ slug: "footmuff", label: "Footmuff", ownedRequired: true });
      else if (effectiveC < TEMP.MILD)
        extras.push({ slug: "blanket", label: "Blanket", ownedRequired: true });
    } else if (ctx.transportMode === "carrier") {
      if (effectiveC < TEMP.COLD)
        extras.push({ slug: "babywearing_cover", label: "Babywearing cover", ownedRequired: true });
      else if (effectiveC < TEMP.COOL)
        extras.push({ slug: "blanket", label: "Blanket", ownedRequired: true });
    }
  }

  if (ctx.situation === "car" && (ctx.durationMin ?? 0) >= 30 && effectiveC < TEMP.MILD) {
    extras.push({
      slug: "blanket",
      label: "Blanket — remove the winter overall in the car seat",
      ownedRequired: true,
    });
  }

  return { extras, notes };
}

function buildNotes(ctx: OutdoorContext, effectiveC: number): string[] {
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
        long ? "Long cold walk — outfit adjusted a bit warmer." : "Cool weather — outfit adjusted slightly warmer.",
      );
  }
  return notes;
}

function buildSafety(ctx: OutdoorContext): string[] {
  const advice: string[] = [];
  if (ctx.situation !== "walk") return advice;
  const uv = ctx.uvIndex;
  const warmEnough = ctx.feelsLikeC >= TEMP.HOT || (uv !== undefined && uv >= 3);
  if (warmEnough) {
    if (ctx.ageMonths !== null && ctx.ageMonths !== undefined && ctx.ageMonths < 6) {
      advice.push("☀️ Keep baby in the shade whenever possible.");
      advice.push("☀️ Avoid direct sunlight.");
      advice.push("☀️ Dress baby in lightweight clothing and always use a sun hat if available.");
    } else {
      advice.push(
        "☀️ Use a sun hat, seek shade whenever possible, and apply broad-spectrum SPF 30+ to exposed skin before going outside.",
      );
      advice.push("☀️ Reapply sunscreen per product instructions, especially after sweating or getting wet.");
    }
  }
  if (uv !== undefined) {
    if (uv >= 8) advice.push("☀️ Very strong UV today. Minimize direct sun exposure.");
    else if (uv >= 6) advice.push("☀️ Strong sun today. Keep baby in the shade when possible.");
    else if (uv >= 3) advice.push("☀️ Sun protection is recommended.");
  }
  return advice;
}

export function pickOutdoor(ctx: OutdoorContext): OutdoorPick {
  const effectiveC = computeEffectiveTemp(ctx);
  const layers = pickLayers(effectiveC);
  const accessories = pickAccessories(effectiveC, ctx);
  const { extras } = pickExtras(effectiveC, ctx);
  const notes = buildNotes(ctx, effectiveC);
  const safetyAdvice = buildSafety(ctx);
  return { effectiveC, layers, accessories, extras, notes, safetyAdvice };
}
