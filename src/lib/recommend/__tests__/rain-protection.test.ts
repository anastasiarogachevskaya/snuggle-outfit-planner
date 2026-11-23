// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { selectRainProtection, RAIN_NOT_JUDGED } from "../rain-protection";
import { recommend, type Layer, type RecommendInput } from "../../recommend";
import { toddlerSupportEnabled } from "../../feature-flags";
import { normalizeOutingContext, outingEngineFields, type OutingInput } from "../../outing-context";
import { clothingNeedsFromRecommendation, withClothingNeeds } from "../../clothing-needs";
import type { GarmentDetails } from "../../garment-details";
import { resolveEligibleWardrobe, type WardrobeItemRow } from "../../wardrobe-eligibility";
import { idealOutfitFrom } from "../warmth";
import type { WardrobeSlug } from "../../wardrobe-catalog";

const own = (...s: WardrobeSlug[]) => new Set<WardrobeSlug>(s);
const wp = (entries: [WardrobeSlug, GarmentDetails["waterproof"]][]) =>
  new Map<WardrobeSlug, Partial<GarmentDetails>>(entries.map(([s, w]) => [s, { waterproof: w }]));
const outing = (o: Omit<OutingInput, "situation">) =>
  normalizeOutingContext({ situation: "walk", ...o });
const outer = (...slugs: WardrobeSlug[]): Layer[] =>
  slugs.map((slug) => ({ slot: "outer", slug, label: slug }));

type Sel = Parameters<typeof selectRainProtection>[0];
const sel = (o: Partial<Sel> & { ground?: "dry" | "wet" | "snow"; activity?: string }) => {
  const { ground, activity, ...rest } = o;
  return selectRainProtection({
    movement: "walking",
    outing: outing({ movement: "walking", ground, activity }),
    outfit: [],
    owned: own(),
    ...rest,
  });
};
const statuses = (r: ReturnType<typeof sel>) =>
  Object.fromEntries(r.areas.map((a) => [a.area, a.status]));

describe("what asks for wearable rain protection", () => {
  it("rain asks for upper- and lower-body protection", () => {
    const r = sel({ isRaining: true, ground: "dry" });
    expect(r.required).toEqual(["upper_body", "lower_body"]);
    expect(r.reasons).toEqual(["rain"]);
  });

  it("stated wet ground without rain asks for lower-body protection only", () => {
    const r = sel({ isRaining: false, ground: "wet" });
    expect(r.required).toEqual(["lower_body"]);
    expect(r.reasons).toEqual(["wet_ground"]);
  });

  it("dry and not raining asks for nothing, adds nothing", () => {
    const r = sel({ isRaining: false, ground: "dry", owned: own("rain_overall") });
    expect(r.required).toEqual([]);
    expect(r.added).toEqual([]);
    expect(r.waterproofingMet).toBeNull();
    expect(r.notes).toEqual([]);
  });

  it("unknown ground and no rain signal asks for nothing", () => {
    const r = sel({ owned: own("rain_overall") });
    expect(r.ground).toBe("unknown");
    expect(r.raining).toBeNull();
    expect(r.required).toEqual([]);
    expect(r.added).toEqual([]);
  });

  it("an activity name never stands in for rain or wet ground", () => {
    for (const activity of ["wet_play", "snow_play", "playground"]) {
      const r = sel({ isRaining: false, activity, owned: own("rain_overall", "rain_pants") });
      expect(r.required).toEqual([]);
      expect(r.added).toEqual([]);
    }
    expect(sel({ activity: "wet_play" }).notes.join(" ")).toContain("rain gear wasn't added");
  });

  it("snowy ground alone stays with the separate snow policy", () => {
    expect(sel({ isRaining: false, ground: "snow", owned: own("rain_pants") }).required).toEqual(
      [],
    );
  });
});

