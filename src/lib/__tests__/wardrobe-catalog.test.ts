// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import {
  WARDROBE_STEPS,
  WARDROBE_CATALOG,
  LABEL_BY_SLUG,
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
      expect({ slug: item.slug, ok: item.label.length > 0 && item.hint.length > 0 && item.emoji.length > 0 }).toEqual({
        slug: item.slug,
        ok: true,
      });
    }
  });

  it("every step has an id, title, question and at least one item", () => {
    for (const step of WARDROBE_STEPS) {
      expect({ id: step.id, ok: !!step.title && !!step.question && step.items.length > 0 }).toEqual({
        id: step.id,
        ok: true,
      });
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
    expect(Object.keys(LABEL_BY_SLUG).length).toBe(allItems.length);
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
