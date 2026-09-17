import { TEMP, ageUnder } from "./temperature";
import type { LayerNeed, AccessoryNeed } from "./layers";
import type { HomeActivity } from "../recommend";
import type { WardrobeSlug } from "../wardrobe-catalog";
import { pickSleep, stepBaseDown, SLEEP_ROOM_TEMP } from "./pick-sleep";

export type HomeContext = {
  roomTempC: number;
  homeActivity: HomeActivity;
  ageMonths: number | null;
  owned: Set<WardrobeSlug>;
};

export type HomePick = {
  effectiveC: number;
  layers: LayerNeed;
  accessories: AccessoryNeed;
  sleepAccessories: { slug: WardrobeSlug; label: string; owned: boolean }[];
  missingSleep: { slug: WardrobeSlug; label: string }[];
  reason: string;
  notes: string[];
  safetyAdvice: string[];
};

function suggest(slug: WardrobeSlug, label: string, owned: Set<WardrobeSlug>, out: HomePick) {
  if (owned.has(slug)) out.sleepAccessories.push({ slug, label, owned: true });
  else out.missingSleep.push({ slug, label });
}

export function pickHome(ctx: HomeContext): HomePick {
  const { roomTempC, homeActivity, ageMonths, owned } = ctx;
  const out: HomePick = {
    effectiveC: roomTempC,
    layers: { base: "long_sleeve", bottom: "none", mid: "none", outer: "none" },
    accessories: { hat: "none", socks: "none", mittens: false },
    sleepAccessories: [],
    missingSleep: [],
    reason: "",
    notes: [],
    safetyAdvice: [],
  };

  const round = Math.round(roomTempC);

  if (homeActivity === "sleeping") {
    // Safety advice tied purely to room temperature
    if (roomTempC >= TEMP.VERY_HOT + 1) {
      out.safetyAdvice.push("🌡️ The room is very warm. Avoid sleep sacks and extra blankets.");
      out.safetyAdvice.push("🌡️ Check baby's neck or chest for signs of overheating.");
    } else if (roomTempC >= TEMP.HOT + 2) {
      out.safetyAdvice.push("🌡️ Warm room — use a low-TOG sleep sack (around 0.5).");
    }

    // 0–6 months is the age range where SIDS risk is highest and overheating
    // is one of its documented risk factors, independent of room temperature
    // — so this is additional to, not a replacement for, the checks above.
    // See docs/research-sleep-dressing-by-age.md.
    if (ageUnder(ageMonths, 6) && roomTempC < TEMP.VERY_HOT + 1) {
      out.safetyAdvice.push(
        "🌡️ Under 6 months is the highest-risk age for overheating during sleep — check baby's neck or chest regularly, even if the room feels comfortable.",
      );
    }

    // Newborns in a swaddle: swaddle replaces the sleep sack entirely. Capped
    // at 3 months, not 4 — babies can start showing signs of rolling as
    // early as 2 months, and a swaddled baby who rolls onto their front can't
    // free their arms to reposition. The cutoff is a default, not a
    // guarantee: swaddling must stop the moment a baby shows any sign of
    // rolling, whatever their age.
    const swaddleEligible = ageUnder(ageMonths, 3);
    if (swaddleEligible && owned.has("swaddle") && roomTempC < SLEEP_ROOM_TEMP.NO_SACK) {
      // Baseline pajamas by room temp, no TOG suggestion — but read off the
      // same boundaries the sleep-sack path uses, so the two agree.
      let swaddleBase: LayerNeed["base"];
      if (roomTempC >= SLEEP_ROOM_TEMP.LIGHTEST) swaddleBase = "short_sleeve";
      else if (roomTempC >= SLEEP_ROOM_TEMP.LIGHT) swaddleBase = "pajamas_light";
      else swaddleBase = "pajamas";
      // Swaddled newborns are exactly who the under-1-month "dress a layer
      // lighter" guidance targets, so this needs the same adjustment as the
      // TOG path below, not a separately-derived base layer.
      const isNewborn = ageUnder(ageMonths, 1);
      out.layers.base = isNewborn ? stepBaseDown(swaddleBase) : swaddleBase;
      out.sleepAccessories.push({ slug: "swaddle", label: "Swaddle", owned: true });
      out.safetyAdvice.push(
        "🚼 Stop swaddling the moment baby shows any sign of rolling over — even before this age.",
      );
      out.reason = `Room is ~${round}°C — swaddle with sleepwear underneath.`;
      return out;
    }

    // TOG-driven sleep pick
    const sleep = pickSleep(roomTempC, owned, ageMonths);
    out.layers.base = sleep.base;
    out.accessories.socks = sleep.socks;

    if (sleep.chosen) {
      out.sleepAccessories.push({
        slug: sleep.chosen.slug,
        label: sleep.chosen.label,
        owned: true,
      });
    }
    if (sleep.suggestion) {
      out.missingSleep.push({ slug: sleep.suggestion.slug, label: sleep.suggestion.label });
    }

    // The explanation already leads the reason line; repeating it as a note
    // printed the same sentence twice on screen.
    out.reason = `Room is ~${round}°C — ${sleep.explanation}`;
    return out;
  }

  // Playing / awake
  if (roomTempC >= TEMP.VERY_HOT + 2) {
    // 28+
    out.layers.base = "diaper_only";
    out.safetyAdvice.push(
      "🌡️ The room is very warm. Keeping baby in only a diaper helps reduce overheating.",
    );
    out.safetyAdvice.push(
      "🌡️ Avoid extra blankets. Check baby's neck/chest for signs of overheating.",
    );
    out.reason = `Room is ~${round}°C — very warm, so reduce layers.`;
  } else if (roomTempC >= TEMP.VERY_HOT) {
    // 26–27
    out.layers.base = "short_sleeve";
    out.safetyAdvice.push(
      "🌡️ Warm room — keep it to a single light layer and skip extra blankets.",
    );
    out.reason = `Room is ~${round}°C — warm, so a single light layer is enough.`;
  } else if (roomTempC >= TEMP.HOT + 2) {
    // 24–25
    out.layers.base = "short_sleeve";
    out.layers.bottom = "shorts";
    out.reason = `Room is ~${round}°C — light clothing only.`;
  } else if (roomTempC >= TEMP.WARM) {
    // 18–23 — most homes; babies are comfortable barefoot here.
    out.layers.base = "long_sleeve";
    out.layers.bottom = "pants";
    out.accessories.socks = "none";
    out.reason = `Room is ~${round}°C — comfortable for a regular outfit, no socks needed.`;
  } else {
    // 17 and below
    out.layers.base = "long_sleeve";
    out.layers.bottom = "leggings";
    out.layers.mid = "sweater";
    out.accessories.socks = roomTempC < TEMP.MILD ? "wool" : "cotton";
    out.reason = `Room is ~${round}°C — add a mid layer and socks to keep baby warm.`;
  }

  return out;
}