describe("choosing worn protection", () => {
  it("a confirmed rain overall beats confirmed separate shells (one garment, both areas)", () => {
    const r = sel({
      isRaining: true,
      owned: own("rain_overall", "waterproof_jacket", "rain_pants"),
      details: wp([
        ["rain_overall", "yes"],
        ["waterproof_jacket", "yes"],
        ["rain_pants", "yes"],
      ]),
    });
    expect(r.added).toEqual(["rain_overall"]);
    expect(r.garments[0]?.covers).toEqual(["upper_body", "lower_body"]);
    expect(r.waterproofingMet).toBe(true);
    expect(r.gaps).toEqual([]);
  });

  it("confirmed separate shells beat an unconfirmed rain overall", () => {
    const r = sel({
      isRaining: true,
      owned: own("rain_overall", "waterproof_jacket", "rain_pants"),
      details: wp([
        ["waterproof_jacket", "yes"],
        ["rain_pants", "yes"],
      ]),
    });
    expect(r.added).toEqual(["waterproof_jacket", "rain_pants"]);
    expect(r.waterproofingMet).toBe(true);
  });

  it("partial protection: confirmed rain pants only, so the upper body is shown as missing", () => {
    const r = sel({
      isRaining: true,
      owned: own("rain_pants"),
      details: wp([["rain_pants", "yes"]]),
    });
    expect(r.added).toEqual(["waterproof_jacket", "rain_pants"]);
    expect(statuses(r)).toEqual({ upper_body: "missing", lower_body: "confirmed" });
    expect(r.waterproofingMet).toBe(false);
    expect(r.gaps).toEqual([
      { kind: "missing_garment", slug: "waterproof_jacket", areas: ["upper_body"] },
    ]);
  });

  it("unknown waterproofing is used but stays unconfirmed, and stays owned", () => {
    const r = sel({ isRaining: true, owned: own("rain_overall") });
    expect(r.added).toEqual(["rain_overall"]);
    expect(r.garments[0]).toMatchObject({ owned: true, protection: { waterproof: "unknown" } });
    expect(statuses(r)).toEqual({ upper_body: "unconfirmed", lower_body: "unconfirmed" });
    expect(r.waterproofingMet).toBe(false);
    expect(r.gaps).toEqual([
      {
        kind: "waterproofing",
        status: "unconfirmed",
        slug: "rain_overall",
        areas: ["upper_body", "lower_body"],
      },
    ]);
    expect(r.notes.join(" ")).toContain("not confirmed as waterproof");
  });

  it("not waterproof is kept as the owned option with an unmet need; unknown beats it", () => {
    const only = sel({
      isRaining: true,
      owned: own("rain_overall"),
      details: wp([["rain_overall", "no"]]),
    });
    expect(only.added).toEqual(["rain_overall"]);
    expect(statuses(only)).toEqual({ upper_body: "unmet", lower_body: "unmet" });
    expect(only.waterproofingMet).toBe(false);
    expect(only.gaps[0]).toMatchObject({ kind: "waterproofing", status: "unmet" });
    expect(only.notes.join(" ")).toContain("marked not waterproof");

    const both = sel({
      isRaining: true,
      owned: own("rain_overall", "softshell_overall"),
      details: wp([["rain_overall", "no"]]),
    });
    expect(both.added).toEqual(["softshell_overall"]);
    expect(statuses(both).upper_body).toBe("unconfirmed");
  });

  it("legacy Rain / snow pants are never confirmed by their name", () => {
    const r = sel({ ground: "wet", owned: own("snow_pants") });
    expect(r.added).toEqual(["snow_pants"]);
    expect(statuses(r)).toEqual({ lower_body: "unconfirmed" });
    const confirmed = sel({
      ground: "wet",
      owned: own("snow_pants", "rain_pants"),
      details: wp([["snow_pants", "yes"]]),
    });
    expect(confirmed.added).toEqual(["snow_pants"]);
    expect(confirmed.waterproofingMet).toBe(true);
  });

  it("wet ground only: one lower-body garment, never a jacket", () => {
    const r = sel({
      ground: "wet",
      isRaining: false,
      owned: own("waterproof_jacket", "rain_pants"),
      details: wp([
        ["waterproof_jacket", "yes"],
        ["rain_pants", "yes"],
      ]),
    });
    expect(r.added).toEqual(["rain_pants"]);
  });

  it("unavailable and outgrown shells are never used, and their reasons are kept", () => {
    const w = resolveEligibleWardrobe(
      [
        {
          slug: "rain_overall",
          owned: true,
          availability: "temporarily_unavailable",
          waterproof: "yes",
        },
        { slug: "rain_pants", owned: true, availability: "outgrown", waterproof: "yes" },
      ] as WardrobeItemRow[],
      { availabilityFilter: true },
    );
    const r = sel({ isRaining: true, owned: w.eligible, setAside: w.setAside, details: w.details });
    expect(r.added).toEqual(["rain_overall"]);
    expect(r.garments[0]?.owned).toBe(false);
    expect(r.waterproofingMet).toBe(false);
    expect(r.unusable).toContainEqual({ slug: "rain_overall", reason: "temporarily_unavailable" });
    expect(r.unusable).toContainEqual({ slug: "rain_pants", reason: "outgrown" });
    const text = r.notes.join(" ");
    expect(text).toContain("rain overall is marked temporarily unavailable");
    expect(text).toContain("rain pants are marked outgrown");
  });

  it("restoring a shell to Available makes it usable again with its saved answer", () => {
    const rows = (availability: GarmentDetails["availability"]) =>
      [{ slug: "rain_overall", owned: true, availability, waterproof: "yes" }] as WardrobeItemRow[];
    const away = resolveEligibleWardrobe(rows("temporarily_unavailable"), {
      availabilityFilter: true,
    });
    const back = resolveEligibleWardrobe(rows("available"), { availabilityFilter: true });
    const run = (w: typeof away) =>
      sel({ isRaining: true, owned: w.eligible, setAside: w.setAside, details: w.details });
    expect(run(away).waterproofingMet).toBe(false);
    expect(run(back).waterproofingMet).toBe(true);
    expect(run(back).garments[0]).toMatchObject({ slug: "rain_overall", owned: true });
  });

  it("empty wardrobe: names what is missing for the areas needed", () => {
    const rain = sel({ isRaining: true });
    expect(rain.added).toEqual(["rain_overall"]);
    expect(rain.gaps).toEqual([
      { kind: "missing_garment", slug: "rain_overall", areas: ["upper_body", "lower_body"] },
    ]);
    expect(rain.waterproofingMet).toBe(false);
    const wet = sel({ ground: "wet" });
    expect(wet.added).toEqual(["rain_pants"]);
    expect(wet.notes.join(" ")).toContain("waterproof cover for the legs");
  });
});

