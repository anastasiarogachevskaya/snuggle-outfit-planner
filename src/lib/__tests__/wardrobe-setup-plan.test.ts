// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import { visibleWardrobeSteps, ALL_WARDROBE_STEPS } from "../wardrobe-catalog";
import { planWardrobeSetup, toddlerSuggestions } from "../wardrobe-setup-plan";
import { createGuestProfile, createLocalProfile, upgradeGuestProfile } from "../guest-profile";

const on = visibleWardrobeSteps(true);
const off = visibleWardrobeSteps(false);
const slugs = (items: { slug: string }[]) => items.map((i) => i.slug);
const step = (plan: ReturnType<typeof planWardrobeSetup>, id: string) => plan.find((s) => s.id === id)!;

describe("wardrobe setup plan", () => {
  it("leaves infant setup unchanged with the switch off", () => {
    const plan = planWardrobeSetup(off, { audience: "infant", clothingStyle: "both", owned: [] });
    plan.forEach((s, i) => {
      expect(slugs(s.primary)).toEqual(slugs(off[i]!.items));
      expect(s.more).toEqual([]);
    });
  });

  it("lets a younger infant find walking shoes through View all", () => {
    const plan = planWardrobeSetup(on, { audience: "infant", clothingStyle: "both", owned: [] });
    expect(slugs(step(plan, "accessories").more)).toContain("everyday_shoes");
    expect(slugs(step(plan, "accessories").primary)).not.toContain("everyday_shoes");
  });

  it("tucks swaddles away for toddlers but keeps sleep sacks, strollers and carriers", () => {
    const plan = planWardrobeSetup(on, { audience: "toddler", clothingStyle: "both", owned: [] });
    expect(slugs(step(plan, "sleep").more)).toEqual(["swaddle"]);
    expect(slugs(step(plan, "sleep").primary)).toContain("sleep_sack_25");
    expect(slugs(step(plan, "transport").primary)).toEqual(expect.arrayContaining(["stroller", "baby_carrier"]));
    expect(slugs(step(plan, "outer").primary)).toContain("winter_overall");
  });

  it("keeps an owned swaddle visible", () => {
    const plan = planWardrobeSetup(on, { audience: "toddler", clothingStyle: "both", owned: ["swaddle"] });
    expect(slugs(step(plan, "sleep").primary)).toContain("swaddle");
    expect(step(plan, "sleep").more).toEqual([]);
  });

  it("prioritises tops or bodysuits from the clothing style, others under View all", () => {
    const tops = step(planWardrobeSetup(on, { audience: "toddler", clothingStyle: "tops", owned: [] }), "base");
    expect(slugs(tops.primary).slice(0, 2)).toEqual(["short_sleeve_top", "long_sleeve_top"]);
    expect(slugs(tops.more)).toEqual(["sleeveless_bodysuit", "short_sleeve_bodysuit", "long_sleeve_bodysuit"]);
    const bodies = step(planWardrobeSetup(on, { audience: "toddler", clothingStyle: "bodysuits", owned: [] }), "base");
    expect(slugs(bodies.more)).toEqual(["short_sleeve_top", "long_sleeve_top"]);
  });

  it("puts walking footwear first for toddlers", () => {
    const acc = step(planWardrobeSetup(on, { audience: "toddler", clothingStyle: "both", owned: [] }), "accessories");
    expect(slugs(acc.primary).slice(0, 3)).toEqual(["everyday_shoes", "rain_boots", "winter_boots"]);
  });

  it("never drops an item: primary + more covers every visible item", () => {
    for (const style of ["both", "tops", "bodysuits"] as const) {
      const plan = planWardrobeSetup(on, { audience: "toddler", clothingStyle: style, owned: [] });
      expect(plan.flatMap((s) => [...s.primary, ...s.more]).length).toBe(on.flatMap((s) => s.items).length);
    }
  });

  it("suggests only catalogue slugs", () => {
    const all = new Set(ALL_WARDROBE_STEPS.flatMap((s) => s.items.map((i) => i.slug)));
    for (const s of toddlerSuggestions("both")) expect(all.has(s)).toBe(true);
  });

  it("marks the starter wardrobe as a sample and keeps the mark through upgrade", () => {
    expect(createGuestProfile("3-6m").wardrobeSample).toBe(true);
    const local = createLocalProfile("Mia", "2025-01-01");
    expect(local.wardrobeSample).toBe(true);
    expect(upgradeGuestProfile(local)!.profile.wardrobeSample).toBe(true);
    const legacy = { ...local, wardrobeSample: undefined };
    expect(upgradeGuestProfile(legacy)!.profile.wardrobeSample).toBeUndefined();
  });
});
