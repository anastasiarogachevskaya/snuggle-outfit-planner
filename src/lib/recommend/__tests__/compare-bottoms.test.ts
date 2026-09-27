// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, test } from "bun:test";
import { recommend } from "../../recommend";
import { compareBottoms, COMPARABLE_BOTTOMS } from "../compare-bottoms";
import type { WardrobeSlug } from "../../wardrobe-catalog";

const owned = new Set<WardrobeSlug>([
  "long_sleeve_bodysuit",
  "pants",
  "leggings",
  "sweater",
  "fleece_layer",
  "thin_hat",
  "warm_hat",
  "cotton_socks",
  "wool_socks",
  "winter_overall",
]);

function recFor(feelsLikeC: number) {
  const rec = recommend({
    feelsLikeC,
    tempPref: 3,
    situation: "walk",
    transportMode: "sitting-stroller",
    durationMin: 30,
    owned,
    ageMonths: 12,
  });
  if (!rec) throw new Error("no recommendation");
  return rec;
}

describe("compareBottoms", () => {
  test("offers thin leggings, pants and wool leggings", () => {
    const { options } = compareBottoms(recFor(13), owned);
    expect(options.map((o) => o.slug)).toEqual(COMPARABLE_BOTTOMS);
  });

  test("warmth rises from thin leggings to pants to wool leggings", () => {
    const { options } = compareBottoms(recFor(13), owned);
    const [thin, pants, wool] = options;
    expect(thin.totalClo).toBeLessThan(pants.totalClo);
    expect(pants.totalClo).toBeLessThan(wool.totalClo);
  });

  test("marks ownership and the recommended choice", () => {
    const { options } = compareBottoms(recFor(13), owned);
    expect(options.filter((o) => o.isRecommended).length).toBeLessThanOrEqual(1);
    expect(options.find((o) => o.slug === "wool_leggings")!.owned).toBe(false);
    expect(options.find((o) => o.slug === "pants")!.owned).toBe(true);
  });

  test("never instructs a change to the bottoms slot itself", () => {
    for (const temp of [19, 13, 3]) {
      const { options } = compareBottoms(recFor(temp), owned);
      for (const o of options) {
        expect(o.adjustments.some((a) => a.slot === "bottom")).toBe(false);
      }
    }
  });

  test("on a cold day thin leggings read lighter than the recommended pick", () => {
    const { options } = compareBottoms(recFor(3), owned);
    const thin = options.find((o) => o.slug === "leggings")!;
    const wool = options.find((o) => o.slug === "wool_leggings")!;
    expect(thin.diff).toBeLessThan(wool.diff);
  });

  test("returns nothing to compare when the outfit has no bottom layer", () => {
    const rec = recommend({
      feelsLikeC: 30,
      tempPref: 3,
      situation: "home",
      roomTempC: 30,
      homeActivity: "sleeping",
      owned,
      ageMonths: 12,
    });
    expect(compareBottoms(rec!, owned).options).toEqual([]);
  });
});
