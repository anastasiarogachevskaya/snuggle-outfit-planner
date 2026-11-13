// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { recommend, type RecommendInput } from "@/lib/recommend";
import { applyBottomChoice, compareBottoms } from "@/lib/recommend/compare-bottoms";
import { toddlerSupportEnabled } from "@/lib/feature-flags";
import { normalizeGarmentDetails } from "@/lib/garment-details";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";
import {
  WARDROBE_ITEM_COLUMNS,
  availabilityFilteringEnabled,
  fetchWardrobeItems,
  guestWardrobeRows,
  missingItemNote,
  resolveEligibleWardrobe,
  type WardrobeItemRow,
} from "@/lib/wardrobe-eligibility";

const ON = { availabilityFilter: true };
const OFF = { availabilityFilter: false };

const row = (slug: string, extra: Partial<WardrobeItemRow> = {}): WardrobeItemRow => ({
  slug,
  owned: true,
  ...extra,
});

/** Fake database client: from("wardrobe_items").select(cols).eq("baby_id", id). */
function fakeClient(rows: (WardrobeItemRow & { baby_id: string })[], fail?: string) {
  const calls: { table: string; columns: string; filters: [string, string][] }[] = [];
  const client = {
    from(table: string) {
      return {
        select(columns: string) {
          const call = { table, columns, filters: [] as [string, string][] };
          calls.push(call);
          return {
            async eq(col: string, val: string) {
              call.filters.push([col, val]);
              if (fail) return { data: null, error: { message: fail } };
              return {
                data: rows
                  .filter((r) => (r as Record<string, unknown>)[col] === val)
                  .map(({ baby_id: _b, ...rest }) => rest),
                error: null,
              };
            },
          };
        },
      };
    },
  };
  return { client: client as never, calls };
}

const COLD_WALK: Omit<RecommendInput, "owned"> = {
  feelsLikeC: -5,
  tempPref: 3,
  situation: "walk",
  transportMode: "sitting-stroller",
  isRaining: true,
  durationMin: 60,
  ageMonths: 8,
};
const COLD_WARDROBE = [
  "long_sleeve_bodysuit", "pants", "leggings", "wool_leggings", "sweater", "hoodie",
  "winter_overall", "warm_hat", "wool_socks", "mittens", "footmuff", "rain_cover", "blanket",
];

describe("wardrobe eligibility", () => {
  it("treats legacy rows without availability as available", () => {
    const w = resolveEligibleWardrobe([row("jacket"), row("pants", { availability: null })], ON);
    expect([...w.eligible].sort()).toEqual(["jacket", "pants"]);
    expect(w.setAside.size).toBe(0);
    expect(w.details.get("jacket")?.availability).toBe("available");
  });

  it("never uses explicitly unowned items, whether filtering is on or off", () => {
    const rows = [row("jacket", { owned: false }), row("pants", { owned: null }), row("leggings")];
    for (const opts of [ON, OFF]) {
      const w = resolveEligibleWardrobe(rows, opts);
      expect([...w.eligible]).toEqual(["leggings"]);
      expect(w.details.has("jacket")).toBe(false);
    }
  });

  it("sets aside outgrown and temporarily unavailable items only while filtering is on", () => {
    const rows = [
      row("jacket", { availability: "outgrown" }),
      row("footmuff", { availability: "temporarily_unavailable" }),
      row("pants"),
    ];
    const on = resolveEligibleWardrobe(rows, ON);
    expect([...on.eligible]).toEqual(["pants"]);
    expect(on.setAside.get("jacket")).toBe("outgrown");
    expect(on.setAside.get("footmuff")).toBe("temporarily_unavailable");
    expect(on.availabilityApplied).toBe(true);

    const off = resolveEligibleWardrobe(rows, OFF);
    expect([...off.eligible].sort()).toEqual(["footmuff", "jacket", "pants"]);
    expect(off.setAside.size).toBe(0);
    expect(off.availabilityApplied).toBe(false);
  });

  it("follows the toddler rollout switch by default", () => {
    expect(availabilityFilteringEnabled()).toBe(toddlerSupportEnabled());
    const w = resolveEligibleWardrobe([row("jacket", { availability: "outgrown" })]);
    expect(w.availabilityApplied).toBe(toddlerSupportEnabled());
    expect(w.eligible.has("jacket")).toBe(!toddlerSupportEnabled());
  });

  it("keeps saved garment details for set-aside and eligible items, unchanged", () => {
    const stored = { insulation: "insulated", waterproof: "yes", availability: "outgrown" } as const;
    const w = resolveEligibleWardrobe(
      [row("winter_overall", stored), row("pajamas", { foot_coverage: "footed", sleepwear_shape: "one_piece" })],
      ON,
    );
    expect(w.details.get("winter_overall")).toEqual(normalizeGarmentDetails(stored));
    expect(w.details.get("pajamas")).toEqual(
      normalizeGarmentDetails({ foot_coverage: "footed", sleepwear_shape: "one_piece" }),
    );
  });

  it("restoring an item to Available returns it to recommendations", () => {
    const before = resolveEligibleWardrobe([row("footmuff", { availability: "outgrown" })], ON);
    const after = resolveEligibleWardrobe([row("footmuff", { availability: "available" })], ON);
    expect(before.eligible.has("footmuff")).toBe(false);
    expect(after.eligible.has("footmuff")).toBe(true);
  });

  it("names set-aside items as such and everything else as not in the wardrobe", () => {
    const w = resolveEligibleWardrobe(
      [row("jacket", { availability: "outgrown" }), row("footmuff", { availability: "temporarily_unavailable" })],
      ON,
    );
    expect(missingItemNote("jacket", w.setAside)).toBe("Marked outgrown in your wardrobe");
    expect(missingItemNote("footmuff", w.setAside)).toBe("Marked unavailable in your wardrobe");
    expect(missingItemNote("mittens", w.setAside)).toBe("Not in your wardrobe");
  });
});

