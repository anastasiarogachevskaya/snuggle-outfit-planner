// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { mapWardrobe } from "../map-wardrobe";
import { everydayTopRules, type EverydayTopRules } from "../everyday-tops";
import type { AccessoryNeed, BaseKind, BottomKind, LayerNeed } from "../layers";
import { idealOutfitFrom, outfitClo } from "../warmth";
import { recommend, type RecommendInput } from "../../recommend";
import { toddlerSupportEnabled } from "../../feature-flags";
import { clothingNeedsFromRecommendation, layersOn, withClothingNeeds } from "../../clothing-needs";
import { guestWardrobeRows, resolveEligibleWardrobe } from "../../wardrobe-eligibility";
import type { WardrobeSlug } from "../../wardrobe-catalog";

const NO_ACCS: AccessoryNeed = { hat: "none", socks: "none", mittens: false };
const own = (...s: WardrobeSlug[]) => new Set<WardrobeSlug>(s);
const rules = (clothingStyle: EverydayTopRules["clothingStyle"], easyToiletAccess = false) => ({
  clothingStyle,
  easyToiletAccess,
});
const need = (base: BaseKind, bottom: BottomKind): LayerNeed => ({
  base,
  bottom,
  mid: "none",
  outer: "none",
});
function dress(layers: LayerNeed, owned: Set<WardrobeSlug>, r: EverydayTopRules | null) {
  const m = mapWardrobe(layers, NO_ACCS, owned, false, r);
  return { clothing: m.babyClothing.map((l) => l.slug), missing: m.missing };
}

const LONG = need("long_sleeve", "pants");
const BOTH_TOPS = own("long_sleeve_bodysuit", "long_sleeve_top", "pants");

describe("toddler everyday tops: clothing style", () => {
  it("Tops prefers an available top", () => {
    expect(dress(LONG, BOTH_TOPS, rules("tops"))).toEqual({
      clothing: ["long_sleeve_top", "pants"],
      missing: [],
    });
  });

  it("Bodysuits prefers an available bodysuit", () => {
    expect(dress(LONG, BOTH_TOPS, rules("bodysuits")).clothing).toEqual([
      "long_sleeve_bodysuit",
      "pants",
    ]);
  });

  it("Both keeps the existing order (bodysuit first when equally suitable)", () => {
    expect(dress(LONG, BOTH_TOPS, rules("both")).clothing).toEqual([
      "long_sleeve_bodysuit",
      "pants",
    ]);
    // …but a top is used when that's what's owned.
    expect(dress(LONG, own("long_sleeve_top", "pants"), rules("both"))).toEqual({
      clothing: ["long_sleeve_top", "pants"],
      missing: [],
    });
  });

  it("keeps the temperature's sleeve choice: no short sleeves for a long-sleeve day", () => {
    const r = dress(LONG, own("short_sleeve_top", "short_sleeve_bodysuit", "pants"), rules("tops"));
    expect(r.clothing).toEqual(["long_sleeve_top", "pants"]);
    expect(r.missing).toEqual(["long_sleeve_top"]);
  });

  it("a short-sleeve day uses a short-sleeve top", () => {
    expect(
      dress(need("short_sleeve", "shorts"), own("short_sleeve_top", "shorts"), rules("tops"))
        .clothing,
    ).toEqual(["short_sleeve_top", "shorts"]);
  });

  it("a thermal top is never used as an everyday top", () => {
    const r = dress(LONG, own("thermal_top", "pants"), rules("tops"));
    expect(r.clothing).not.toContain("thermal_top");
    expect(r.missing).toEqual(["long_sleeve_top"]);
  });
});

