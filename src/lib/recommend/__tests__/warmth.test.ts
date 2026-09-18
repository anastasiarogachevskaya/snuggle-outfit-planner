// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import {
  outfitClo,
  idealOutfitFrom,
  compareOutfits,
  verdictFor,
  VERDICT_TOLERANCE,
  CLO_BY_SLUG,
  EMPTY_OUTFIT,
  MID_SLUGS,
  OUTER_SLUGS,
  type ActualOutfit,
} from "../warmth";
import { recommend } from "../../recommend";
import type { WardrobeSlug } from "../../wardrobe-catalog";

function owned(): Set<WardrobeSlug> {
  return new Set<WardrobeSlug>([
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
    "cotton_socks",
    "wool_socks",
    "mittens",
    "snow_pants",
    "footmuff",
  ]);
}

describe("outfitClo", () => {
  it("sums the clo values of every filled slot", () => {
    const outfit: ActualOutfit = {
      ...EMPTY_OUTFIT,
      bodysuit: "short_sleeve_bodysuit",
      bottom: "pants",
    };
    expect(outfitClo(outfit)).toBeCloseTo(CLO_BY_SLUG.short_sleeve_bodysuit! + CLO_BY_SLUG.pants!);
  });

  it("counts a bodysuit worn under a sleepsuit as two slots, not a conflict", () => {
    const outfit: ActualOutfit = {
      ...EMPTY_OUTFIT,
      bodysuit: "short_sleeve_bodysuit",
      sleepsuit: "pajamas",
    };
    expect(outfitClo(outfit)).toBeCloseTo(
      CLO_BY_SLUG.short_sleeve_bodysuit! + CLO_BY_SLUG.pajamas!,
    );
  });

  it("adds snow pants and mittens as independent add-ons", () => {
    const outfit: ActualOutfit = { ...EMPTY_OUTFIT, snowPants: true, mittens: true };
    expect(outfitClo(outfit)).toBeCloseTo(CLO_BY_SLUG.snow_pants! + CLO_BY_SLUG.mittens!);
  });

  it("is 0 for a fully empty outfit", () => {
    expect(outfitClo(EMPTY_OUTFIT)).toBe(0);
  });
});