describe("recommendations use only the eligible wardrobe", () => {
  const rowsWith = (aside: Record<string, "outgrown" | "temporarily_unavailable">) =>
    COLD_WARDROBE.map((s) => row(s, aside[s] ? { availability: aside[s] } : {}));

  it("an availability-only change (same slugs, same ownership) changes transport extras", () => {
    const available = resolveEligibleWardrobe(rowsWith({}), ON);
    const away = resolveEligibleWardrobe(rowsWith({ footmuff: "temporarily_unavailable" }), ON);
    const a = recommend({ ...COLD_WALK, owned: available.eligible });
    const b = recommend({ ...COLD_WALK, owned: away.eligible });
    expect(a.transportExtras.map((e) => e.slug)).toContain("footmuff");
    expect(b.transportExtras.map((e) => e.slug)).not.toContain("footmuff");
    expect(b.missingHelpfulItems.map((e) => e.slug)).toContain("footmuff");
  });

  it("with filtering off, an unavailable footmuff is still used (legacy behaviour)", () => {
    const off = resolveEligibleWardrobe(rowsWith({ footmuff: "temporarily_unavailable" }), OFF);
    expect(recommend({ ...COLD_WALK, owned: off.eligible }).transportExtras.map((e) => e.slug)).toContain("footmuff");
  });

  it("substitutes an available garment for an outgrown one", () => {
    const w = resolveEligibleWardrobe(rowsWith({ sweater: "outgrown" }), ON);
    const mid = recommend({ ...COLD_WALK, owned: w.eligible }).babyClothing.find((l) => l.slot === "mid");
    expect(mid?.slug).not.toBe("sweater");
    expect(w.eligible.has(mid!.slug as WardrobeSlug)).toBe(true);
  });

  it("marks a required garment as missing when its only match is outgrown", () => {
    const w = resolveEligibleWardrobe(rowsWith({ winter_overall: "outgrown" }), ON);
    const rec = recommend({ ...COLD_WALK, owned: w.eligible });
    expect(rec.missing).toContain("winter_overall");
  });

  it("skips an unavailable sleep sack and returns to it once restored", () => {
    const sacks = (avail: "available" | "outgrown") => [
      row("sleep_sack_10"),
      row("sleep_sack_25", { availability: avail }),
      row("sleep_sack_35"),
      row("pajamas"),
    ];
    const sleep = (rows: WardrobeItemRow[]) =>
      recommend({
        feelsLikeC: 0,
        tempPref: 3,
        situation: "home",
        homeActivity: "sleeping",
        roomTempC: 18,
        ageMonths: 8,
        owned: resolveEligibleWardrobe(rows, ON).eligible,
      }).sleepAccessories.map((a) => a.slug);
    expect(sleep(sacks("available"))).toContain("sleep_sack_25");
    const away = sleep(sacks("outgrown"));
    expect(away).not.toContain("sleep_sack_25");
    expect(away.some((s) => s.startsWith("sleep_sack_"))).toBe(true);
  });

  it("bottoms comparison only offers eligible bottoms as owned", () => {
    const w = resolveEligibleWardrobe(rowsWith({ wool_leggings: "outgrown" }), ON);
    const rec = recommend({ ...COLD_WALK, owned: w.eligible });
    const { options } = compareBottoms(rec, w.eligible);
    expect(options.length).toBeGreaterThan(0);
    expect(options.find((o) => o.slug === "wool_leggings")?.owned).toBe(false);
    expect(options.find((o) => o.slug === "pants")?.owned).toBe(true);
    // Applying a bottom never pulls a set-aside garment into the outfit as owned.
    const applied = applyBottomChoice(rec, "leggings", w.eligible);
    for (const l of [...applied.babyClothing, ...applied.accessories]) {
      if (w.setAside.has(l.slug as WardrobeSlug)) expect(w.eligible.has(l.slug as WardrobeSlug)).toBe(false);
    }
  });

  it("a loaded wardrobe with nothing available stays empty — no sample clothes", () => {
    const w = resolveEligibleWardrobe(
      COLD_WARDROBE.map((s) => row(s, { availability: "outgrown" })),
      ON,
    );
    expect(w.eligible.size).toBe(0);
    expect(w.details.size).toBe(COLD_WARDROBE.length);
    const rec = recommend({ ...COLD_WALK, owned: w.eligible });
    expect(rec.transportExtras).toEqual([]);
    expect(rec.optionalTransportExtras.every((e) => !e.owned)).toBe(true);
    expect(rec.missing.length).toBeGreaterThan(0);
    for (const l of rec.babyClothing) expect(l.usingLabel).toBeUndefined();
    const home = recommend({
      feelsLikeC: 0, tempPref: 3, situation: "home", homeActivity: "sleeping", roomTempC: 18, ageMonths: 8,
      owned: w.eligible,
    });
    expect(home.sleepAccessories).toEqual([]);
  });
});

