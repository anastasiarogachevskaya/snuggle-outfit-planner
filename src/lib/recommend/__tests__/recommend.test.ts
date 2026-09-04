// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import { recommend } from "../../recommend";
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

function slugs(items: { slug: string }[]) {
  return items.map((i) => i.slug);
}

describe("recommendation engine", () => {
  it("summer walk 22°C pram, UV 5 → short-sleeve + shorts + sun hat, no socks/mid", () => {
    const r = recommend({
      feelsLikeC: 22,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      uvIndex: 5,
      ageMonths: 8,
      owned: owned(),
    });
    const clothing = slugs(r.babyClothing);
    const accs = slugs(r.accessories);
    expect(clothing).toContain("short_sleeve_bodysuit");
    expect(clothing).toContain("shorts");
    expect(clothing).not.toContain("sweater");
    expect(clothing).not.toContain("fleece_overall");
    expect(accs).toContain("sun_hat");
    expect(accs).not.toContain("cotton_socks");
    expect(accs).not.toContain("wool_socks");
  });

  it("spring walk 12°C pram → long-sleeve + pants + sweater + thin hat", () => {
    const r = recommend({
      feelsLikeC: 12,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      ageMonths: 8,
      owned: owned(),
    });
    const clothing = slugs(r.babyClothing);
    const accs = slugs(r.accessories);
    expect(clothing).toContain("long_sleeve_bodysuit");
    expect(clothing).toContain("pants");
    expect(clothing).toContain("sweater");
    expect(accs).toContain("thin_hat");
    expect(accs).not.toContain("mittens");
  });

  it("winter walk -5°C pram → base + fleece + winter overall + warm hat + mittens + footmuff", () => {
    const r = recommend({
      feelsLikeC: -5,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      ageMonths: 8,
      owned: owned(),
    });
    const clothing = slugs(r.babyClothing);
    const accs = slugs(r.accessories);
    const extras = slugs(r.transportExtras);
    expect(clothing).toContain("long_sleeve_bodysuit");
    expect(clothing).toContain("fleece_overall");
    expect(clothing).toContain("winter_overall");
    expect(accs).toContain("warm_hat");
    expect(accs).toContain("mittens");
    expect(extras).toContain("footmuff");
  });

  it("home sleeping 21°C → light pajamas + 1.0 TOG sleep sack", () => {
    const r = recommend({
      feelsLikeC: 20,
      tempPref: 3,
      situation: "home",
      homeActivity: "sleeping",
      roomTempC: 21,
      ageMonths: 8,
      owned: owned(),
    });
    const clothing = r.babyClothing;
    const sleep = slugs(r.sleepAccessories);
    expect(clothing[0].label).toMatch(/pajamas/i);
    expect(sleep).toContain("sleep_sack_10");
  });

  it("home sleeping 21°C with only 2.5 TOG owned → lighter base + 2.5 TOG + ideal suggestion", () => {
    const set = new Set<WardrobeSlug>([
      "short_sleeve_bodysuit",
      "long_sleeve_bodysuit",
      "pajamas",
      "sleep_sack_25",
    ]);
    const r = recommend({
      feelsLikeC: 20,
      tempPref: 3,
      situation: "home",
      homeActivity: "sleeping",
      roomTempC: 21,
      ageMonths: 8,
      owned: set,
    });
    expect(slugs(r.sleepAccessories)).toContain("sleep_sack_25");
    expect(r.missingHelpfulItems.map((i) => i.slug)).toContain("sleep_sack_10");
    expect(r.babyClothing[0].slug).toBe("short_sleeve_bodysuit");
  });

  it("home sleeping 17°C with only 1.0 TOG owned → warmer pajamas + 1.0 sack + 2.5 suggested, no socks", () => {
    const set = new Set<WardrobeSlug>([
      "long_sleeve_bodysuit",
      "pajamas",
      "sleep_sack_10",
      "wool_socks",
    ]);
    const r = recommend({
      feelsLikeC: 17,
      tempPref: 3,
      situation: "home",
      homeActivity: "sleeping",
      roomTempC: 17,
      ageMonths: 8,
      owned: set,
    });
    expect(slugs(r.sleepAccessories)).toContain("sleep_sack_10");
    expect(r.missingHelpfulItems.map((i) => i.slug)).toContain("sleep_sack_25");
    expect(slugs(r.accessories)).not.toContain("wool_socks");
    expect(slugs(r.accessories)).not.toContain("cotton_socks");
  });

  it("home playing 21°C → long sleeve, pants, no socks", () => {
    const set = new Set<WardrobeSlug>(["long_sleeve_bodysuit", "pants", "cotton_socks"]);
    const r = recommend({
      feelsLikeC: 21,
      tempPref: 3,
      situation: "home",
      homeActivity: "playing",
      roomTempC: 21,
      ageMonths: 8,
      owned: set,
    });
    expect(r.babyClothing.map((i) => i.slug)).toContain("long_sleeve_bodysuit");
    expect(slugs(r.accessories)).not.toContain("cotton_socks");
  });

  it("walk 19°C is at least as warm as home 21°C — long sleeve + cotton socks", () => {
    const set = new Set<WardrobeSlug>([
      "long_sleeve_bodysuit",
      "short_sleeve_bodysuit",
      "pants",
      "cotton_socks",
      "thin_hat",
    ]);
    const r = recommend({
      feelsLikeC: 19,
      tempPref: 3,
      situation: "walk",
      transportMode: "sitting-stroller",
      durationMin: 45,
      ageMonths: 8,
      owned: set,
    });
    const all = [...r.babyClothing.map((i) => i.slug), ...slugs(r.accessories)];
    expect(all).toContain("long_sleeve_bodysuit");
    expect(all).toContain("cotton_socks");
  });


  it("home sleeping 21°C with no sack owned → pajamas + ideal 1.0 TOG suggested", () => {
    const set = new Set<WardrobeSlug>(["long_sleeve_bodysuit", "pajamas"]);
    const r = recommend({
      feelsLikeC: 20,
      tempPref: 3,
      situation: "home",
      homeActivity: "sleeping",
      roomTempC: 21,
      ageMonths: 8,
      owned: set,
    });
    expect(r.sleepAccessories.length).toBe(0);
    expect(r.missingHelpfulItems.map((i) => i.slug)).toContain("sleep_sack_10");
  });

  it("home sleeping 28°C → no sleep sack, diaper only", () => {
    const r = recommend({
      feelsLikeC: 28,
      tempPref: 3,
      situation: "home",
      homeActivity: "sleeping",
      roomTempC: 28,
      ageMonths: 8,
      owned: owned(),
    });
    expect(r.sleepAccessories.length).toBe(0);
    expect(r.babyClothing[0].slug).toBe("diaper_only");
  });

  it("long 90-min walk at 24°C → adds a heat safety note, no mid layer", () => {
    const r = recommend({
      feelsLikeC: 24,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 90,
      ageMonths: 8,
      owned: owned(),
    });
    const clothing = slugs(r.babyClothing);
    expect(clothing).not.toContain("sweater");
    expect(r.notes.join(" ")).toMatch(/shade|water|warm/i);
  });

  it("carrier at 22°C is not dressed warmer than pram at 22°C", () => {
    const carrier = recommend({
      feelsLikeC: 22,
      tempPref: 3,
      situation: "walk",
      transportMode: "carrier",
      ageMonths: 8,
      owned: owned(),
    });
    const pram = recommend({
      feelsLikeC: 22,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      ageMonths: 8,
      owned: owned(),
    });
    expect(carrier.babyClothing.length).toBeLessThanOrEqual(pram.babyClothing.length);
    expect(slugs(carrier.babyClothing)).not.toContain("sweater");
  });

  it("missing wardrobe items appear in missing list", () => {
    const r = recommend({
      feelsLikeC: -5,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      ageMonths: 8,
      owned: new Set<WardrobeSlug>(["long_sleeve_bodysuit", "leggings"]),
    });
    expect(r.missing.length).toBeGreaterThan(0);
    expect(r.missingHelpfulItems.map((i) => i.slug)).toContain("footmuff");
  });

  it("cold walk: 60+ min dresses baby warmer than 30 or 60 min (not just relabeled)", () => {
    const base = {
      feelsLikeC: 5,
      tempPref: 3 as const,
      situation: "walk" as const,
      transportMode: "pram" as const,
      ageMonths: 8,
      owned: owned(),
    };
    const thirty = recommend({ ...base, durationMin: 30 });
    const sixty = recommend({ ...base, durationMin: 60 });
    const sixtyPlus = recommend({ ...base, durationMin: 90 });
    expect(slugs(thirty.babyClothing)).not.toContain("winter_overall");
    expect(slugs(sixty.babyClothing)).not.toContain("winter_overall");
    expect(slugs(sixtyPlus.babyClothing)).toContain("winter_overall");
  });
});