describe("existing outerwear and transport covers", () => {
  it("no redundant shell over outerwear already confirmed waterproof", () => {
    const r = sel({
      isRaining: true,
      outfit: outer("winter_overall"),
      owned: own("winter_overall", "rain_overall"),
      details: wp([
        ["winter_overall", "yes"],
        ["rain_overall", "yes"],
      ]),
    });
    expect(r.added).toEqual([]);
    expect(r.garments).toEqual([
      expect.objectContaining({ slug: "winter_overall", source: "outfit" }),
    ]);
    expect(r.waterproofingMet).toBe(true);
  });

  it("an unconfirmed winter overall stays; a confirmed shell goes over it", () => {
    const r = sel({
      isRaining: true,
      outfit: outer("winter_overall"),
      owned: own("winter_overall", "rain_overall"),
      details: wp([["rain_overall", "yes"]]),
    });
    expect(r.added).toEqual(["rain_overall"]);
    expect(r.waterproofingMet).toBe(true);
  });

  it("an unconfirmed outfit garment isn't stacked with an equally unconfirmed shell", () => {
    const r = sel({
      isRaining: true,
      outfit: outer("winter_overall"),
      owned: own("winter_overall", "rain_overall"),
    });
    expect(r.added).toEqual([]);
    expect(r.gaps[0]).toMatchObject({ slug: "winter_overall", status: "unconfirmed" });
  });

  it("a missing outfit garment never counts as protection", () => {
    const r = sel({
      isRaining: true,
      outfit: outer("winter_overall"),
      outfitMissing: ["winter_overall"],
      owned: own("rain_overall"),
      details: wp([["rain_overall", "yes"]]),
    });
    expect(r.added).toEqual(["rain_overall"]);
  });

  it("a stroller rain cover never satisfies worn protection", () => {
    const r = sel({
      isRaining: true,
      owned: own("rain_cover"),
      transportExtras: ["rain_cover"],
      details: wp([["rain_cover", "yes"]]),
    });
    expect(r.garments.map((g) => g.slug)).toEqual(["rain_overall"]);
    expect(r.garments[0]?.owned).toBe(false);
    expect(r.notes.join(" ")).toContain("only keeps your child dry while riding");
  });

  it("states what it doesn't judge", () => {
    expect(sel({ isRaining: true }).notJudged).toEqual(RAIN_NOT_JUDGED);
  });
});