describe("toddler everyday tops: fallback and missing", () => {
  it("preferred top not owned → uses the owned bodysuit, nothing missing", () => {
    expect(dress(LONG, own("long_sleeve_bodysuit", "pants"), rules("tops"))).toEqual({
      clothing: ["long_sleeve_bodysuit", "pants"],
      missing: [],
    });
  });

  it("preferred bodysuit not owned → uses the owned top", () => {
    expect(dress(LONG, own("long_sleeve_top", "pants"), rules("bodysuits"))).toEqual({
      clothing: ["long_sleeve_top", "pants"],
      missing: [],
    });
  });

  it("an outgrown or unavailable top is never picked to satisfy Tops", () => {
    for (const availability of ["outgrown", "temporarily_unavailable"]) {
      const w = resolveEligibleWardrobe(
        [
          { slug: "long_sleeve_top", owned: true, availability },
          { slug: "long_sleeve_bodysuit", owned: true },
          { slug: "pants", owned: true },
        ],
        { availabilityFilter: true },
      );
      expect(dress(LONG, w.eligible, rules("tops"))).toEqual({
        clothing: ["long_sleeve_bodysuit", "pants"],
        missing: [],
      });
    }
  });

  it("no suitable alternative → the preferred garment is reported missing", () => {
    const w = resolveEligibleWardrobe(
      [
        { slug: "long_sleeve_top", owned: true, availability: "outgrown" },
        { slug: "pants", owned: true },
      ],
      { availabilityFilter: true },
    );
    expect(dress(LONG, w.eligible, rules("tops"))).toEqual({
      clothing: ["long_sleeve_top", "pants"],
      missing: ["long_sleeve_top"],
    });
    expect(dress(LONG, own("pants"), rules("bodysuits")).missing).toEqual(["long_sleeve_bodysuit"]);
    expect(dress(LONG, own("pants"), rules("both")).missing).toEqual(["long_sleeve_bodysuit"]);
  });
});

describe("toddler everyday tops: bottoms stay covered", () => {
  it("a top keeps today's bottoms, and missing bottoms stay visible", () => {
    expect(dress(LONG, own("long_sleeve_top"), rules("tops"))).toEqual({
      clothing: ["long_sleeve_top", "pants"],
      missing: ["pants"],
    });
  });

  it("where a bodysuit alone was enough, a top brings shorts", () => {
    const warmRoom = need("short_sleeve", "none");
    expect(dress(warmRoom, own("short_sleeve_top", "shorts"), rules("tops"))).toEqual({
      clothing: ["short_sleeve_top", "shorts"],
      missing: [],
    });
    // A top with no shorts would leave a missing bottom, so the owned
    // bodysuit (complete on its own) is used first.
    expect(
      dress(warmRoom, own("short_sleeve_top", "short_sleeve_bodysuit"), rules("tops")).clothing,
    ).toEqual(["short_sleeve_bodysuit"]);
    // Only a top: the shorts it needs are shown as missing.
    expect(dress(warmRoom, own("short_sleeve_top"), rules("tops"))).toEqual({
      clothing: ["short_sleeve_top", "shorts"],
      missing: ["shorts"],
    });
    // A bodysuit still needs nothing extra.
    expect(dress(warmRoom, own("short_sleeve_bodysuit"), rules("bodysuits")).clothing).toEqual([
      "short_sleeve_bodysuit",
    ]);
  });

  it("a romper never gets a second bottom; a top replaces it only with bottoms owned", () => {
    const hot = need("short_sleeve", "shorts");
    expect(dress(hot, own("romper", "short_sleeve_top"), rules("tops"))).toEqual({
      clothing: ["romper"],
      missing: [],
    });
    expect(dress(hot, own("romper", "short_sleeve_top", "shorts"), rules("tops")).clothing).toEqual(
      ["short_sleeve_top", "shorts"],
    );
    expect(dress(hot, own("romper", "short_sleeve_top", "shorts"), rules("both")).clothing).toEqual(
      ["romper"],
    );
  });
});

