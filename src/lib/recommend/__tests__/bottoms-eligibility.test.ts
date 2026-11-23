// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { recommend, type RecommendInput, type Recommendation } from "../../recommend";
import { applyBottomChoice, compareBottoms, COMPARABLE_BOTTOMS } from "../compare-bottoms";
import { everydayBottomRules, type GarmentDetailsMap } from "../thermal-layers";
import { everydayTopRules } from "../everyday-tops";
import { toddlerRulesApply, toddlerSupportEnabled } from "../../feature-flags";
import { resolveEligibleWardrobe, type WardrobeItemRow } from "../../wardrobe-eligibility";
import type { GarmentDetails } from "../../garment-details";
import type { WardrobeSlug } from "../../wardrobe-catalog";

// T13A: outfit selection and the bottoms comparison share one
// everyday-bottoms eligibility. Runs under both switch states
// (VITE_TODDLER_ROLLOUT unset / "public").
const ON = toddlerSupportEnabled();
const ANSWERS = ["thermal_base", "standalone", "unknown"] as const;
type Use = (typeof ANSWERS)[number];
const AGES = [11, 12, 24, 35, 36, null] as const;

const WARDROBE: WardrobeSlug[] = [
  "long_sleeve_bodysuit",
  "wool_leggings",
  "pants",
  "leggings",
  "fleece_layer",
  "warm_hat",
  "wool_socks",
  "winter_overall",
];

function rowsFor(
  use: Use | null,
  overrides: Partial<Record<WardrobeSlug, Partial<WardrobeItemRow>>> = {},
): WardrobeItemRow[] {
  return WARDROBE.map((slug) => ({
    slug,
    owned: true,
    ...(slug === "wool_leggings" && use ? { leggings_use: use } : {}),
    ...overrides[slug],
  }));
}

/** One consumer, built the way Today builds it: same inputs for both paths. */
function consumer(
  rows: WardrobeItemRow[],
  ageMonths: number | null,
  sleeping = false,
  feelsLikeC = 10,
) {
  const w = resolveEligibleWardrobe(rows);
  const input: RecommendInput = sleeping
    ? {
        feelsLikeC: 0,
        tempPref: 3,
        situation: "home",
        homeActivity: "sleeping",
        roomTempC: 18,
        owned: w.eligible,
        garmentDetails: w.details,
        ageMonths,
      }
    : {
        feelsLikeC,
        tempPref: 3,
        situation: "walk",
        transportMode: "sitting-stroller",
        durationMin: 30,
        owned: w.eligible,
        garmentDetails: w.details,
        ageMonths,
      };
  const rec = recommend(input);
  const rules = everydayBottomRules({ ageMonths, sleeping, details: w.details });
  const { options } = compareBottoms(rec, w.eligible, rules);
  return { w, rec, rules, options, offered: options.map((o) => o.slug) };
}

const bottomOf = (rec: Recommendation) => rec.babyClothing.find((l) => l.slot === "bottom")?.slug;
const toddler = (age: number | null) => toddlerRulesApply(age);

describe("one gate for the toddler outfit rules", () => {
  it("matches the everyday-top gate at every age boundary, switch and sleep state", () => {
    for (const enabled of [true, false]) {
      for (const age of AGES) {
        for (const sleeping of [false, true]) {
          const bottoms = everydayBottomRules({ ageMonths: age, sleeping }, enabled);
          const tops = everydayTopRules({ ageMonths: age, sleeping }, enabled);
          expect(bottoms !== null).toBe(tops !== null);
          expect(bottoms !== null).toBe(
            enabled && !sleeping && age !== null && age >= 12 && age <= 35,
          );
        }
      }
    }
  });

  it("carries the saved details unchanged and never reads anything else", () => {
    const details: GarmentDetailsMap = new Map<WardrobeSlug, Partial<GarmentDetails>>([
      ["wool_leggings", { leggings_use: "thermal_base" }],
    ]);
    expect(everydayBottomRules({ ageMonths: 20, details }, true)).toEqual({ details });
    expect(everydayBottomRules({ ageMonths: 20 }, true)).toEqual({ details: null });
  });
});

