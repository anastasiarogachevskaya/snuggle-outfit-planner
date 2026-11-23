// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { mapWardrobe } from "../map-wardrobe";
import type { AccessoryNeed, LayerNeed } from "../layers";
import type { EverydayTopRules } from "../everyday-tops";
import { idealOutfitFrom, outfitClo } from "../warmth";
import { recommend, type RecommendInput } from "../../recommend";
import { toddlerSupportEnabled } from "../../feature-flags";
import { clothingNeedsFromRecommendation, layersOn, withClothingNeeds } from "../../clothing-needs";
import type { GarmentDetails } from "../../garment-details";
import {
  guestWardrobeRows,
  missingItemNote,
  resolveEligibleWardrobe,
  type WardrobeItemRow,
} from "../../wardrobe-eligibility";
import type { WardrobeSlug } from "../../wardrobe-catalog";

const NO_ACCS: AccessoryNeed = { hat: "none", socks: "none", mittens: false };
const BOTH: EverydayTopRules = { clothingStyle: "both", easyToiletAccess: false };
const own = (...s: WardrobeSlug[]) => new Set<WardrobeSlug>(s);
type Use = GarmentDetails["leggings_use"];
const leggings = (use: Use) =>
  new Map<WardrobeSlug, Partial<GarmentDetails>>([["wool_leggings", { leggings_use: use }]]);

const COLD: LayerNeed = {
  base: "long_sleeve",
  bottom: "warm_bottoms",
  mid: "fleece",
  outer: "none",
};
const FREEZING_TWO_PIECE: LayerNeed = {
  base: "long_sleeve",
  bottom: "pants",
  mid: "none",
  outer: "winter_overall",
  thermal: { upper: false, lower: true },
};

function dress(
  layers: LayerNeed,
  owned: Set<WardrobeSlug>,
  details: ReadonlyMap<WardrobeSlug, Partial<GarmentDetails>> | null = null,
  rules: EverydayTopRules | null = BOTH,
) {
  const m = mapWardrobe(layers, NO_ACCS, owned, false, rules, details);
  return {
    layers: m.babyClothing.map((l) => `${l.slot}:${l.slug}`),
    missing: m.missing,
    using: m.babyClothing.find((l) => l.slot === "bottom")?.usingLabel,
    raw: m,
  };
}

describe("lower-body roles stay separate", () => {
  it("thermal bottoms + trousers + outer bottoms, none replaced or duplicated", () => {
    const r = dress(
      FREEZING_TWO_PIECE,
      own("thermal_bottom", "long_sleeve_bodysuit", "pants", "jacket", "snow_pants"),
    );
    expect(r.layers).toEqual([
      "thermal:thermal_bottom",
      "base:long_sleeve_bodysuit",
      "bottom:pants",
      "outer:jacket",
      "outer:snow_pants",
    ]);
    expect(r.missing).toEqual([]);
    const slugs = r.raw.babyClothing.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    // Clothing model: three distinct roles on the lower body, inside out.
    const rec = { ...recommend({ feelsLikeC: 0, tempPref: 3, situation: "walk", owned: own() }) };
    const withLayers = { ...rec, babyClothing: r.raw.babyClothing, missing: r.raw.missing };
    const needs = clothingNeedsFromRecommendation(withLayers);
    expect(layersOn(needs, "lower_body").map((g) => [g.slug, g.role])).toEqual([
      ["thermal_bottom", "thermal"],
      ["pants", "everyday"],
      ["snow_pants", "outerwear"],
    ]);
    expect(withClothingNeeds(withLayers, needs)).toEqual(withLayers);

    // Warmth: each garment counted once, the thermal kept out of the bottom slot.
    const ideal = idealOutfitFrom(withLayers);
    expect(ideal.thermal).toEqual(["thermal_bottom"]);
    expect(ideal.bottom).toBe("pants");
    expect(ideal.snowPants).toBe(true);
    expect(outfitClo(ideal)).toBeCloseTo(outfitClo({ ...ideal, thermal: [] }), 6);
  });

  it("a missing thermal need is shown as missing, without dropping the trousers", () => {
    const r = dress(FREEZING_TWO_PIECE, own("long_sleeve_bodysuit", "pants", "winter_overall"));
    expect(r.layers).toEqual([
      "thermal:thermal_bottom",
      "base:long_sleeve_bodysuit",
      "bottom:pants",
      "outer:winter_overall",
    ]);
    expect(r.missing).toEqual(["thermal_bottom"]);
    const up = dress(
      { ...COLD, thermal: { upper: true, lower: false } },
      own("long_sleeve_bodysuit", "pants", "fleece_layer"),
    );
    expect(up.missing).toEqual(["thermal_top"]);
  });

  it("unavailable underlayers show as set aside, and come back when Available", () => {
    for (const availability of ["outgrown", "temporarily_unavailable"] as const) {
      const rows: WardrobeItemRow[] = [
        { slug: "thermal_bottom", owned: true, availability },
        { slug: "long_sleeve_bodysuit", owned: true },
        { slug: "pants", owned: true },
        { slug: "winter_overall", owned: true },
      ];
      const away = resolveEligibleWardrobe(rows, { availabilityFilter: true });
      const r = dress(FREEZING_TWO_PIECE, away.eligible, away.details);
      expect(r.missing).toEqual(["thermal_bottom"]);
      expect(missingItemNote("thermal_bottom", away.setAside)).toBe(
        availability === "outgrown"
          ? "Marked outgrown in your wardrobe"
          : "Marked unavailable in your wardrobe",
      );
      expect(r.layers).toContain("bottom:pants");

      const back = resolveEligibleWardrobe(
        rows.map((x) => (x.slug === "thermal_bottom" ? { ...x, availability: "available" } : x)),
        { availabilityFilter: true },
      );
      expect(dress(FREEZING_TWO_PIECE, back.eligible, back.details).missing).toEqual([]);
    }
  });
});