describe("toddler everyday tops: easy toilet access", () => {
  it("with Both, favours separates among equally suitable options", () => {
    expect(dress(LONG, BOTH_TOPS, rules("both", true)).clothing).toEqual([
      "long_sleeve_top",
      "pants",
    ]);
    const hot = need("short_sleeve", "shorts");
    expect(
      dress(hot, own("romper", "short_sleeve_top", "shorts"), rules("both", true)).clothing,
    ).toEqual(["short_sleeve_top", "shorts"]);
  });

  it("never overrides an explicit Bodysuits choice", () => {
    expect(dress(LONG, BOTH_TOPS, rules("bodysuits", true)).clothing).toEqual([
      "long_sleeve_bodysuit",
      "pants",
    ]);
  });

  it("doesn't swap an exact sleeve match for a warmer top", () => {
    const veryHot = need("sleeveless", "shorts");
    const owned = own("sleeveless_bodysuit", "short_sleeve_top", "shorts");
    expect(dress(veryHot, owned, rules("both", true)).clothing).toEqual([
      "sleeveless_bodysuit",
      "shorts",
    ]);
    // An explicit Tops choice may use the short-sleeve top, the same stand-in
    // the bodysuit list already allows.
    expect(dress(veryHot, owned, rules("tops")).clothing).toEqual(["short_sleeve_top", "shorts"]);
  });

  it("reads no nappy-use answer and never changes the saved preferences", () => {
    const prefs = Object.freeze({
      clothing_style: "tops" as const,
      easy_toilet_access: true,
      nappy_use: "yes" as const,
    });
    const r = everydayTopRules({ ageMonths: 20, preferences: prefs }, true);
    expect(r).toEqual({ clothingStyle: "tops", easyToiletAccess: true });
    expect(prefs).toEqual({ clothing_style: "tops", easy_toilet_access: true, nappy_use: "yes" });
    const noNappy = everydayTopRules(
      { ageMonths: 20, preferences: { clothing_style: "tops", easy_toilet_access: true } },
      true,
    );
    expect(noNappy).toEqual(r);
  });
});