// recommend() follows the build's toddler switch; run with
// VITE_TODDLER_ROLLOUT=public to exercise the "on" state.
describe("recommend(): shared by every recommendation consumer", () => {
  const on = toddlerSupportEnabled();
  const wardrobe = own(
    "long_sleeve_bodysuit",
    "pants",
    "wool_leggings",
    "sweater",
    "fleece_layer",
    "winter_overall",
    "cotton_socks",
    "wool_socks",
    "thin_hat",
    "warm_hat",
    "mittens",
    "everyday_shoes",
    "rain_boots",
    "rain_overall",
    "waterproof_jacket",
    "rain_pants",
    "stroller",
    "rain_cover",
    "footmuff",
  );
  const run = (o: Omit<OutingInput, "situation">, extra: Partial<RecommendInput> = {}) =>
    recommend({
      feelsLikeC: 10,
      tempPref: 3,
      owned: wardrobe,
      ageMonths: 24,
      isRaining: true,
      ...outingEngineFields(outing(o)),
      ...extra,
    } as RecommendInput);
  const slugs = (l: Layer[]) => l.map((x) => x.slug);

  it("adds shells over the outfit without losing insulation or bottoms, each garment once", () => {
    for (const feelsLikeC of [10, 0, -10]) {
      const legacy = run({ transportMode: "none" }, { feelsLikeC });
      const r = run({ movement: "walking" }, { feelsLikeC });
      if (!on) {
        expect(r.rainProtection).toBeUndefined();
        continue;
      }
      // Every legacy layer is still there, in order, before any shell.
      expect(slugs(r.babyClothing).slice(0, legacy.babyClothing.length)).toEqual(
        slugs(legacy.babyClothing),
      );
      const all = slugs(r.babyClothing);
      expect(new Set(all).size).toBe(all.length);
      expect(r.rainProtection?.required).toEqual(["upper_body", "lower_body"]);
    }
  });

  it("a confirmed rain overall is added; an unconfirmed one keeps its gap in the shared output", () => {
    const yes = run({ movement: "active" }, { garmentDetails: wp([["rain_overall", "yes"]]) });
    const unknown = run({ movement: "active" });
    if (!on) return;
    expect(yes.rainProtection?.waterproofingMet).toBe(true);
    expect(slugs(yes.babyClothing)).toContain("rain_overall");
    expect(unknown.rainProtection?.waterproofingMet).toBe(false);
    expect(unknown.rainProtection?.gaps.length).toBeGreaterThan(0);
    // Owned with weak protection is still owned, not missing.
    expect(unknown.missing).not.toContain("rain_overall");
  });

  it("missing shells are listed as missing clothing, once, and adapters round-trip", () => {
    const r = run({ movement: "walking" }, { owned: own("long_sleeve_bodysuit", "pants") });
    expect(withClothingNeeds(r, clothingNeedsFromRecommendation(r))).toEqual(r);
    if (!on) return;
    expect(r.missing.filter((s) => s === "rain_overall")).toEqual(["rain_overall"]);
    expect(r.rainProtection?.gaps[0]).toMatchObject({ kind: "missing_garment" });
  });

  it("mixed with a stroller keeps the rain cover and adds worn protection", () => {
    const seated = run({ transportMode: "sitting-stroller" });
    const mixed = run({ movement: "mixed", transportMode: "sitting-stroller" });
    expect(mixed.transportExtras).toEqual(seated.transportExtras);
    expect(mixed.transportExtras.map((e) => e.slug)).toContain("rain_cover");
    if (!on) return expect(mixed).toEqual(seated);
    expect(mixed.rainProtection?.added.length).toBeGreaterThan(0);
    expect(mixed.rainProtection?.added).not.toContain("rain_cover");
  });

  it("the warmth comparison ignores added rain shells", () => {
    const legacy = run({ transportMode: "none" });
    const r = run({ movement: "walking" });
    expect(idealOutfitFrom(r)).toEqual(idealOutfitFrom(legacy));
  });

  it("phone-kept and signed-in wardrobes give the same protection result", () => {
    const rows: WardrobeItemRow[] = [...wardrobe].map((slug) => ({
      slug,
      owned: true,
      ...(slug === "rain_pants" ? { waterproof: "yes" } : {}),
      ...(slug === "rain_overall" ? { availability: "outgrown" } : {}),
    })) as WardrobeItemRow[];
    const a = resolveEligibleWardrobe(rows, { availabilityFilter: true });
    const b = resolveEligibleWardrobe(
      rows.map((r) => ({ ...r })),
      { availabilityFilter: true },
    );
    const go = (w: typeof a) =>
      run(
        { movement: "walking" },
        { owned: w.eligible, setAside: w.setAside, garmentDetails: w.details },
      );
    expect(go(a)).toEqual(go(b));
    if (!on) return;
    expect(go(a).rainProtection?.added).not.toContain("rain_overall");
  });

  it("switch-off, infants, unknown age, seated, unstated movement, home and car are unchanged", () => {
    const legacy = (extra: Partial<RecommendInput> = {}) =>
      recommend({
        feelsLikeC: 10,
        tempPref: 3,
        owned: wardrobe,
        ageMonths: 24,
        isRaining: true,
        situation: "walk",
        transportMode: "pram",
        ...extra,
      } as RecommendInput);
    expect(run({ transportMode: "pram" })).toEqual(legacy());
    expect(run({ movement: "seated", transportMode: "pram" }).rainProtection).toBeUndefined();
    expect(run({ transportMode: "none" }).rainProtection).toBeUndefined();
    expect(run({ movement: "walking" }, { ageMonths: 8 }).rainProtection).toBeUndefined();
    expect(run({ movement: "walking" }, { ageMonths: 36 }).rainProtection).toBeUndefined();
    expect(run({ movement: "walking" }, { ageMonths: null }).rainProtection).toBeUndefined();
    const home = recommend({
      feelsLikeC: 10,
      tempPref: 3,
      owned: wardrobe,
      ageMonths: 24,
      situation: "home",
      roomTempC: 21,
    });
    expect(home.rainProtection).toBeUndefined();
    const car = recommend({
      feelsLikeC: 10,
      tempPref: 3,
      owned: wardrobe,
      ageMonths: 24,
      isRaining: true,
      ...outingEngineFields(normalizeOutingContext({ situation: "car", movement: "walking" })),
    });
    expect(car.rainProtection).toBeUndefined();
  });
});