describe("wool-leggings answer", () => {
  const owned = own("long_sleeve_bodysuit", "wool_leggings", "pants", "fleece_layer");

  it("Not sure keeps the existing warm-bottoms fallback", () => {
    expect(dress(COLD, owned, leggings("unknown")).layers).toContain("bottom:wool_leggings");
    expect(dress(COLD, owned, null).layers).toContain("bottom:wool_leggings");
  });

  it("On their own: still used as everyday bottoms", () => {
    expect(dress(COLD, owned, leggings("standalone")).layers).toContain("bottom:wool_leggings");
  });

  it("Thermal underlayer: not worn alone as the everyday bottoms", () => {
    const r = dress(COLD, owned, leggings("thermal_base"));
    expect(r.layers).toContain("bottom:pants");
    expect(r.layers).not.toContain("bottom:wool_leggings");
    expect(r.using).toBe("Pants");
    // With no other bottoms, the everyday bottoms are missing — the owned
    // leggings are never named as missing or shown as worn alone.
    const only = dress(
      COLD,
      own("long_sleeve_bodysuit", "wool_leggings"),
      leggings("thermal_base"),
    );
    expect(only.layers).toContain("bottom:pants");
    expect(only.missing).toEqual(["pants", "fleece_overall"]);
  });

  it("Thermal underlayer: fills a thermal need, never two roles at once", () => {
    const r = dress(
      FREEZING_TWO_PIECE,
      own("long_sleeve_bodysuit", "wool_leggings", "pants", "winter_overall"),
      leggings("thermal_base"),
    );
    expect(r.layers).toEqual([
      "thermal:wool_leggings",
      "base:long_sleeve_bodysuit",
      "bottom:pants",
      "outer:winter_overall",
    ]);
    // A dedicated thermal bottom comes first.
    const both = dress(
      FREEZING_TWO_PIECE,
      own("thermal_bottom", "long_sleeve_bodysuit", "wool_leggings", "pants", "winter_overall"),
      leggings("thermal_base"),
    );
    expect(both.layers.slice(0, 1)).toEqual(["thermal:thermal_bottom"]);
    expect(both.layers).toContain("bottom:pants");
  });

  it("Not sure: not stacked over a thermal bottom; On their own: may be", () => {
    const set = own(
      "thermal_bottom",
      "long_sleeve_bodysuit",
      "wool_leggings",
      "pants",
      "winter_overall",
    );
    const warm: LayerNeed = { ...FREEZING_TWO_PIECE, bottom: "warm_bottoms" };
    expect(dress(warm, set, leggings("unknown")).layers).toContain("bottom:pants");
    expect(dress(warm, set, leggings("standalone")).layers).toContain("bottom:wool_leggings");
    // Unknown leggings never fill the thermal role.
    expect(
      dress(warm, own("long_sleeve_bodysuit", "wool_leggings", "pants"), leggings("unknown"))
        .layers,
    ).toContain("thermal:thermal_bottom");
  });

  it("infants keep the old behaviour whatever the answer", () => {
    for (const use of ["unknown", "thermal_base", "standalone"] as Use[])
      expect(dress(COLD, owned, leggings(use), null).layers).toContain("bottom:wool_leggings");
  });
});