describe("toddler everyday tops: rollout and age gate", () => {
  it("applies only to 12–35 months with the switch on, and never to sleep", () => {
    const p = { clothing_style: "tops" as const };
    expect(everydayTopRules({ ageMonths: 12, preferences: p }, true)?.clothingStyle).toBe("tops");
    expect(everydayTopRules({ ageMonths: 35, preferences: p }, true)).not.toBeNull();
    expect(everydayTopRules({ ageMonths: 11, preferences: p }, true)).toBeNull();
    expect(everydayTopRules({ ageMonths: 36, preferences: p }, true)).toBeNull();
    expect(everydayTopRules({ ageMonths: null, preferences: p }, true)).toBeNull();
    expect(everydayTopRules({ ageMonths: 20, preferences: p }, false)).toBeNull();
    expect(everydayTopRules({ ageMonths: 20, preferences: p, sleeping: true }, true)).toBeNull();
    expect(everydayTopRules({ ageMonths: 20 }, true)).toEqual({
      clothingStyle: "both",
      easyToiletAccess: false,
    });
  });

  it("Both, with no tops owned, gives exactly the existing outfits", () => {
    const owned = own(
      "sleeveless_bodysuit",
      "short_sleeve_bodysuit",
      "long_sleeve_bodysuit",
      "romper",
      "shorts",
      "pants",
      "jacket",
    );
    const subsets = [owned, own("short_sleeve_bodysuit"), own("romper"), own()];
    for (const base of ["sleeveless", "short_sleeve", "long_sleeve"] as BaseKind[])
      for (const bottom of ["none", "shorts", "pants", "warm_bottoms"] as BottomKind[])
        for (const mid of ["none", "sweater"] as LayerNeed["mid"][])
          for (const set of subsets) {
            const layers = { base, bottom, mid, outer: "none" as const };
            expect(mapWardrobe(layers, NO_ACCS, set, false, rules("both"))).toEqual(
              mapWardrobe(layers, NO_ACCS, set),
            );
          }
  });

  const WALK: Omit<RecommendInput, "owned"> = {
    feelsLikeC: 19,
    tempPref: 3,
    situation: "walk",
    transportMode: "sitting-stroller",
    durationMin: 30,
  };
  const TOPS_WARDROBE = own("long_sleeve_bodysuit", "long_sleeve_top", "pants", "thin_hat");

  it("recommend() follows the rollout switch for a toddler", () => {
    const rec = recommend({
      ...WALK,
      ageMonths: 20,
      owned: TOPS_WARDROBE,
      childPreferences: { clothing_style: "tops" },
    });
    const base = rec.babyClothing.find((l) => l.slot === "base")?.slug;
    expect(base).toBe(toddlerSupportEnabled() ? "long_sleeve_top" : "long_sleeve_bodysuit");
  });

  it("infants and unknown ages ignore clothing preferences in every switch state", () => {
    const prefsList = [
      { clothing_style: "tops" as const, easy_toilet_access: true },
      { clothing_style: "bodysuits" as const },
      {},
    ];
    for (const ageMonths of [2, 8, 11, null])
      for (const feelsLikeC of [-10, 0, 10, 19, 24, 30])
        for (const situation of ["walk", "car"] as const)
          for (const childPreferences of prefsList) {
            const input = { ...WALK, feelsLikeC, situation, ageMonths, owned: TOPS_WARDROBE };
            expect(recommend({ ...input, childPreferences })).toEqual(recommend(input));
          }
    for (const roomTempC of [16, 21, 25, 27, 29])
      for (const homeActivity of ["playing", "sleeping"] as const) {
        const input: RecommendInput = {
          ...WALK,
          situation: "home",
          roomTempC,
          homeActivity,
          ageMonths: 8,
          owned: TOPS_WARDROBE,
        };
        expect(recommend({ ...input, childPreferences: prefsList[0] })).toEqual(recommend(input));
      }
  });

  it("toddler sleep outfits are left to their own ticket", () => {
    const input: RecommendInput = {
      ...WALK,
      situation: "home",
      roomTempC: 25,
      homeActivity: "sleeping",
      ageMonths: 20,
      owned: own("short_sleeve_top", "short_sleeve_bodysuit", "pajamas", "shorts"),
    };
    expect(recommend({ ...input, childPreferences: { clothing_style: "tops" } })).toEqual(
      recommend(input),
    );
  });

  it("phone-kept and signed-in wardrobes give the same toddler outfit", () => {
    const slugs: WardrobeSlug[] = ["long_sleeve_bodysuit", "long_sleeve_top", "pants"];
    const phone = resolveEligibleWardrobe(guestWardrobeRows({ wardrobe: slugs }));
    const signedIn = resolveEligibleWardrobe([
      ...slugs.map((slug) => ({ slug, owned: true, availability: "available" })),
      { slug: "short_sleeve_top", owned: false },
    ]);
    for (const clothing_style of ["tops", "bodysuits", "both"] as const) {
      const base = { ...WALK, ageMonths: 20, childPreferences: { clothing_style } };
      expect(recommend({ ...base, owned: phone.eligible })).toEqual(
        recommend({ ...base, owned: signedIn.eligible }),
      );
    }
  });
});

describe("toddler everyday tops: checker and clothing model", () => {
  const topRec = () => {
    const m = mapWardrobe(LONG, NO_ACCS, BOTH_TOPS, false, rules("tops"));
    const rec = recommend({ ...{ feelsLikeC: 19, tempPref: 3 }, situation: "walk", owned: own() });
    return { ...rec, babyClothing: m.babyClothing, accessories: m.accessories, missing: m.missing };
  };

  it("the outfit checker counts a top in the bodysuit slot with matching warmth", () => {
    const ideal = idealOutfitFrom(topRec());
    expect(ideal.bodysuit).toBe("long_sleeve_top");
    expect(outfitClo(ideal)).toBeCloseTo(
      outfitClo({ ...ideal, bodysuit: "long_sleeve_bodysuit" }),
      6,
    );
  });

  it("a top covers only the upper body; bottoms stay a separate garment", () => {
    const rec = topRec();
    const needs = clothingNeedsFromRecommendation(rec);
    expect(layersOn(needs, "upper_body").map((g) => g.slug)).toEqual(["long_sleeve_top"]);
    expect(layersOn(needs, "lower_body").map((g) => g.slug)).toEqual(["pants"]);
    expect(withClothingNeeds(rec, needs)).toEqual(rec);
  });
});
