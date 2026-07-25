// TOG-based sleep sack recommendation logic.
// Sleep sacks are the primary warmth layer during sleep — clothing underneath
// is adjusted to whichever TOG the parent actually owns, not the other way around.

import type { WardrobeSlug } from "../wardrobe-catalog";
import type { BaseKind, SockKind } from "./layers";

export type TogValue = 0.5 | 1.0 | 2.5 | 3.5;

export type TogItem = { slug: WardrobeSlug; tog: TogValue; label: string };

export const TOG_ITEMS: TogItem[] = [
  { slug: "sleep_sack_05", tog: 0.5, label: "Sleep sack (0.5 TOG)" },
  { slug: "sleep_sack_10", tog: 1.0, label: "Sleep sack (1.0 TOG)" },
  { slug: "sleep_sack_25", tog: 2.5, label: "Sleep sack (2.5 TOG)" },
  { slug: "sleep_sack_35", tog: 3.5, label: "Sleep sack (3.5 TOG)" },
];

export function idealTogFor(roomTempC: number): TogValue | null {
  if (roomTempC >= 27) return null;
  if (roomTempC >= 24) return 0.5;
  if (roomTempC >= 20) return 1.0;
  if (roomTempC >= 16) return 2.5;
  return 3.5;
}

export type SleepPick = {
  chosen: TogItem | null;
  ideal: TogValue | null;
  suggestion: TogItem | null; // ideal-TOG item to show under "Suggested for next time"
  base: BaseKind;
  socks: SockKind;
  explanation: string;
};

export function chooseSleepSack(
  roomTempC: number,
  owned: Set<WardrobeSlug>,
): { chosen: TogItem | null; ideal: TogValue | null; suggestion: TogItem | null } {
  const ideal = idealTogFor(roomTempC);
  if (ideal === null) return { chosen: null, ideal: null, suggestion: null };

  const idealItem = TOG_ITEMS.find((t) => t.tog === ideal)!;
  if (owned.has(idealItem.slug)) {
    return { chosen: idealItem, ideal, suggestion: null };
  }

  const ownedItems = TOG_ITEMS.filter((t) => owned.has(t.slug));
  if (ownedItems.length === 0) {
    return { chosen: null, ideal, suggestion: idealItem };
  }

  // closest TOG; ties → warmer
  let best = ownedItems[0];
  let bestDiff = Math.abs(best.tog - ideal);
  for (const item of ownedItems.slice(1)) {
    const diff = Math.abs(item.tog - ideal);
    if (diff < bestDiff || (diff === bestDiff && item.tog > best.tog)) {
      best = item;
      bestDiff = diff;
    }
  }
  return { chosen: best, ideal, suggestion: idealItem };
}

// Pick base layer + socks based on how the chosen sack compares to the ideal.
function sleepwearFor(
  roomTempC: number,
  chosen: TogItem | null,
  ideal: TogValue | null,
): { base: BaseKind; socks: SockKind } {
  // No sack scenarios
  if (ideal === null) {
    // Very hot room ≥27°C
    return { base: roomTempC >= 28 ? "diaper_only" : "short_sleeve", socks: "none" };
  }

  // No sack owned — dress to room temperature alone
  if (!chosen) {
    if (roomTempC >= 24) return { base: "short_sleeve", socks: "none" };
    if (roomTempC >= 20) return { base: "pajamas_light", socks: "cotton" };
    if (roomTempC >= 16) return { base: "pajamas", socks: "cotton" };
    return { base: "pajamas", socks: "wool" };
  }

  const delta = chosen.tog - ideal; // + = warmer than needed, - = cooler

  // Baseline pajamas for the ideal TOG
  let base: BaseKind;
  let socks: SockKind;
  if (ideal <= 0.5) {
    base = "short_sleeve";
    socks = "none";
  } else if (ideal <= 1.0) {
    base = "pajamas_light";
    socks = "cotton";
  } else if (ideal <= 2.5) {
    base = "pajamas";
    socks = "cotton";
  } else {
    base = "pajamas";
    socks = "wool";
  }

  // Warmer than ideal → step down
  if (delta >= 2) {
    base = "sleeveless";
    socks = "none";
  } else if (delta >= 1) {
    if (base === "pajamas") base = "short_sleeve";
    else if (base === "pajamas_light") base = "short_sleeve";
    else if (base === "short_sleeve") base = "sleeveless";
    socks = "none";
  } else if (delta <= -2) {
    // Much cooler sack than ideal → warmer pajamas + wool socks
    base = "pajamas";
    socks = "wool";
  } else if (delta <= -1) {
    if (base === "short_sleeve") base = "pajamas_light";
    else if (base === "pajamas_light") base = "pajamas";
    if (roomTempC < 18) socks = "wool";
  }

  return { base, socks };
}

function togLabel(t: TogValue): string {
  return `${t.toFixed(1)} TOG`;
}

export function pickSleep(roomTempC: number, owned: Set<WardrobeSlug>): SleepPick {
  const { chosen, ideal, suggestion } = chooseSleepSack(roomTempC, owned);
  const { base, socks } = sleepwearFor(roomTempC, chosen, ideal);

  let explanation: string;
  if (ideal === null) {
    explanation = "Room is very warm — no sleep sack needed.";
  } else if (chosen && chosen.tog === ideal) {
    explanation = `A ${togLabel(ideal)} sleep sack matches this room temperature.`;
  } else if (chosen && chosen.tog > ideal) {
    explanation = `Using your ${togLabel(chosen.tog)} sleep sack, so lighter sleepwear is recommended underneath.`;
  } else if (chosen && chosen.tog < ideal) {
    explanation = `Using your ${togLabel(chosen.tog)} sleep sack — warmer sleepwear underneath compensates for the lower TOG. A ${togLabel(ideal)} sack would be ideal.`;
  } else {
    explanation = `A ${togLabel(ideal)} sleep sack would be ideal for this room temperature.`;
  }

  return { chosen, ideal, suggestion, base, socks, explanation };
}
