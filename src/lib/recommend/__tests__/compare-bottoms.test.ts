// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, test } from "bun:test";
import { recommend } from "../../recommend";
import { applyBottomChoice, compareBottoms, COMPARABLE_BOTTOMS } from "../compare-bottoms";
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

describe("applyBottomChoice", () => {
  test("swaps the bottom layer in the recommendation", () => {
    for (const temp of [19, 13, 3]) {
      const rec = recFor(temp);
      const applied = applyBottomChoice(rec, "wool_leggings", owned);
      const bottoms = applied.babyClothing.filter((l) => l.slot === "bottom");
      expect(bottoms).toHaveLength(1);
      expect(bottoms[0].slug).toBe("wool_leggings");
    }
  });

  test("applies the same changes the comparison promised", () => {
    const rec = recFor(13);
    const option = compareBottoms(rec, owned).options.find((o) => o.slug === "leggings")!;
    const applied = applyBottomChoice(rec, "leggings", owned);
    const slugs = new Set<string>([
      ...applied.babyClothing.map((l) => l.slug),
      ...applied.accessories.map((a) => a.slug),
    ]);
    for (const a of option.adjustments) {
      if (a.type === "add" && a.idealSlug) expect(slugs.has(a.idealSlug)).toBe(true);
      if (a.type === "remove" && a.actualSlug) expect(slugs.has(a.actualSlug)).toBe(false);
    }
  });

  test("leaves the recommendation untouched for today's own pick", () => {
    const rec = recFor(13);
    const recommended = compareBottoms(rec, owned).options.find((o) => o.isRecommended);
    if (!recommended) return;
    expect(applyBottomChoice(rec, recommended.slug, owned)).toBe(rec);
  });

  test("marks an unowned applied bottom as missing", () => {
    const applied = applyBottomChoice(recFor(3), "wool_leggings", owned);
    expect(applied.missing).toContain("wool_leggings");
  });
});