describe("thermal needs and the live engine", () => {
  const THERMALS: WardrobeSlug[] = ["thermal_top", "thermal_bottom"];
  const BASICS: WardrobeSlug[] = [
    "long_sleeve_bodysuit",
    "long_sleeve_top",
    "pants",
    "wool_leggings",
    "light_merino_layer",
    "fleece_layer",
    "winter_overall",
    "jacket",
    "snow_pants",
    "warm_hat",
    "wool_socks",
    "mittens",
  ];
  const base = (extra: Partial<RecommendInput> = {}): RecommendInput => ({
    feelsLikeC: -5,
    tempPref: 3,
    situation: "walk",
    transportMode: "sitting-stroller",
    durationMin: 30,
    ageMonths: 20,
    owned: own(...BASICS),
    ...extra,
  });

  it("owning thermals alone never adds them to an outfit", () => {
    for (const ageMonths of [8, 20, null])
      for (const feelsLikeC of [-15, -5, 0, 5, 10, 15, 20, 28])
        for (const situation of ["walk", "car"] as const) {
          const without = recommend(base({ ageMonths, feelsLikeC, situation }));
          const withThermals = recommend(
            base({ ageMonths, feelsLikeC, situation, owned: own(...BASICS, ...THERMALS) }),
          );
          expect(withThermals).toEqual(without);
          expect(withThermals.babyClothing.some((l) => l.slot === "thermal")).toBe(false);
        }
  });

  it("keeps the light merino layer as the mid layer", () => {
    const rec = recommend(
      base({
        feelsLikeC: 15,
        owned: own("long_sleeve_bodysuit", "pants", "light_merino_layer", "thermal_top"),
      }),
    );
    expect(rec.babyClothing.find((l) => l.slot === "mid")?.slug).toBe("light_merino_layer");
  });

  it("the wool-leggings answer follows the rollout switch for toddlers only", () => {
    for (const use of ["unknown", "thermal_base", "standalone"] as Use[]) {
      const toddler = recommend(base({ garmentDetails: leggings(use) }));
      const bottom = toddler.babyClothing.find((l) => l.slot === "bottom")?.slug;
      expect(bottom).toBe(
        use === "thermal_base" && toddlerSupportEnabled() ? "pants" : "wool_leggings",
      );
      for (const ageMonths of [8, null]) {
        const infant = base({ ageMonths });
        expect(recommend({ ...infant, garmentDetails: leggings(use) })).toEqual(recommend(infant));
      }
    }
  });

  it("sleep outfits ignore garment details", () => {
    const sleep = base({ situation: "home", homeActivity: "sleeping", roomTempC: 18 });
    expect(recommend({ ...sleep, garmentDetails: leggings("thermal_base") })).toEqual(
      recommend(sleep),
    );
  });

  it("phone-kept and signed-in wardrobes give the same outfit", () => {
    const phone = resolveEligibleWardrobe(
      guestWardrobeRows({
        wardrobe: [...BASICS, ...THERMALS],
        wardrobeDetails: { wool_leggings: { leggings_use: "thermal_base" } },
      }),
    );
    const signedIn = resolveEligibleWardrobe([
      ...[...BASICS, ...THERMALS].map((slug) => ({
        slug,
        owned: true,
        availability: "available",
        leggings_use: slug === "wool_leggings" ? "thermal_base" : "unknown",
      })),
      { slug: "leggings", owned: false },
    ]);
    const a = recommend(base({ owned: phone.eligible, garmentDetails: phone.details }));
    const b = recommend(base({ owned: signedIn.eligible, garmentDetails: signedIn.details }));
    expect(a).toEqual(b);
  });
});
