// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import {
  outfitWarmth,
  recommendedWarmth,
  verdictFor,
  VERDICT_TOLERANCE,
  CLO_BY_SLUG,
} from "../warmth";
import { recommend } from "../../recommend";
import type { WardrobeSlug } from "../../wardrobe-catalog";

function owned(): Set<WardrobeSlug> {
  return new Set<WardrobeSlug>([
    "sleeveless_bodysuit",
    "short_sleeve_bodysuit",
    "long_sleeve_bodysuit",
    "pants",
    "leggings",
    "shorts",
    "sweater",
    "fleece_overall",
    "winter_overall",
    "thin_hat",
    "warm_hat",
    "cotton_socks",
    "wool_socks",
    "mittens",
  ]);
}

describe("outfitWarmth", () => {
  it("sums the clo values of the given slugs", () => {
    expect(outfitWarmth(["short_sleeve_bodysuit", "pants"])).toBeCloseTo(
      CLO_BY_SLUG.short_sleeve_bodysuit! + CLO_BY_SLUG.pants!,
    );
  });

  it("treats an unlisted slug (e.g. a transport-only item) as zero warmth", () => {
    expect(outfitWarmth(["stroller"])).toBe(0);
  });

  it("returns 0 for no items", () => {
    expect(outfitWarmth([])).toBe(0);
  });
});

describe("recommendedWarmth", () => {
  it("sums clothing and accessories but ignores diaper_only", () => {
    const rec = recommend({
      feelsLikeC: 21,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    const expected = [...rec.babyClothing, ...rec.accessories]
      .filter((l) => l.slug !== "diaper_only")
      .reduce((sum, l) => sum + (CLO_BY_SLUG[l.slug as WardrobeSlug] ?? 0), 0);
    expect(recommendedWarmth(rec)).toBeCloseTo(expected);
  });
});

describe("verdictFor", () => {
  it("calls it just right within the tolerance band", () => {
    expect(verdictFor(1.0, 1.0).verdict).toBe("just_right");
    // Just inside the band, not exactly on the boundary — floating-point
    // rounding at the exact tolerance value isn't what this test is about.
    expect(verdictFor(1.0 + VERDICT_TOLERANCE - 0.01, 1.0).verdict).toBe("just_right");
    expect(verdictFor(1.0 - VERDICT_TOLERANCE + 0.01, 1.0).verdict).toBe("just_right");
  });

  it("calls it too warm above the tolerance band", () => {
    const r = verdictFor(1.0 + VERDICT_TOLERANCE + 0.01, 1.0);
    expect(r.verdict).toBe("too_warm");
    expect(r.diff).toBeGreaterThan(0);
  });

  it("calls it too cold below the tolerance band", () => {
    const r = verdictFor(1.0 - VERDICT_TOLERANCE - 0.01, 1.0);
    expect(r.verdict).toBe("too_cold");
    expect(r.diff).toBeLessThan(0);
  });
});

describe("check my outfit, end to end", () => {
  it("a warm walk outfit gets flagged as too warm for a hot day", () => {
    const rec = recommend({
      feelsLikeC: 26,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    // Bundled up for cold weather on a hot day.
    const actual = new Set<WardrobeSlug>(["long_sleeve_bodysuit", "pants", "winter_overall"]);
    const result = verdictFor(outfitWarmth(actual), recommendedWarmth(rec));
    expect(result.verdict).toBe("too_warm");
  });

  it("a bare outfit gets flagged as too cold for a freezing day", () => {
    const rec = recommend({
      feelsLikeC: -5,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    const actual = new Set<WardrobeSlug>(["short_sleeve_bodysuit", "shorts"]);
    const result = verdictFor(outfitWarmth(actual), recommendedWarmth(rec));
    expect(result.verdict).toBe("too_cold");
  });
});
