// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";
import { actionableAdjustments } from "../actionable";
import { compareOutfits, EMPTY_OUTFIT, type ActualOutfit } from "../warmth";

const ownedSet = (...slugs: WardrobeSlug[]) => new Set<WardrobeSlug>(slugs);

describe("actionableAdjustments", () => {
  it("drops 'add' suggestions for items the parent doesn't own", () => {
    const result = actionableAdjustments(
      [
        { slot: "hat", type: "add", idealSlug: "warm_hat" },
        { slot: "socks", type: "add", idealSlug: "wool_socks" },
        { slot: "mittens", type: "add" },
      ],
      ownedSet("wool_socks"),
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.slot).toBe("socks");
  });

  it("keeps 'add' suggestions once the item is in the wardrobe", () => {
    const result = actionableAdjustments(
      [
        { slot: "hat", type: "add", idealSlug: "warm_hat" },
        { slot: "mittens", type: "add" },
        { slot: "snowPants", type: "add" },
      ],
      ownedSet("warm_hat", "mittens", "snow_pants"),
    );
    expect(result).toHaveLength(3);
  });

  it("always keeps 'remove' suggestions — the item is already selected", () => {
    const result = actionableAdjustments(
      [{ slot: "outer", type: "remove", actualSlug: "winter_overall" }],
      ownedSet(),
    );
    expect(result).toHaveLength(1);
  });

  it("leaves nothing actionable when the only gaps are unowned accessories, so the verdict stays 'Just right'", () => {
    const ideal: ActualOutfit = {
      ...EMPTY_OUTFIT,
      bodysuit: "long_sleeve_bodysuit",
      bottom: "pants",
      mid: "sweater",
      hat: "warm_hat",
      socks: "wool_socks",
      mittens: true,
    };
    const actual: ActualOutfit = { ...ideal, mittens: false };
    const compared = compareOutfits(ideal, actual);

    expect(compared.verdict).toBe("just_right");
    expect(compared.adjustments.length).toBeGreaterThan(0);
    // Parent owns none of the missing accessories: nothing to highlight, so the
    // panel must not switch to the "Almost there" copy it can never clear.
    expect(actionableAdjustments(compared.adjustments, ownedSet())).toHaveLength(0);
    // Owning it makes the reminder actionable again.
    expect(actionableAdjustments(compared.adjustments, ownedSet("mittens"))).toHaveLength(1);
  });
});

describe("rain cover visibility with transport extras", () => {
  const ideal: ActualOutfit = {
    ...EMPTY_OUTFIT,
    bodysuit: "long_sleeve_bodysuit",
    bottom: "pants",
    mid: "sweater",
    transportExtras: ["rain_cover", "footmuff"],
  };

  it("keeps the rain cover flagged when nothing is selected", () => {
    const r = compareOutfits(ideal, { ...ideal, transportExtras: [] });
    expect(r.missingTransportExtras).toContain("rain_cover");
  });

  it("keeps the rain cover flagged when a footmuff is selected", () => {
    const r = compareOutfits(ideal, { ...ideal, transportExtras: ["footmuff"] });
    expect(r.missingTransportExtras).toContain("rain_cover");
  });

  it("keeps the rain cover flagged when a blanket is selected", () => {
    const r = compareOutfits(ideal, { ...ideal, transportExtras: ["blanket"] });
    expect(r.missingTransportExtras).toContain("rain_cover");
  });

  it("clears the rain cover only once the rain cover itself is selected", () => {
    const r = compareOutfits(ideal, { ...ideal, transportExtras: ["rain_cover", "footmuff"] });
    expect(r.missingTransportExtras).toHaveLength(0);
  });

  it("still treats warmth gear as interchangeable — a footmuff covers the blanket's warmth", () => {
    const warmthIdeal: ActualOutfit = { ...ideal, transportExtras: ["blanket"] };
    const r = compareOutfits(warmthIdeal, { ...warmthIdeal, transportExtras: ["footmuff"] });
    expect(r.missingTransportExtras).toHaveLength(0);
  });
});
