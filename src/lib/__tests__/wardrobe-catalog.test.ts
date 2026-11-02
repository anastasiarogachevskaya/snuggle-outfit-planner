// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import {
  WARDROBE_STEPS,
  WARDROBE_CATALOG,
  LABEL_BY_SLUG,
  ITEM_BY_SLUG,
  QUICK_SETUP_OWNED,
  DEFAULT_OWNED,
} from "../wardrobe-catalog";
import { GUEST_DEFAULT_WARDROBE } from "../guest-profile";
import { TOG_ITEMS } from "../recommend/pick-sleep";

const allItems = WARDROBE_STEPS.flatMap((s) => s.items);
const allSlugs = new Set(allItems.map((i) => i.slug));

describe("wardrobe catalog", () => {
  it("has no duplicate slugs", () => {
    expect(allSlugs.size).toBe(allItems.length);
  });

  it("every item has a label, hint and emoji", () => {
    for (const item of allItems) {
      expect({
        slug: item.slug,
        ok: item.label.length > 0 && item.hint.length > 0 && item.emoji.length > 0,
      }).toEqual({
        slug: item.slug,
        ok: true,
      });
    }
  });

  it("distinguishes light merino from warm wool in plain language", () => {
    expect(ITEM_BY_SLUG.light_merino_layer.warmth).toBe("Light");
    expect(ITEM_BY_SLUG.light_merino_layer.hint).toContain("Thin");
    expect(ITEM_BY_SLUG.wool_layer.label).toBe("Warm wool layer");
    expect(ITEM_BY_SLUG.wool_layer.hint).toContain("Thick");
  });

  it("every step has an id, title, question and at least one item", () => {
    for (const step of WARDROBE_STEPS) {
      expect({ id: step.id, ok: !!step.title && !!step.question && step.items.length > 0 }).toEqual(
        {
          id: step.id,
          ok: true,
        },
      );
    }
  });

  it("step ids are unique", () => {
    const ids = WARDROBE_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("WARDROBE_CATALOG mirrors the steps and carries the group title", () => {
    expect(WARDROBE_CATALOG.length).toBe(allItems.length);
    for (const entry of WARDROBE_CATALOG) {
      expect(allSlugs.has(entry.slug)).toBe(true);
      expect(WARDROBE_STEPS.some((s) => s.title === entry.group)).toBe(true);
    }
  });

  it("LABEL_BY_SLUG covers every slug", () => {
    for (const item of allItems) {
      expect(LABEL_BY_SLUG[item.slug]).toBe(item.label);
    }
    expect(Object.keys(LABEL_BY_SLUG).length).toBe(ALL_WARDROBE_STEPS.flatMap((s) => s.items).length);
  });

  it("all TOG sleep sacks exist in the catalog with their rating in the label", () => {
    for (const tog of TOG_ITEMS) {
      expect(allSlugs.has(tog.slug)).toBe(true);
      expect(LABEL_BY_SLUG[tog.slug]).toContain(String(tog.tog));
    }
  });

  it("quick-setup and guest starter sets only reference real slugs", () => {
    for (const slug of [...QUICK_SETUP_OWNED, ...GUEST_DEFAULT_WARDROBE]) {
      expect({ slug, known: allSlugs.has(slug) }).toEqual({ slug, known: true });
    }
  });

  it("quick-setup has no duplicates and DEFAULT_OWNED matches it", () => {
    expect(new Set(QUICK_SETUP_OWNED).size).toBe(QUICK_SETUP_OWNED.length);
    expect(DEFAULT_OWNED).toEqual(QUICK_SETUP_OWNED);
  });
});

import { visibleWardrobeSteps, ALL_WARDROBE_STEPS } from "../wardrobe-catalog";

const TODDLER_SLUGS = [
  "short_sleeve_top",
  "long_sleeve_top",
  "thermal_top",
  "thermal_bottom",
  "waterproof_jacket",
  "rain_pants",
  "everyday_shoes",
  "rain_boots",
];

describe("toddler garment types", () => {
  const on = visibleWardrobeSteps(true).flatMap((s) => s.items.map((i) => i.slug as string));
  const off = visibleWardrobeSteps(false).flatMap((s) => s.items.map((i) => i.slug as string));

  it("each of the eight types exists exactly once", () => {
    for (const slug of TODDLER_SLUGS) expect({ slug, n: on.filter((s) => s === slug).length }).toEqual({ slug, n: 1 });
  });

  it("none is owned by default or preselected", () => {
    for (const slug of TODDLER_SLUGS) {
      expect((QUICK_SETUP_OWNED as string[]).includes(slug)).toBe(false);
      expect((DEFAULT_OWNED as string[]).includes(slug)).toBe(false);
      expect((GUEST_DEFAULT_WARDROBE as string[]).includes(slug)).toBe(false);
    }
  });

  it("switch off hides them and keeps every infant item", () => {
    for (const slug of TODDLER_SLUGS) expect(off.includes(slug)).toBe(false);
    const infant = ALL_WARDROBE_STEPS.flatMap((s) => s.items).filter((i) => !i.toddlerOnly);
    expect(off.length).toBe(infant.length);
  });

  it("base-layer question depends on the switch", () => {
    expect(visibleWardrobeSteps(false).find((s) => s.id === "base")!.question).toBe("Which bodysuits do you have?");
    expect(visibleWardrobeSteps(true).find((s) => s.id === "base")!.question).toBe("Which base layers do you have?");
  });

  it("legacy snow_pants keeps its neutral label in both states and stays separate from rain_pants", () => {
    for (const enabled of [false, true]) {
      const item = visibleWardrobeSteps(enabled).flatMap((s) => s.items).find((i) => i.slug === "snow_pants")!;
      expect(item.label).toBe("Rain / snow pants");
      expect(item.hint).toBe("Protective outer bottoms");
      // Its warmth tag is a display hint only, not confirmation of insulation.
      expect(/insulat/i.test(item.label + item.hint + (item.explanation ?? ""))).toBe(false);
    }
    expect(ITEM_BY_SLUG.rain_pants.label).toBe("Rain pants");
    expect(ITEM_BY_SLUG.rain_pants.label).not.toBe(ITEM_BY_SLUG.snow_pants.label);
  });
});