describe("wool-leggings answer: outfit selection and comparison agree", () => {
  // Both days the outfit asks for warm bottoms (indoor-ish and freezing).
  for (const use of ANSWERS) {
    for (const age of AGES) {
      it(`${use}, age ${age ?? "unknown"}`, () => {
        for (const temp of [10, -10]) {
          const c = consumer(rowsFor(use), age, false, temp);
          const bottom = bottomOf(c.rec);
          expect(bottom).toBeDefined();
          // The outfit's own bottom is always one the comparison offers.
          expect(c.offered).toContain(bottom);

          if (toddler(age) && use === "thermal_base") {
            // Not worn as standalone everyday bottoms, in either path.
            expect(bottom).toBe("pants");
            expect(c.offered).toEqual(["leggings", "pants"]);
            expect(applyBottomChoice(c.rec, "wool_leggings", c.w.eligible, c.rules)).toBe(c.rec);
          } else {
            // On their own, Not sure (compatibility fallback) and every
            // non-toddler case keep the existing behaviour.
            expect(bottom).toBe("wool_leggings");
            expect(c.offered).toEqual(COMPARABLE_BOTTOMS);
            expect(c.options.find((o) => o.slug === "wool_leggings")?.owned).toBe(true);
          }
        }
      });
    }
  }

  it("outside toddler rules the comparison is exactly the previous one", () => {
    for (const age of [11, 36, null]) {
      for (const use of ANSWERS) {
        const c = consumer(rowsFor(use), age);
        expect(c.rules).toBeNull();
        expect(compareBottoms(c.rec, c.w.eligible, c.rules)).toEqual(
          compareBottoms(c.rec, c.w.eligible),
        );
        // The saved answer changes nothing for infants, unknown age or switch off.
        expect(c.rec).toEqual(consumer(rowsFor(null), age).rec);
      }
    }
    if (!ON) {
      for (const use of ANSWERS) {
        const c = consumer(rowsFor(use), 24);
        expect(c.rules).toBeNull();
        expect(c.rec).toEqual(consumer(rowsFor(null), 24).rec);
      }
    }
  });

  it("Not sure is not treated as a stated answer", () => {
    // An unanswered question and an explicit "Not sure" behave the same,
    // and differ from "Thermal underlayer" only where toddler rules apply.
    for (const age of AGES) {
      const unset = consumer(rowsFor(null), age);
      const unsure = consumer(rowsFor("unknown"), age);
      expect(unsure.rec).toEqual(unset.rec);
      expect(unsure.options).toEqual(unset.options);
    }
  });

  it("changing the saved answer moves both paths together", () => {
    const sequence: Use[] = ["standalone", "thermal_base", "unknown", "thermal_base", "standalone"];
    for (const use of sequence) {
      const c = consumer(rowsFor(use), 24);
      const excluded = ON && use === "thermal_base";
      expect(bottomOf(c.rec) === "wool_leggings").toBe(!excluded);
      expect(c.offered.includes("wool_leggings")).toBe(!excluded);
    }
  });

  it("unknown leggings aren't offered over a thermal bottom; stated On their own may be", () => {
    const base = consumer(rowsFor("unknown"), 24).rec;
    const withThermal: Recommendation = {
      ...base,
      babyClothing: [
        { slot: "thermal", slug: "thermal_bottom", label: "Thermal bottoms" },
        ...base.babyClothing.map((l) =>
          l.slot === "bottom"
            ? { slot: "bottom" as const, slug: "pants" as const, label: "Pants" }
            : l,
        ),
      ],
    };
    const owned = new Set<WardrobeSlug>([...WARDROBE, "thermal_bottom"]);
    const details = (use: Use) =>
      new Map<WardrobeSlug, Partial<GarmentDetails>>([["wool_leggings", { leggings_use: use }]]);
    const offered = (use: Use) =>
      compareBottoms(
        withThermal,
        owned,
        everydayBottomRules({ ageMonths: 24, details: details(use) }),
      ).options.map((o) => o.slug);
    if (ON) {
      expect(offered("unknown")).toEqual(["leggings", "pants"]);
      expect(offered("thermal_base")).toEqual(["leggings", "pants"]);
      expect(offered("standalone")).toEqual(COMPARABLE_BOTTOMS);
    } else {
      for (const use of ANSWERS) expect(offered(use)).toEqual(COMPARABLE_BOTTOMS);
    }
  });

  it("sleep keeps the existing behaviour: no rules, nothing to compare", () => {
    for (const use of ANSWERS) {
      const c = consumer(rowsFor(use), 24, true);
      expect(c.rules).toBeNull();
      expect(c.options).toEqual([]);
    }
  });
});

describe("ownership and availability in the comparison", () => {
  for (const reason of ["outgrown", "temporarily_unavailable"] as const) {
    it(`wool leggings (On their own) marked ${reason} are never a usable owned alternative`, () => {
      const c = consumer(rowsFor("standalone", { wool_leggings: { availability: reason } }), 24);
      const wool = c.options.find((o) => o.slug === "wool_leggings");
      if (ON) {
        expect(c.w.eligible.has("wool_leggings")).toBe(false);
        expect(bottomOf(c.rec)).not.toBe("wool_leggings");
        expect(wool?.owned).toBe(false);
        expect(applyBottomChoice(c.rec, "wool_leggings", c.w.eligible, c.rules).missing).toContain(
          "wool_leggings",
        );
      } else {
        // Availability filtering follows the switch: off, the stored value is ignored.
        expect(wool?.owned).toBe(true);
      }
      expect(c.options.find((o) => o.slug === "pants")?.owned).toBe(true);
    });
  }

  it("unowned wool leggings are offered only as not owned", () => {
    for (const age of AGES) {
      const c = consumer(rowsFor("standalone", { wool_leggings: { owned: false } }), age);
      expect(c.w.eligible.has("wool_leggings")).toBe(false);
      expect(bottomOf(c.rec)).not.toBe("wool_leggings");
      expect(c.options.find((o) => o.slug === "wool_leggings")?.owned).toBe(false);
    }
  });

  it("a set-aside other bottom is not owned in the comparison either", () => {
    const c = consumer(rowsFor("thermal_base", { pants: { availability: "outgrown" } }), 24);
    const pants = c.options.find((o) => o.slug === "pants");
    expect(pants?.owned).toBe(!ON);
    if (ON) {
      expect(c.offered).not.toContain("wool_leggings");
      // With pants set aside and the leggings reserved as an underlayer, thin
      // leggings are the owned everyday bottoms in both paths.
      expect(bottomOf(c.rec)).toBe("leggings");
      expect(c.options.find((o) => o.slug === "leggings")?.owned).toBe(true);
    }
  });
});
