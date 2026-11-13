// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { isNewWardrobe, ownedSlugs, wardrobeChanges } from "@/lib/wardrobe-diff";

const rows = [
  { slug: "bodysuit_long", owned: true },
  { slug: "fleece_suit", owned: false },
  { slug: "rain_pants", owned: true }, // toddler item, hidden when switch is off
];
const visible = ["bodysuit_long", "fleece_suit", "wool_socks"];

describe("wardrobe save diff", () => {
  it("saving without edits writes nothing", () => {
    expect(wardrobeChanges(rows, ownedSlugs(rows), visible)).toEqual([]);
  });

  it("toggling one visible item changes only that item", () => {
    const sel = [...ownedSlugs(rows), "fleece_suit"];
    expect(wardrobeChanges(rows, sel, visible)).toEqual([{ slug: "fleece_suit", owned: true }]);
  });

  it("hidden owned toddler items are never written", () => {
    const sel = ["bodysuit_long"]; // rain_pants not visible, so not in selection UI
    expect(wardrobeChanges(rows, sel, visible).some((c) => c.slug === "rain_pants")).toBe(false);
  });

  it("un-ticking an owned item records it as not owned", () => {
    expect(wardrobeChanges(rows, ["rain_pants"], visible)).toEqual([
      { slug: "bodysuit_long", owned: false },
    ]);
  });

  it("an empty saved wardrobe is not treated as new", () => {
    expect(isNewWardrobe([{ slug: "fleece_suit", owned: false }])).toBe(false);
    expect(isNewWardrobe([])).toBe(true);
  });
});
