// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import {
  selectWalkingFootwear,
  walkingFootwearApplies,
  WALKING_FOOTWEAR_SLUGS,
} from "../footwear";
import { recommend, type RecommendInput } from "../../recommend";
import { toddlerSupportEnabled } from "../../feature-flags";
import {
  normalizeOutingContext,
  outingEngineFields,
  type OutingInput,
} from "../../outing-context";
import { clothingNeedsFromRecommendation, withClothingNeeds } from "../../clothing-needs";
import type { GarmentDetails } from "../../garment-details";
import { resolveEligibleWardrobe, type WardrobeItemRow } from "../../wardrobe-eligibility";
import type { WardrobeSlug } from "../../wardrobe-catalog";

const own = (...s: WardrobeSlug[]) => new Set<WardrobeSlug>(s);
const wp = (entries: [WardrobeSlug, GarmentDetails["waterproof"]][]) =>
  new Map<WardrobeSlug, Partial<GarmentDetails>>(entries.map(([s, w]) => [s, { waterproof: w }]));
const outing = (o: Omit<OutingInput, "situation">) =>
  normalizeOutingContext({ situation: "walk", ...o });
const FOOT = new Set<string>(WALKING_FOOTWEAR_SLUGS);
const footwearIn = (slugs: string[]) => slugs.filter((s) => FOOT.has(s) || s === "booties");

describe("when the walking-footwear path applies (gate on)", () => {
  const at = (o: Omit<OutingInput, "situation">, ageMonths: number | null = 20) =>
    walkingFootwearApplies({ situation: "walk", ageMonths, outing: outing(o) }, true);

  it("gentle walking, active play and mixed movement apply", () => {
    expect(at({ movement: "walking", transportMode: "none" })).toBe("walking");
    expect(at({ movement: "active" })).toBe("active");
    expect(at({ movement: "mixed" })).toBe("mixed");
  });

  it("mixed movement with a stroller or carrier still needs walking footwear", () => {
    expect(at({ movement: "mixed", transportMode: "sitting-stroller" })).toBe("mixed");
    expect(at({ movement: "mixed", transportMode: "carrier" })).toBe("mixed");
  });

  it("seated, unknown movement and no-transport-only walks never apply", () => {
    expect(at({ movement: "seated" })).toBeNull();
    expect(at({})).toBeNull();
    // "No transport" is not walking.
    expect(at({ transportMode: "none" })).toBeNull();
    // A seat without a stated movement keeps its seated meaning.
    expect(at({ transportMode: "pram" })).toBeNull();
  });

  it("is never inferred from age: infants, 36+ months and unknown age don't apply", () => {
    expect(at({ movement: "walking" }, 8)).toBeNull();
    expect(at({ movement: "walking" }, 36)).toBeNull();
    expect(at({ movement: "walking" }, null)).toBeNull();
    expect(at({ movement: "walking" }, 12)).toBe("walking");
    expect(at({ movement: "walking" }, 35)).toBe("walking");
  });

  it("home and car never apply, and the switch off never applies", () => {
    const o = outing({ movement: "walking" });
    expect(walkingFootwearApplies({ situation: "home", ageMonths: 20, outing: o }, true)).toBeNull();
    expect(walkingFootwearApplies({ situation: "car", ageMonths: 20, outing: o }, true)).toBeNull();
    expect(walkingFootwearApplies({ situation: "walk", ageMonths: 20, outing: o }, false)).toBeNull();
  });
});