describe("phone-kept, signed-in and assistant paths agree", () => {
  const details = {
    footmuff: { availability: "outgrown" as const, insulation: "insulated" as const },
    winter_overall: { waterproof: "yes" as const },
  };
  const guest = { wardrobe: ["footmuff", "winter_overall", "pants"] as WardrobeSlug[], wardrobeDetails: details };
  const dbRows = [
    { baby_id: "a", ...row("footmuff", { availability: "outgrown", insulation: "insulated" }) },
    { baby_id: "a", ...row("winter_overall", { waterproof: "yes", availability: "available" }) },
    { baby_id: "a", ...row("pants") },
    { baby_id: "a", ...row("jacket", { owned: false }) },
    { baby_id: "b", ...row("mittens") },
  ];

  it("produces the same eligible wardrobe, set-aside list and details", async () => {
    const { client, calls } = fakeClient(dbRows);
    for (const opts of [ON, OFF]) {
      const fromGuest = resolveEligibleWardrobe(guestWardrobeRows(guest), opts);
      const fromDb = resolveEligibleWardrobe(await fetchWardrobeItems(client, "a"), opts);
      expect([...fromDb.eligible].sort()).toEqual([...fromGuest.eligible].sort());
      expect([...fromDb.setAside]).toEqual([...fromGuest.setAside]);
      expect(Object.fromEntries(fromDb.details)).toEqual(Object.fromEntries(fromGuest.details));
    }
    expect(calls[0]).toEqual({ table: "wardrobe_items", columns: WARDROBE_ITEM_COLUMNS, filters: [["baby_id", "a"]] });
  });

  it("only reads the requested child's rows", async () => {
    const { client } = fakeClient(dbRows);
    const w = resolveEligibleWardrobe(await fetchWardrobeItems(client, "a"), ON);
    expect(w.eligible.has("mittens")).toBe(false);
  });

  it("a failed read throws instead of looking like an empty wardrobe", async () => {
    const { client } = fakeClient(dbRows, "network down");
    await expect(fetchWardrobeItems(client, "a")).rejects.toThrow("network down");
  });

  it("an empty phone-kept wardrobe stays empty", () => {
    const w = resolveEligibleWardrobe(guestWardrobeRows({ wardrobe: [] }), ON);
    expect(w.eligible.size).toBe(0);
  });
});
