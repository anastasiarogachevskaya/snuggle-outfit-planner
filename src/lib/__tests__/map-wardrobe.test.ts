// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import { mapWardrobe } from "../recommend/map-wardrobe";
import type { LayerNeed, AccessoryNeed } from "../recommend/layers";
import type { WardrobeSlug } from "../wardrobe-catalog";

const NO_LAYERS: LayerNeed = { base: "diaper_only", bottom: "none", mid: "none", outer: "none" };
const NO_ACCS: AccessoryNeed = { hat: "none", socks: "none", mittens: false };

const own = (...slugs: WardrobeSlug[]) => new Set<WardrobeSlug>(slugs);

describe("mapWardrobe", () => {
  it("diaper only produces a single base layer and nothing missing", () => {
    const r = mapWardrobe(NO_LAYERS, NO_ACCS, own());
    expect(r.babyClothing).toEqual([{ slot: "base", slug: "diaper_only", label: "Diaper only" }]);
    expect(r.accessories).toEqual([]);
    expect(r.missing).toEqual([]);
  });

  it("'none' kinds produce no items", () => {
    const r = mapWardrobe(
      { base: "long_sleeve", bottom: "none", mid: "none", outer: "none" },
      NO_ACCS,
      own("long_sleeve_bodysuit"),
    );
    expect(r.babyClothing.map((i) => i.slot)).toEqual(["base"]);
    expect(r.accessories).toEqual([]);
  });

  it("prefers the first owned slug in a fallback list", () => {
    const r = mapWardrobe(
      { base: "diaper_only", bottom: "leggings", mid: "fleece", outer: "none" },
      NO_ACCS,
      own("wool_leggings", "wool_layer"),
    );
    expect(r.babyClothing.find((i) => i.slot === "bottom")?.slug).toBe("wool_leggings");
    expect(r.babyClothing.find((i) => i.slot === "mid")?.slug).toBe("wool_layer");
    expect(r.missing).toEqual([]);
  });

  it("falls back to the primary slug and reports it missing when nothing is owned", () => {
    const r = mapWardrobe(
      { base: "short_sleeve", bottom: "pants", mid: "sweater", outer: "winter_overall" },
      { hat: "warm", socks: "wool", mittens: true },
      own(),
    );
    expect(r.babyClothing.map((i) => i.slug)).toEqual([
      "short_sleeve_bodysuit",
      "pants",
      "sweater",
      "winter_overall",
    ]);
    expect(r.accessories.map((a) => a.slug)).toEqual(["warm_hat", "wool_socks", "mittens"]);
    expect(r.missing).toEqual([
      "short_sleeve_bodysuit",
      "pants",
      "sweater",
      "winter_overall",
      "warm_hat",
      "wool_socks",
      "mittens",
    ]);
  });

  it("owned items never appear in the missing list", () => {
    const r = mapWardrobe(
      { base: "long_sleeve", bottom: "pants", mid: "sweater", outer: "none" },
      { hat: "thin", socks: "cotton", mittens: true },
      own("long_sleeve_bodysuit", "pants", "sweater", "thin_hat", "cotton_socks", "mittens"),
    );
    expect(r.missing).toEqual([]);
    expect(r.babyClothing).toHaveLength(3);
    expect(r.accessories).toHaveLength(3);
  });

  it("keeps layers in base → bottom → mid → outer order", () => {
    const r = mapWardrobe(
      { base: "pajamas", bottom: "pants", mid: "fleece", outer: "winter_overall" },
      NO_ACCS,
      own("pajamas", "pants", "fleece_overall", "winter_overall"),
    );
    expect(r.babyClothing.map((i) => i.slot)).toEqual(["base", "bottom", "mid", "outer"]);
  });

  it("labels describe the layer kind, and name the substituted item alongside it", () => {
    const r = mapWardrobe(
      { base: "sleeveless", bottom: "none", mid: "none", outer: "none" },
      { hat: "thin", socks: "cotton", mittens: false },
      own("short_sleeve_bodysuit", "warm_hat", "wool_socks"),
    );
    expect(r.babyClothing[0]).toEqual({
      slot: "base",
      slug: "short_sleeve_bodysuit",
      label: "Sleeveless bodysuit",
      usingLabel: "Short-sleeve bodysuit",
    });
    expect(r.accessories.map((a) => a.label)).toEqual(["Thin cotton hat", "Cotton socks"]);
    expect(r.accessories.map((a) => a.usingLabel)).toEqual(["Warm hat", "Wool socks"]);
  });

  it("omits usingLabel when the recommended item itself is owned", () => {
    const r = mapWardrobe(
      { base: "sleeveless", bottom: "none", mid: "none", outer: "none" },
      { hat: "none", socks: "none", mittens: false },
      own("sleeveless_bodysuit"),
    );
    expect(r.babyClothing[0]).toEqual({
      slot: "base",
      slug: "sleeveless_bodysuit",
      label: "Sleeveless bodysuit",
    });
  });
});