describe("selection by ground", () => {
  const all = own("everyday_shoes", "rain_boots", "winter_boots");

  it("dry ground: walking shoes, waterproofing not assessed", () => {
    const f = selectWalkingFootwear({ movement: "walking", ground: "dry", owned: all });
    expect(f.selected).toBe("everyday_shoes");
    expect(f.waterproofRequired).toBe(false);
    expect(f.waterproof).toBe("not_assessed");
    expect(f.notes).toEqual([]);
  });

  it("unknown ground: walking shoes, and says waterproofing wasn't considered", () => {
    const f = selectWalkingFootwear({ movement: "active", owned: all });
    expect(f.ground).toBe("unknown");
    expect(f.selected).toBe("everyday_shoes");
    expect(f.waterproof).toBe("not_assessed");
    expect(f.notes.join(" ")).toContain("waterproofing wasn't considered");
  });

  it("wet ground: rain boots by type, but never claimed waterproof unless stated", () => {
    const f = selectWalkingFootwear({ movement: "walking", ground: "wet", owned: all });
    expect(f.selected).toBe("rain_boots");
    expect(f.protection?.waterproof).toBe("unknown");
    expect(f.waterproof).toBe("unconfirmed");
    expect(f.notes.join(" ")).toContain("aren't confirmed as waterproof");
  });

  it("wet ground: stated-waterproof footwear comes before unconfirmed rain boots", () => {
    const f = selectWalkingFootwear({
      movement: "walking",
      ground: "wet",
      owned: all,
      details: wp([["everyday_shoes", "yes"]]),
    });
    expect(f.selected).toBe("everyday_shoes");
    expect(f.waterproof).toBe("confirmed");
    expect(f.notes).toEqual([]);
  });

  it("wet ground: confirmed rain boots are confirmed", () => {
    const f = selectWalkingFootwear({
      movement: "mixed",
      ground: "wet",
      owned: all,
      details: wp([["rain_boots", "yes"]]),
    });
    expect(f.selected).toBe("rain_boots");
    expect(f.waterproof).toBe("confirmed");
  });

  it("wet ground: stated not waterproof goes last and, if only choice, is said so", () => {
    const ranked = selectWalkingFootwear({
      movement: "walking",
      ground: "wet",
      owned: own("rain_boots", "everyday_shoes"),
      details: wp([["rain_boots", "no"]]),
    });
    expect(ranked.selected).toBe("everyday_shoes");
    const only = selectWalkingFootwear({
      movement: "walking",
      ground: "wet",
      owned: own("everyday_shoes"),
      details: wp([["everyday_shoes", "no"]]),
    });
    expect(only.selected).toBe("everyday_shoes");
    expect(only.waterproof).toBe("stated_no");
    expect(only.notes.join(" ")).toContain("marked not waterproof");
  });

  it("snowy ground: winter boots by type, protection kept unknown, warmth uncertainty explicit", () => {
    const f = selectWalkingFootwear({ movement: "active", ground: "snow", owned: all });
    expect(f.selected).toBe("winter_boots");
    expect(f.protection).toEqual({ waterproof: "unknown", insulation: "unknown" });
    expect(f.waterproof).toBe("unconfirmed");
    const text = f.notes.join(" ");
    expect(text).toContain("aren't confirmed as waterproof");
    expect(text).toContain("doesn't yet judge how warm");
  });

  it("stated insulation is carried as stated, never inferred", () => {
    const f = selectWalkingFootwear({
      movement: "walking",
      ground: "snow",
      owned: all,
      details: new Map([["winter_boots", { insulation: "insulated", waterproof: "yes" }]]),
    });
    expect(f.protection).toEqual({ waterproof: "yes", insulation: "insulated" });
    expect(f.waterproof).toBe("confirmed");
  });
});

describe("missing footwear", () => {
  it("empty wardrobe: names the footwear the ground needs, never booties or socks", () => {
    for (const [ground, slug] of [
      ["dry", "everyday_shoes"],
      ["wet", "rain_boots"],
      ["snow", "winter_boots"],
      [undefined, "everyday_shoes"],
    ] as const) {
      const f = selectWalkingFootwear({ movement: "walking", ground, owned: own() });
      expect(f.selected).toBeNull();
      expect(f.missingSlug).toBe(slug);
      expect(f.unusable.every((u) => u.reason === "not_owned")).toBe(true);
    }
  });

  it("booties don't satisfy the need and are named as not used", () => {
    const f = selectWalkingFootwear({ movement: "walking", ground: "dry", owned: own("booties") });
    expect(f.selected).toBeNull();
    expect(f.missingSlug).toBe("everyday_shoes");
    expect(f.notes.join(" ")).toContain("Booties aren't walking footwear");
  });

  it("outgrown, unavailable and unowned are told apart", () => {
    const rows: WardrobeItemRow[] = [
      { slug: "everyday_shoes", owned: true, availability: "outgrown" },
      { slug: "rain_boots", owned: true, availability: "temporarily_unavailable" },
    ];
    const w = resolveEligibleWardrobe(rows, { availabilityFilter: true });
    const f = selectWalkingFootwear({
      movement: "walking",
      ground: "dry",
      owned: w.eligible,
      setAside: w.setAside,
    });
    expect(f.selected).toBeNull();
    expect(f.unusable).toEqual([
      { slug: "everyday_shoes", reason: "outgrown" },
      { slug: "winter_boots", reason: "not_owned" },
      { slug: "rain_boots", reason: "temporarily_unavailable" },
    ]);
    const text = f.notes.join(" ");
    expect(text).toContain("walking shoes are marked outgrown");
    expect(text).toContain("rain boots are marked temporarily unavailable");
  });

  it("an unavailable preferred item is skipped for an available one", () => {
    const w = resolveEligibleWardrobe(
      [
        { slug: "rain_boots", owned: true, availability: "outgrown" },
        { slug: "everyday_shoes", owned: true },
      ],
      { availabilityFilter: true },
    );
    const f = selectWalkingFootwear({
      movement: "walking",
      ground: "wet",
      owned: w.eligible,
      setAside: w.setAside,
    });
    expect(f.selected).toBe("everyday_shoes");
    expect(f.unusable).toContainEqual({ slug: "rain_boots", reason: "outgrown" });
  });
});

