// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import { recommend, type Recommendation } from "../../recommend";
import type { WardrobeSlug } from "../../wardrobe-catalog";

const FULL_WARDROBE: WardrobeSlug[] = [
  "sleeveless_bodysuit",
  "short_sleeve_bodysuit",
  "long_sleeve_bodysuit",
  "pajamas",
  "pants",
  "leggings",
  "shorts",
  "sweater",
  "fleece_overall",
  "winter_overall",
  "thin_hat",
  "warm_hat",
  "sun_hat",
  "mittens",
  "cotton_socks",
  "wool_socks",
  "sleep_sack_05",
  "sleep_sack_10",
  "sleep_sack_25",
  "sleep_sack_35",
  "swaddle",
  "footmuff",
  "blanket",
  "rain_cover",
  "babywearing_cover",
];

const owned = () => new Set<WardrobeSlug>(FULL_WARDROBE);

const DEGREES = [16, 17, 18, 19, 20, 21, 22];

function homePlaying(tempC: number): Recommendation {
  return recommend({
    feelsLikeC: tempC,
    tempPref: 3,
    situation: "home",
    homeActivity: "playing",
    roomTempC: tempC,
    ageMonths: 8,
    owned: owned(),
  });
}

function homeSleeping(tempC: number): Recommendation {
  return recommend({
    feelsLikeC: tempC,
    tempPref: 3,
    situation: "home",
    homeActivity: "sleeping",
    roomTempC: tempC,
    ageMonths: 8,
    owned: owned(),
  });
}

function walk(tempC: number): Recommendation {
  return recommend({
    feelsLikeC: tempC,
    tempPref: 3,
    situation: "walk",
    transportMode: "pram",
    ageMonths: 8,
    owned: owned(),
  });
}

function allSlugs(r: Recommendation): string[] {
  return [
    ...r.babyClothing.map((i) => i.slug),
    ...r.accessories.map((i) => i.slug),
    ...r.sleepAccessories.map((i) => i.slug),
  ];
}

// Simple comparable warmth score built only from what the engine returns.
function warmthScore(r: Recommendation): number {
  let score = 0;
  for (const layer of r.babyClothing) {
    if (layer.slot === "base") {
      if (layer.slug === "diaper_only") score += 0;
      else if (layer.slug === "sleeveless_bodysuit") score += 0;
      else if (layer.slug === "short_sleeve_bodysuit") score += 1;
      else score += 2; // long sleeve / pajamas
    } else if (layer.slot === "mid" || layer.slot === "outer") {
      score += 1;
    }
  }
  for (const acc of r.accessories) {
    if (acc.slug === "cotton_socks") score += 1;
    else if (acc.slug === "wool_socks") score += 2;
    else if (acc.slug === "thin_hat" || acc.slug === "sun_hat") score += 1;
    else if (acc.slug === "warm_hat") score += 1;
  }
  return score;
}

const hasSocks = (r: Recommendation) =>
  r.accessories.some((a) => a.slug === "cotton_socks" || a.slug === "wool_socks");

describe("16–22°C regression bands", () => {
  it("indoor play needs no socks above 17°C", () => {
    for (const t of [18, 19, 20, 21, 22]) {
      expect({ t, socks: hasSocks(homePlaying(t)) }).toEqual({ t, socks: false });
    }
  });

  it("indoor play at 17°C brings back cotton socks", () => {
    const r = homePlaying(17);
    expect(r.accessories.map((a) => a.slug)).toContain("cotton_socks");
  });

  it("sleep never recommends socks between 16 and 22°C", () => {
    for (const t of DEGREES) {
      expect({ t, socks: hasSocks(homeSleeping(t)) }).toEqual({ t, socks: false });
    }
  });

  it("outdoors is never dressed lighter than indoors at the same temperature", () => {
    for (const t of DEGREES) {
      const w = warmthScore(walk(t));
      const h = warmthScore(homePlaying(t));
      expect({ t, ok: w >= h }).toEqual({ t, ok: true });
    }
  });

  it("warmth decreases smoothly as temperature rises (home)", () => {
    const scores = DEGREES.map((t) => warmthScore(homePlaying(t)));
    for (let i = 1; i < scores.length; i++) {
      const drop = scores[i - 1] - scores[i];
      expect({ t: DEGREES[i], drop, ok: drop >= 0 && drop <= 2 }).toEqual({
        t: DEGREES[i],
        drop,
        ok: true,
      });
    }
  });

  it("warmth decreases smoothly as temperature rises (walk)", () => {
    const scores = DEGREES.map((t) => warmthScore(walk(t)));
    for (let i = 1; i < scores.length; i++) {
      const drop = scores[i - 1] - scores[i];
      expect({ t: DEGREES[i], drop, ok: drop >= 0 && drop <= 2 }).toEqual({
        t: DEGREES[i],
        drop,
        ok: true,
      });
    }
  });

  it("walk 19°C → long sleeve + cotton socks + thin hat", () => {
    const all = allSlugs(walk(19));
    expect(all).toContain("long_sleeve_bodysuit");
    expect(all).toContain("cotton_socks");
    expect(all).toContain("thin_hat");
  });

  it("walk 21°C → short sleeve, no socks", () => {
    const r = walk(21);
    expect(r.babyClothing.map((i) => i.slug)).toContain("short_sleeve_bodysuit");
    expect(hasSocks(r)).toBe(false);
  });

  it("home playing 21°C → long sleeve, no socks", () => {
    const r = homePlaying(21);
    expect(r.babyClothing.map((i) => i.slug)).toContain("long_sleeve_bodysuit");
    expect(hasSocks(r)).toBe(false);
  });

  it("home playing 17°C → sweater + cotton socks", () => {
    const r = homePlaying(17);
    expect(r.babyClothing.map((i) => i.slug)).toContain("sweater");
    expect(r.accessories.map((a) => a.slug)).toContain("cotton_socks");
  });

  it("home sleeping 21°C → 1.0 TOG sack, no socks", () => {
    const r = homeSleeping(21);
    expect(r.sleepAccessories.map((s) => s.slug)).toContain("sleep_sack_10");
    expect(hasSocks(r)).toBe(false);
  });

  it("home sleeping 16°C → 2.5 TOG sack, no socks", () => {
    const r = homeSleeping(16);
    expect(r.sleepAccessories.map((s) => s.slug)).toContain("sleep_sack_25");
    expect(hasSocks(r)).toBe(false);
  });
});
