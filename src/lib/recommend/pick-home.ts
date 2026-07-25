import { TEMP } from "./temperature";
import type { LayerNeed, AccessoryNeed } from "./layers";
import type { HomeActivity } from "../recommend";
import type { WardrobeSlug } from "../wardrobe-catalog";
import { pickSleep } from "./pick-sleep";

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

function suggest(
  slug: WardrobeSlug,
  label: string,
  owned: Set<WardrobeSlug>,
  out: HomePick,
) {
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
    if (roomTempC >= TEMP.VERY_HOT + 1) {
      // 27+
      out.layers.base = "diaper_only";
      out.safetyAdvice.push("🌡️ The room is very warm. Avoid sleep sacks and extra blankets.");
      out.safetyAdvice.push("🌡️ Check baby's neck or chest for signs of overheating.");
      out.reason = `Room is ~${round}°C — very warm for sleep, so no sleep clothing needed.`;
    } else if (roomTempC >= TEMP.HOT + 2) {
      // 24+
      out.layers.base = "short_sleeve";
      out.safetyAdvice.push("🌡️ Warm room — skip the sleep sack or use only a very lightweight one.");
      out.reason = `Room is ~${round}°C — a short-sleeve bodysuit is enough for sleep.`;
    } else if (roomTempC >= TEMP.WARM + 3) {
      // 21+
      out.layers.base = "pajamas_light";
      const newborn = ageMonths !== null && ageMonths < 4;
      if (newborn && owned.has("swaddle")) {
        out.sleepAccessories.push({ slug: "swaddle", label: "Swaddle", owned: true });
      } else {
        suggest("sleep_sack_light", "Light sleep sack", owned, out);
      }
      out.reason = `Room is ~${round}°C — pajamas with a light sleep sack.`;
    } else {
      out.layers.base = "pajamas";
      const newborn = ageMonths !== null && ageMonths < 4;
      if (newborn && owned.has("swaddle")) {
        out.sleepAccessories.push({ slug: "swaddle", label: "Swaddle", owned: true });
      } else if (owned.has("sleep_sack_warm")) {
        out.sleepAccessories.push({ slug: "sleep_sack_warm", label: "Warm sleep sack", owned: true });
      } else if (owned.has("sleep_sack_light")) {
        out.sleepAccessories.push({ slug: "sleep_sack_light", label: "Light sleep sack", owned: true });
        out.notes.push(
          "No warm sleep sack — using a light one; add pajamas underneath if baby feels cool.",
        );
      } else {
        out.missingSleep.push({ slug: "sleep_sack_warm", label: "Warm sleep sack" });
      }
      out.accessories.socks = roomTempC < TEMP.WARM ? "wool" : "cotton";
      out.reason = `Room is ~${round}°C — pajamas and a sleep sack for warmth.`;
    }
    return out;
  }

  // Playing / awake
  if (roomTempC >= TEMP.VERY_HOT + 2) {
    // 28+
    out.layers.base = "diaper_only";
    out.safetyAdvice.push(
      "🌡️ The room is very warm. Keeping baby in only a diaper helps reduce overheating.",
    );
    out.safetyAdvice.push("🌡️ Avoid extra blankets. Check baby's neck/chest for signs of overheating.");
    out.reason = `Room is ~${round}°C — very warm, so reduce layers.`;
  } else if (roomTempC >= TEMP.VERY_HOT) {
    // 26–27
    out.layers.base = "short_sleeve";
    out.safetyAdvice.push("🌡️ Warm room — keep it to a single light layer and skip extra blankets.");
    out.reason = `Room is ~${round}°C — warm, so a single light layer is enough.`;
  } else if (roomTempC >= TEMP.HOT + 2) {
    // 24–25
    out.layers.base = "short_sleeve";
    out.layers.bottom = "shorts";
    out.reason = `Room is ~${round}°C — light clothing only.`;
  } else if (roomTempC >= TEMP.WARM + 2) {
    // 20–23
    out.layers.base = "long_sleeve";
    out.layers.bottom = "pants";
    out.accessories.socks = "cotton";
    out.reason = `Room is ~${round}°C — comfortable for a regular outfit.`;
  } else {
    out.layers.base = "long_sleeve";
    out.layers.bottom = "leggings";
    out.layers.mid = "sweater";
    out.accessories.socks = roomTempC < TEMP.COOL ? "wool" : "cotton";
    out.reason = `Room is ~${round}°C — add a mid layer to keep baby warm.`;
  }
  return out;
}
