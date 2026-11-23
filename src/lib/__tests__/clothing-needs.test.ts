// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import {
  BODY_AREAS,
  clothingNeedsFromRecommendation,
  describeWorn,
  isTransportEquipment,
  layersOn,
  wornProfile,
  withClothingNeeds,
  type ClothingNeeds,
} from "../clothing-needs";
import { recommend, type RecommendInput, type Recommendation } from "../recommend";
import { ALL_WARDROBE_STEPS, type WardrobeSlug } from "../wardrobe-catalog";
import { resolveEligibleWardrobe, type WardrobeItemRow } from "../wardrobe-eligibility";

const ALL_SLUGS = ALL_WARDROBE_STEPS.flatMap((s) => s.items.map((i) => i.slug));
const rows = (...slugs: WardrobeSlug[]): WardrobeItemRow[] =>
  slugs.map((slug) => ({ slug, owned: true }));
const worn = (slug: WardrobeSlug) =>
  describeWorn({ slug, label: slug }, "owned", { list: "babyClothing", slot: "bottom" });

describe("clothing-needs model", () => {
  it("classifies every catalogue item; only transport-step items are equipment", () => {
    for (const step of ALL_WARDROBE_STEPS)
      for (const item of step.items) {
        expect(isTransportEquipment(item.slug)).toBe(step.id === "transport");
        if (step.id !== "transport") expect(wornProfile(item.slug)).not.toBeNull();
      }
  });

  it("stacks thermal bottoms, everyday pants and rain pants on the lower body", () => {
    const needs: ClothingNeeds = {
      worn: [worn("rain_pants"), worn("pants"), worn("thermal_bottom")],
      transport: [],
    };
    const lower = layersOn(needs, "lower_body");
    expect(lower.map((g) => [g.slug, g.role])).toEqual([
      ["thermal_bottom", "thermal"],
      ["pants", "everyday"],
      ["rain_pants", "outerwear"],
    ]);
    expect(layersOn(needs, "upper_body")).toEqual([]);
  });

  it("keeps socks and footwear as separate roles on the feet", () => {
    const needs: ClothingNeeds = {
      worn: [worn("winter_boots"), worn("wool_socks")],
      transport: [],
    };
    expect(layersOn(needs, "feet").map((g) => [g.slug, g.role])).toEqual([
      ["wool_socks", "socks"],
      ["winter_boots", "footwear"],
    ]);
  });

  it("represents a one-piece once, with every area it covers", () => {
    const romper = worn("romper");
    const needs: ClothingNeeds = { worn: [romper], transport: [] };
    expect(romper.coverage).toEqual(["upper_body", "lower_body"]);
    expect(layersOn(needs, "upper_body")[0]).toBe(romper);
    expect(layersOn(needs, "lower_body")[0]).toBe(romper);
    const distinct = new Set(BODY_AREAS.flatMap((a) => layersOn(needs, a)));
    expect(distinct.size).toBe(1);
    expect(needs.worn.length).toBe(1);
  });

  it("keeps unknown protection unknown, including legacy Rain / snow pants", () => {
    const w = resolveEligibleWardrobe(rows("snow_pants", "jacket", "rain_pants", "winter_overall"));
    for (const slug of ["snow_pants", "jacket", "rain_pants", "winter_overall"] as const) {
      const g = describeWorn({ slug, label: slug }, "owned", { list: "babyClothing", slot: "outer" }, w);
      expect(g.protection).toEqual({ insulation: "unknown", waterproof: "unknown" });
    }
  });

  it("carries only parent-stated protection and keeps coverage separate from it", () => {
    const w = resolveEligibleWardrobe([
      { slug: "jacket", owned: true, insulation: "insulated", waterproof: "no" },
      { slug: "snow_pants", owned: true, waterproof: "yes" },
    ]);
    const jacket = describeWorn({ slug: "jacket", label: "Jacket" }, "owned", { list: "babyClothing", slot: "outer" }, w);
    const pants = describeWorn({ slug: "snow_pants", label: "Rain / snow pants" }, "owned", { list: "babyClothing", slot: "outer" }, w);
    expect(jacket.protection).toEqual({ insulation: "insulated", waterproof: "no" });
    expect(pants.protection).toEqual({ insulation: "unknown", waterproof: "yes" });
    expect(pants.coverage).toEqual(["lower_body"]);
  });

  it("refines coverage and role only from stated details", () => {
    expect(wornProfile("pajamas")?.coverage).toEqual(["upper_body", "lower_body"]);
    expect(wornProfile("pajamas", { foot_coverage: "footed" })?.coverage).toContain("feet");
    expect(wornProfile("wool_leggings")?.role).toBe("everyday");
    expect(wornProfile("wool_leggings", { leggings_use: "thermal_base" })?.role).toBe("thermal");
  });

  it("refuses to describe transport equipment as worn clothing", () => {
    expect(() =>
      describeWorn({ slug: "footmuff", label: "Footmuff" }, "owned", { list: "accessories" }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Compatibility path
// ---------------------------------------------------------------------------

const INFANT: WardrobeSlug[] = [
  "short_sleeve_bodysuit", "long_sleeve_bodysuit", "pants", "sweater", "cotton_socks",
  "thin_hat", "warm_hat", "mittens", "fleece_overall", "winter_overall", "stroller",
  "blanket", "footmuff", "rain_cover", "babywearing_cover", "car_seat_blanket", "pajamas",
];
const TWO_PIECE: WardrobeSlug[] = [
  "long_sleeve_top", "thermal_top", "thermal_bottom", "wool_leggings", "leggings", "jacket",
  "snow_pants", "rain_pants", "waterproof_jacket", "warm_hat", "wool_socks", "winter_boots",
  "romper", "sleep_sack_10", "baby_carrier", "car_seat_blanket",
];
const WARDROBES: Record<string, WardrobeItemRow[]> = {
  empty: [],
  infant: rows(...INFANT),
  everything: rows(...ALL_SLUGS),
  twoPiece: rows(...TWO_PIECE),
  setAside: [
    ...rows(...INFANT.filter((s) => s !== "winter_overall" && s !== "footmuff")),
    { slug: "winter_overall", owned: true, availability: "outgrown", insulation: "insulated" },
    { slug: "footmuff", owned: true, availability: "temporarily_unavailable" },
    { slug: "rain_cover", owned: false },
  ],
};

function cases(): { name: string; input: RecommendInput; wardrobe: ReturnType<typeof resolveEligibleWardrobe> }[] {
  const out: ReturnType<typeof cases> = [];
  for (const [wName, wRows] of Object.entries(WARDROBES))
    for (const availabilityFilter of [false, true]) {
      const wardrobe = resolveEligibleWardrobe(wRows, { availabilityFilter });
      const base = { tempPref: 3, owned: wardrobe.eligible, setAside: wardrobe.setAside };
      for (const ageMonths of [null, 2, 8, 18])
        for (const feelsLikeC of [-15, -5, 2, 8, 12, 18, 24, 30]) {
          for (const [situation, transportMode] of [
            ["walk", "pram"], ["walk", "sitting-stroller"], ["walk", "carrier"],
            ["walk", undefined], ["car", undefined],
          ] as const)
            for (const isRaining of [false, true])
              out.push({
                name: `${wName}/${availabilityFilter}/${ageMonths}/${feelsLikeC}/${situation}/${transportMode}/${isRaining}`,
                input: {
                  ...base, ageMonths, feelsLikeC, situation, isRaining, durationMin: 45,
                  ...(transportMode ? { transportMode } : {}),
                },
                wardrobe,
              });
          for (const homeActivity of ["playing", "sleeping"] as const)
            out.push({
              name: `${wName}/${availabilityFilter}/${ageMonths}/home/${homeActivity}/${feelsLikeC}`,
              input: { ...base, ageMonths, feelsLikeC, situation: "home", homeActivity, roomTempC: 14 + (feelsLikeC + 15) / 3 },
              wardrobe,
            });
        }
    }
  return out;
}

describe("clothing-needs compatibility adapter", () => {
  const all = cases();

  it(`round-trips ${all.length} existing recommendations exactly`, () => {
    for (const c of all) {
      const rec = recommend(c.input);
      const back = withClothingNeeds(rec, clothingNeedsFromRecommendation(rec, c.wardrobe));
      if (JSON.stringify(back) !== JSON.stringify(rec)) throw new Error(`mismatch: ${c.name}`);
      expect(back).toEqual(rec);
    }
  });

  it("never lists a worn garment twice or mixes transport into clothing", () => {
    for (const c of all) {
      const needs = clothingNeedsFromRecommendation(recommend(c.input), c.wardrobe);
      const slugs = needs.worn.map((g) => g.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const g of needs.worn) expect(isTransportEquipment(g.slug)).toBe(false);
      for (const t of needs.transport) expect(isTransportEquipment(t.slug)).toBe(true);
    }
  });

  it("keeps every missing item missing and every used item owned", () => {
    for (const c of all) {
      const rec = recommend(c.input);
      const needs = clothingNeedsFromRecommendation(rec, c.wardrobe);
      for (const g of needs.worn) {
        if (g.status === "owned") expect(c.wardrobe.eligible.has(g.slug as WardrobeSlug)).toBe(true);
        if (g.status === "missing") expect(c.wardrobe.eligible.has(g.slug as WardrobeSlug)).toBe(false);
      }
      for (const t of needs.transport)
        expect(t.status === "owned").toBe(c.wardrobe.eligible.has(t.slug));
    }
  });
});

describe("representative recommendations through the compatibility path", () => {
  const pick = (needs: ClothingNeeds, slug: string) => needs.worn.find((g) => g.slug === slug);

  it("two-piece jacket + Rain / snow pants at -5°C: both owned, protection unknown", () => {
    const w = resolveEligibleWardrobe(rows(...TWO_PIECE), { availabilityFilter: true });
    const rec = recommend({
      feelsLikeC: -5, tempPref: 3, ageMonths: 8, situation: "walk", transportMode: "pram",
      owned: w.eligible, setAside: w.setAside,
    });
    const needs = clothingNeedsFromRecommendation(rec, w);
    expect(rec.babyClothing.filter((l) => l.slot === "outer").map((l) => l.slug)).toEqual([
      "jacket",
      "snow_pants",
    ]);
    const pants = pick(needs, "snow_pants");
    expect(pants).toMatchObject({
      role: "outerwear",
      coverage: ["lower_body"],
      status: "owned",
      protection: { insulation: "unknown", waterproof: "unknown" },
    });
    expect(layersOn(needs, "lower_body").map((g) => g.slug)).toContain("snow_pants");
    expect(withClothingNeeds(rec, needs).reason).toBe(rec.reason);
  });

  it("outgrown winter overall stays missing with its reason; footmuff stays transport", () => {
    const w = resolveEligibleWardrobe(WARDROBES.setAside!, { availabilityFilter: true });
    const rec = recommend({
      feelsLikeC: -5, tempPref: 3, ageMonths: 8, situation: "walk", transportMode: "pram",
      owned: w.eligible, setAside: w.setAside,
    });
    const needs = clothingNeedsFromRecommendation(rec, w);
    expect(rec.missing).toContain("winter_overall");
    expect(pick(needs, "winter_overall")).toMatchObject({
      status: "missing",
      setAside: "outgrown",
      protection: { insulation: "unknown", waterproof: "unknown" },
    });
    expect(needs.transport.find((t) => t.slug === "footmuff")).toMatchObject({
      status: "missing",
      setAside: "temporarily_unavailable",
      placement: "missingHelpfulItems",
    });
    const back = withClothingNeeds(rec, needs);
    expect(back.notes).toEqual(rec.notes);
    expect(back.notes.join(" ")).toContain("Your footmuff is marked temporarily unavailable.");
  });

  it("sleep at 19°C keeps the sleep sack as worn clothing, and its suggestion", () => {
    const w = resolveEligibleWardrobe(rows(...INFANT, "sleep_sack_10"));
    const rec = recommend({
      feelsLikeC: 5, tempPref: 3, ageMonths: 8, situation: "home", homeActivity: "sleeping",
      roomTempC: 19, owned: w.eligible,
    });
    const needs = clothingNeedsFromRecommendation(rec, w);
    expect(needs.transport).toEqual([]);
    expect(pick(needs, "sleep_sack_10")).toMatchObject({ role: "sleep_bag", status: "owned" });
    expect(pick(needs, "sleep_sack_25")).toMatchObject({ status: "missing", placement: { list: "missingHelpfulItems" } });
    expect(withClothingNeeds(rec, needs)).toEqual(rec);
  });

  it("diaper-only stays a display marker, not a garment that can be missing", () => {
    const rec: Recommendation = recommend({
      feelsLikeC: 30, tempPref: 3, ageMonths: 8, situation: "home", homeActivity: "playing",
      roomTempC: 28, owned: new Set(),
    });
    const needs = clothingNeedsFromRecommendation(rec);
    const d = pick(needs, "diaper_only");
    expect(d).toMatchObject({ role: "nappy", status: "not_tracked", coverage: [] });
    expect(withClothingNeeds(rec, needs)).toEqual(rec);
  });
});