// recommend() follows the build's toddler switch, like the other toddler
// suites; run with VITE_TODDLER_ROLLOUT=public to exercise the "on" state.
describe("recommend(): Today and assistant share this path", () => {
  const on = toddlerSupportEnabled();
  const wardrobe = own(
    "long_sleeve_bodysuit",
    "pants",
    "sweater",
    "cotton_socks",
    "wool_socks",
    "thin_hat",
    "everyday_shoes",
    "rain_boots",
    "booties",
    "stroller",
    "blanket",
  );
  const run = (o: Omit<OutingInput, "situation">, extra: Partial<RecommendInput> = {}) =>
    recommend({
      feelsLikeC: 10,
      tempPref: 3,
      owned: wardrobe,
      ageMonths: 24,
      ...outingEngineFields(outing(o)),
      ...extra,
    } as RecommendInput);

  it("walking: one footwear item, separate from socks; booties never added", () => {
    const r = run({ movement: "walking", ground: "dry" });
    const accs = r.accessories.map((a) => a.slug);
    if (!on) {
      expect(r.footwear).toBeUndefined();
      expect(footwearIn(accs)).toEqual([]);
      return;
    }
    expect(footwearIn(accs)).toEqual(["everyday_shoes"]);
    // Existing sock rule unchanged: same socks as the same walk without movement.
    const socks = (slugs: string[]) => slugs.filter((x) => x.endsWith("_socks"));
    const plain = run({ transportMode: "none", ground: "dry" }).accessories.map((a) => a.slug);
    expect(socks(accs)).toEqual(socks(plain));
    expect(socks(accs)).toHaveLength(1);
    expect(r.babyClothing.some((l) => FOOT.has(l.slug))).toBe(false);
    expect(r.footwear?.selected).toBe("everyday_shoes");
  });

  it("mixed with a stroller keeps stroller extras and adds footwear", () => {
    const seated = run({ transportMode: "sitting-stroller" });
    const mixed = run({ movement: "mixed", transportMode: "sitting-stroller", ground: "wet" });
    expect(mixed.transportExtras).toEqual(seated.transportExtras);
    expect(mixed.babyClothing).toEqual(seated.babyClothing);
    if (!on) return expect(mixed).toEqual(seated);
    expect(footwearIn(mixed.accessories.map((a) => a.slug))).toEqual(["rain_boots"]);
    expect(mixed.notes.join(" ")).toContain("aren't confirmed as waterproof");
  });

  it("seated and unknown movement are unchanged from the legacy output", () => {
    const legacy = recommend({
      feelsLikeC: 10,
      tempPref: 3,
      owned: wardrobe,
      ageMonths: 24,
      situation: "walk",
      transportMode: "pram",
    });
    expect(run({ transportMode: "pram" })).toEqual(legacy);
    expect(run({ movement: "seated", transportMode: "pram" }).footwear).toBeUndefined();
    const noMovement = run({ transportMode: "none" });
    expect(noMovement.footwear).toBeUndefined();
    expect(footwearIn(noMovement.accessories.map((a) => a.slug))).toEqual([]);
  });

  it("empty wardrobe: the missing footwear is in missing, once, with its reason", () => {
    const r = run({ movement: "active", ground: "snow" }, { owned: own() });
    if (!on) return expect(r.footwear).toBeUndefined();
    expect(footwearIn(r.accessories.map((a) => a.slug))).toEqual(["winter_boots"]);
    expect(r.missing.filter((s) => FOOT.has(s))).toEqual(["winter_boots"]);
    expect(r.notes.join(" ")).toContain("needs walking footwear");
  });

  it("infants and home/car outings never get footwear", () => {
    expect(run({ movement: "walking" }, { ageMonths: 8 }).footwear).toBeUndefined();
    const home = recommend({
      feelsLikeC: 10,
      tempPref: 3,
      owned: wardrobe,
      ageMonths: 24,
      situation: "home",
      roomTempC: 21,
    });
    expect(home.footwear).toBeUndefined();
    const car = recommend({
      feelsLikeC: 10,
      tempPref: 3,
      owned: wardrobe,
      ageMonths: 24,
      ...outingEngineFields(normalizeOutingContext({ situation: "car", movement: "walking" })),
    });
    expect(car.footwear).toBeUndefined();
  });

  it("clothing-needs adapters round-trip a footwear outfit and keep footwear apart from socks", () => {
    const r = run({ movement: "walking", ground: "wet" });
    const needs = clothingNeedsFromRecommendation(r);
    expect(withClothingNeeds(r, needs)).toEqual(r);
    if (!on) return;
    const roles = needs.worn.filter((g) => g.coverage.includes("feet")).map((g) => g.role);
    expect(roles.filter((x) => x === "footwear")).toHaveLength(1);
    expect(roles).toContain("socks");
  });
});
