// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { recommend, type Recommendation, type RecommendInput } from "../../recommend";
import { toddlerSupportEnabled } from "../../feature-flags";
import { normalizeOutingContext, outingEngineFields, type OutingInput } from "../../outing-context";
import { resolveEligibleWardrobe, type WardrobeItemRow } from "../../wardrobe-eligibility";
import { clothingNeedsFromRecommendation, withClothingNeeds } from "../../clothing-needs";
import type { WardrobeSlug } from "../../wardrobe-catalog";

// Follows the build's toddler switch like the other toddler suites.
const on = toddlerSupportEnabled();

const ALL: WardrobeSlug[] = [
  "long_sleeve_bodysuit", "pants", "warm_bottoms", "sweater", "fleece", "winter_overall",
  "cotton_socks", "wool_socks", "thin_hat", "warm_hat", "mittens", "everyday_shoes",
  "rain_boots", "winter_boots", "rain_overall", "rain_jacket", "rain_pants",
  "stroller", "footmuff", "blanket", "rain_cover", "carrier", "babywearing_cover",
] as WardrobeSlug[];
const owned = new Set<WardrobeSlug>(ALL);

function run(o: Omit<OutingInput, "situation">, extra: Partial<RecommendInput> = {}) {
  const outing = normalizeOutingContext({ situation: "walk", ...o });
  return recommend({
    feelsLikeC: 8, tempPref: 3, durationMin: 60, ageMonths: 24, owned,
    ...outingEngineFields(outing), outing, ...extra,
  });
}
const worn = (r: Recommendation) => r.babyClothing.map((l) => `${l.slot}:${l.slug}`);
const wornAcc = (r: Recommendation) => r.accessories.map((a) => a.slug);
const TEMPS = [-12, -3, 2, 8, 12, 16, 20, 24];
const RIDES = ["pram", "sitting-stroller", "carrier"] as const;

describe("T16: a ride never lightens walking clothing", () => {
  for (const movement of ["walking", "active", "mixed"] as const)
    for (const t of RIDES)
      it(`${movement} + ${t}: worn clothing matches the no-transport walk at every temperature`, () => {
        for (const feelsLikeC of TEMPS) {
          const none = run({ movement, transportMode: "none" }, { feelsLikeC });
          const ride = run({ movement, transportMode: t }, { feelsLikeC });
          if (on) {
            expect(worn(ride)).toEqual(worn(none));
            expect(wornAcc(ride)).toEqual(wornAcc(none));
            expect(ride.effectiveTempC).toBe(none.effectiveTempC);
            expect(ride.walkingWarmth?.transport).toBe(t);
            expect(ride.walkingWarmth?.wornEffectiveC).toBe(none.effectiveTempC);
          } else expect(ride.walkingWarmth).toBeUndefined();
        }
      });

  it("carrier credit (+3°C) is what used to lighten the walking outfit", () => {
    if (!on) return;
    const r = run({ movement: "walking", transportMode: "carrier" }, { feelsLikeC: 8, durationMin: 15 });
    expect(r.walkingWarmth!.ridingEffectiveC - r.walkingWarmth!.wornEffectiveC).toBe(3);
    expect(r.walkingWarmth!.notJudged).toContain("carried_overheating");
  });
});

describe("T16: mixed outings keep riding extras separate from worn clothing", () => {
  it("mixed + stroller in rain keeps footwear, worn rain gear and riding extras", () => {
    const r = run({ movement: "mixed", transportMode: "sitting-stroller", ground: "wet" }, { feelsLikeC: 12, isRaining: true });
    if (!on) return expect(r.walkingWarmth).toBeUndefined();
    expect(r.footwear?.selected).toBe("rain_boots");
    expect(r.rainProtection?.added.length).toBeGreaterThan(0);
    const extras = r.transportExtras.map((e) => e.slug);
    expect(extras).toContain("rain_cover");
    // Transport extras are never worn clothing.
    for (const s of extras) expect(worn(r).some((w) => w.endsWith(`:${s}`))).toBe(false);
    expect(r.walkingWarmth!.ridingExtras).toEqual(expect.arrayContaining(extras));
    expect(r.notes.join(" ")).toContain("only while riding");
  });

  it("cold mixed stroller walk: footmuff is a riding extra; clothing matches no-transport", () => {
    if (!on) return;
    const none = run({ movement: "mixed", transportMode: "none" }, { feelsLikeC: 2 });
    const r = run({ movement: "mixed", transportMode: "pram" }, { feelsLikeC: 2 });
    expect(r.transportExtras.map((e) => e.slug)).toContain("footmuff");
    expect(worn(r)).toEqual(worn(none));
    expect(r.reason).toContain("don't make it lighter");
    expect(r.reason).not.toContain("outfit is lighter");
  });

  it("clothing-needs adapters still round-trip the result exactly", () => {
    const r = run({ movement: "mixed", transportMode: "carrier" }, { feelsLikeC: -3 });
    expect(withClothingNeeds(r, clothingNeedsFromRecommendation(r))).toEqual(r);
  });
});

describe("T16: unavailable transport equipment changes eligibility only", () => {
  it("setting the footmuff unavailable moves it to missing without changing walking clothing", () => {
    if (!on) return;
    const rows = (avail: string): WardrobeItemRow[] =>
      ALL.map((slug) => ({ slug, owned: true, availability: slug === "footmuff" ? avail : "available" }) as WardrobeItemRow);
    const a = resolveEligibleWardrobe(rows("available"));
    const b = resolveEligibleWardrobe(rows("temporarily_unavailable"));
    const ra = run({ movement: "mixed", transportMode: "pram" }, { feelsLikeC: 2, owned: a.eligible, setAside: a.setAside });
    const rb = run({ movement: "mixed", transportMode: "pram" }, { feelsLikeC: 2, owned: b.eligible, setAside: b.setAside });
    expect(ra.transportExtras.map((e) => e.slug)).toContain("footmuff");
    expect(rb.transportExtras.map((e) => e.slug)).not.toContain("footmuff");
    expect(rb.missingHelpfulItems.map((e) => e.slug)).toContain("footmuff");
    expect(worn(rb)).toEqual(worn(ra));
    expect(wornAcc(rb)).toEqual(wornAcc(ra));
  });
});

describe("T16: unchanged paths", () => {
  const baseline = (o: Omit<OutingInput, "situation">, extra: Partial<RecommendInput> = {}) => {
    const r = run(o, extra);
    expect(r.walkingWarmth).toBeUndefined();
    return r;
  };
  for (const t of RIDES) {
    it(`seated/carried and unstated movement with ${t} keep the ride offset`, () => {
      const seated = baseline({ transportMode: t });
      const legacy = recommend({ feelsLikeC: 8, tempPref: 3, durationMin: 60, ageMonths: 24, owned, situation: "walk", transportMode: t });
      expect(worn(seated)).toEqual(worn(legacy));
      expect(seated.effectiveTempC).toBe(legacy.effectiveTempC);
      baseline({ movement: "seated", transportMode: t });
    });
    it(`infant, over-35-month and unknown-age walking with ${t} keep the ride offset`, () => {
      for (const ageMonths of [8, 11, 36, null]) {
        const r = baseline({ movement: "walking", transportMode: t }, { ageMonths });
        const legacy = recommend({ feelsLikeC: 8, tempPref: 3, durationMin: 60, ageMonths, owned, situation: "walk", transportMode: t });
        expect(r.effectiveTempC).toBe(legacy.effectiveTempC);
        expect(worn(r)).toEqual(worn(legacy));
      }
    });
  }
});
