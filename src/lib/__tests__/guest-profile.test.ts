// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  GUEST_STORAGE_KEY,
  GUEST_AGE_OPTIONS,
  GUEST_DEFAULT_WARDROBE,
  dobFromAgeBand,
  createGuestProfile,
  readGuestProfile,
  writeGuestProfile,
  clearGuestProfile,
  type GuestAgeBand,
} from "../guest-profile";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const originalWindow = (globalThis as { window?: unknown }).window;

beforeEach(() => {
  (globalThis as { window?: unknown }).window = { localStorage: memoryStorage() };
});

afterEach(() => {
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = originalWindow;
});

describe("age bands", () => {
  it("option ids are unique and months increase", () => {
    const ids = GUEST_AGE_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < GUEST_AGE_OPTIONS.length; i++) {
      expect(GUEST_AGE_OPTIONS[i].months).toBeGreaterThan(GUEST_AGE_OPTIONS[i - 1].months);
    }
  });

  it("dobFromAgeBand returns an ISO date matching the band midpoint", () => {
    for (const option of GUEST_AGE_OPTIONS) {
      const dob = dobFromAgeBand(option.id);
      expect(dob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const ageDays = (Date.now() - new Date(dob).getTime()) / 86_400_000;
      const expected = Math.round(option.months * 30.44);
      expect({ id: option.id, ok: Math.abs(ageDays - expected) <= 1.5 }).toEqual({ id: option.id, ok: true });
    }
  });

  it("older bands produce earlier birth dates", () => {
    const dobs = GUEST_AGE_OPTIONS.map((o) => dobFromAgeBand(o.id));
    for (let i = 1; i < dobs.length; i++) {
      expect(new Date(dobs[i]).getTime()).toBeLessThan(new Date(dobs[i - 1]).getTime());
    }
  });

  it("falls back to ~3 months for an unknown band", () => {
    const dob = dobFromAgeBand("nonsense" as GuestAgeBand);
    const ageDays = (Date.now() - new Date(dob).getTime()) / 86_400_000;
    expect(Math.abs(ageDays - Math.round(3 * 30.44))).toBeLessThanOrEqual(1.5);
  });
});

describe("createGuestProfile", () => {
  it("creates a usable default profile for the band", () => {
    const p = createGuestProfile("3-6m");
    expect(p.ageBand).toBe("3-6m");
    expect(p.dob).toBe(dobFromAgeBand("3-6m"));
    expect(p.name).toBe("Baby");
    expect(p.temperaturePref).toBe(3);
    expect(p.latitude).toBeNull();
    expect(p.longitude).toBeNull();
    expect(p.locationLabel).toBeNull();
    expect(Number.isNaN(new Date(p.createdAt).getTime())).toBe(false);
  });
});

describe("guest profile storage", () => {
  it("round-trips through localStorage", () => {
    const p = createGuestProfile("6-12m");
    writeGuestProfile(p);
    expect(window.localStorage.getItem(GUEST_STORAGE_KEY)).toBe(JSON.stringify(p));
    expect(readGuestProfile()).toEqual(p);
  });

  it("returns null when nothing is stored", () => {
    expect(readGuestProfile()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, "{not json");
    expect(readGuestProfile()).toBeNull();
  });

  it("returns null for a stored object without a dob", () => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ name: "Baby" }));
    expect(readGuestProfile()).toBeNull();
  });

  it("clearGuestProfile removes the entry", () => {
    writeGuestProfile(createGuestProfile("newborn"));
    clearGuestProfile();
    expect(window.localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
    expect(readGuestProfile()).toBeNull();
  });

  it("is a no-op without a window (SSR)", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(readGuestProfile()).toBeNull();
    expect(() => writeGuestProfile(createGuestProfile("1-3m"))).not.toThrow();
    expect(() => clearGuestProfile()).not.toThrow();
  });
});

describe("GUEST_DEFAULT_WARDROBE", () => {
  it("has no duplicates and covers base, mid and accessories", () => {
    expect(new Set(GUEST_DEFAULT_WARDROBE).size).toBe(GUEST_DEFAULT_WARDROBE.length);
    expect(GUEST_DEFAULT_WARDROBE).toContain("short_sleeve_bodysuit");
    expect(GUEST_DEFAULT_WARDROBE).toContain("sweater");
    expect(GUEST_DEFAULT_WARDROBE).toContain("thin_hat");
  });
});
