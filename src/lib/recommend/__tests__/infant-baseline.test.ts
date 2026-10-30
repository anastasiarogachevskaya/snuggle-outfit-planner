// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { recommend, type RecommendInput } from "../../recommend";
import type { WardrobeSlug } from "../../wardrobe-catalog";

/**
 * Baseline infant outfits recorded before toddler work began (T01). Toddler
 * tickets must not change any of these for an 8-month-old.
 */
const owned = new Set<WardrobeSlug>([
  "short_sleeve_bodysuit",
  "long_sleeve_bodysuit",
  "pants",
  "sweater",
  "cotton_socks",
  "thin_hat",
  "warm_hat",
  "mittens",
  "fleece_overall",
  "winter_overall",
  "stroller",
  "blanket",
  "footmuff",
  "rain_cover",
  "babywearing_cover",
  "car_seat_blanket",
  "pajamas",
]);

function run(extra: Partial<RecommendInput>) {
  const r = recommend({ feelsLikeC: 15, tempPref: 3, ageMonths: 8, owned, ...extra } as RecommendInput);
  return {
    clothing: r.babyClothing.map((l) => l.slug),
    accessories: r.accessories.map((a) => a.slug),
    extras: r.transportExtras.map((a) => a.slug),
  };
}

describe("infant baseline (8 months)", () => {
  it("indoor play at 21°C", () => {
    expect(run({ situation: "home", roomTempC: 21, homeActivity: "playing" })).toEqual({
      clothing: ["long_sleeve_bodysuit", "pants"],
      accessories: [],
      extras: [],
    });
  });

  it("sleep at 19°C", () => {
    expect(run({ situation: "home", roomTempC: 19, homeActivity: "sleeping" }).clothing).toEqual(["pajamas"]);
  });

  it("pram walk at 2°C for 30 min", () => {
    expect(run({ situation: "walk", transportMode: "pram", feelsLikeC: 2, durationMin: 30 })).toEqual({
      clothing: ["long_sleeve_bodysuit", "pants", "winter_overall"],
      accessories: ["warm_hat", "cotton_socks", "mittens"],
      extras: ["footmuff"],
    });
  });

  it("carrier walk at 12°C for 30 min", () => {
    expect(run({ situation: "walk", transportMode: "carrier", feelsLikeC: 12, durationMin: 30 })).toEqual({
      clothing: ["long_sleeve_bodysuit", "pants", "sweater"],
      accessories: ["thin_hat", "cotton_socks"],
      extras: [],
    });
  });

  it("car trip at 4°C for 30 min", () => {
    expect(run({ situation: "car", feelsLikeC: 4, durationMin: 30 })).toEqual({
      clothing: ["long_sleeve_bodysuit", "pants", "fleece_overall"],
      accessories: ["warm_hat", "cotton_socks"],
      extras: ["car_seat_blanket"],
    });
  });
});