describe("idealOutfitFrom", () => {
  it("reconstructs the slotted shape from what recommend() picked", () => {
    const rec = recommend({
      feelsLikeC: 21,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    const ideal = idealOutfitFrom(rec);
    // Whatever recommend() picked for base/bottom should show up as the
    // matching slot rather than being dropped.
    const baseSlug = rec.babyClothing.find((l) => l.slot === "base")?.slug;
    if (baseSlug && baseSlug !== "diaper_only") {
      expect([ideal.bodysuit, ideal.sleepsuit]).toContain(baseSlug);
    }
    const bottomSlug = rec.babyClothing.find((l) => l.slot === "bottom")?.slug;
    if (bottomSlug) expect(ideal.bottom).toBe(bottomSlug);
  });

  it("puts a fleece/wool overall picked as the mid-layer substitute in a slot the picker actually offers it in", () => {
    // On a frosty day, map-wardrobe.ts's MID_MAP.fleece will use an owned
    // fleece_overall as a stand-in for a plain fleece top when no such top
    // exists, and pushes it with slot: "mid" — never slot: "outer". If
    // warmth.ts's own MID_SLUGS/OUTER_SLUGS classification disagreed with
    // that, the picker would offer this exact garment only under "Outer
    // layer", so "Mid layer" would demand an item nobody could ever select.
    const noOtherMidOptions = new Set<WardrobeSlug>([
      "long_sleeve_bodysuit",
      "pants",
      "fleece_overall",
      "winter_overall",
      "warm_hat",
      "wool_socks",
    ]);
    const rec = recommend({
      feelsLikeC: 2,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: noOtherMidOptions,
    })!;
    const midLayer = rec.babyClothing.find((l) => l.slot === "mid");
    expect(midLayer?.slug).toBe("fleece_overall");

    const ideal = idealOutfitFrom(rec);
    expect(ideal.mid).toBe("fleece_overall");
    expect(MID_SLUGS).toContain("fleece_overall");
    expect(OUTER_SLUGS).not.toContain("fleece_overall");
  });

  it("carries over owned transport extras recommend() calls for (e.g. a footmuff on a cold pram walk)", () => {
    const rec = recommend({
      feelsLikeC: -2,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    expect(rec.transportExtras.some((e) => e.slug === "footmuff")).toBe(true);
    const ideal = idealOutfitFrom(rec);
    expect(ideal.transportExtras).toContain("footmuff");
  });
});

describe("verdictFor", () => {
  it("calls it just right within the tolerance band", () => {
    expect(verdictFor(1.0, 1.0).verdict).toBe("just_right");
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

describe("compareOutfits", () => {
  it("flags a warm bundled-up outfit as too warm on a hot day, and says what to remove", () => {
    const rec = recommend({
      feelsLikeC: 26,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    const actual: ActualOutfit = {
      ...EMPTY_OUTFIT,
      bodysuit: "long_sleeve_bodysuit",
      bottom: "pants",
      outer: "winter_overall",
    };
    const result = compareOutfits(idealOutfitFrom(rec), actual);
    expect(result.verdict).toBe("too_warm");
    expect(result.adjustments.some((a) => a.type === "remove")).toBe(true);
  });

  it("flags a bare outfit as too cold on a freezing day, and says what to add", () => {
    const rec = recommend({
      feelsLikeC: -5,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    const actual: ActualOutfit = {
      ...EMPTY_OUTFIT,
      bodysuit: "short_sleeve_bodysuit",
      bottom: "shorts",
    };
    const result = compareOutfits(idealOutfitFrom(rec), actual);
    expect(result.verdict).toBe("too_cold");
    expect(result.adjustments.some((a) => a.type === "add")).toBe(true);
  });

  it("doesn't flag anything when the actual outfit matches recommend()'s own pick", () => {
    const rec = recommend({
      feelsLikeC: 21,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    const ideal = idealOutfitFrom(rec);
    const result = compareOutfits(ideal, ideal);
    expect(result.verdict).toBe("just_right");
    expect(result.adjustments).toHaveLength(0);
    expect(result.missingTransportExtras).toHaveLength(0);
  });

  it("doesn't suggest swapping to a structurally different but equally warm outfit", () => {
    // A pajama + fleece overall (1.05 clo total) is a totally different
    // shape from a bodysuit + pants + sweater + hat + socks (also 1.05),
    // but both keep baby just as warm — so flagging "remove the pajama,
    // add a bodysuit" next to "Just right for today" would be confusing.
    const ideal: ActualOutfit = {
      ...EMPTY_OUTFIT,
      bodysuit: "long_sleeve_bodysuit",
      bottom: "pants",
      mid: "sweater",
      hat: "warm_hat",
      socks: "cotton_socks",
    };
    const actual: ActualOutfit = {
      ...EMPTY_OUTFIT,
      sleepsuit: "pajamas",
      outer: "fleece_overall",
      hat: "warm_hat",
    };
    expect(outfitClo(ideal)).toBeCloseTo(outfitClo(actual));
    const result = compareOutfits(ideal, actual);
    expect(result.verdict).toBe("just_right");
    expect(result.adjustments).toHaveLength(0);
  });

  it("flags a recommended, owned transport extra (e.g. footmuff) as missing when not marked in use", () => {
    const rec = recommend({
      feelsLikeC: -2,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    const ideal = idealOutfitFrom(rec);
    const actual: ActualOutfit = { ...ideal, transportExtras: [] };
    const result = compareOutfits(ideal, actual);
    expect(result.missingTransportExtras).toContain("footmuff");
  });

  it("doesn't flag a transport extra once the parent marks it as in use", () => {
    const rec = recommend({
      feelsLikeC: -2,
      tempPref: 3,
      situation: "walk",
      transportMode: "pram",
      durationMin: 30,
      owned: owned(),
    })!;
    const ideal = idealOutfitFrom(rec);
    const result = compareOutfits(ideal, ideal);
    expect(result.missingTransportExtras).toHaveLength(0);
  });
});
