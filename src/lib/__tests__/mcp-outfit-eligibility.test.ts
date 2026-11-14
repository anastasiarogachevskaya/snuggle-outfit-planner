// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it, mock } from "bun:test";
import { toddlerSupportEnabled } from "@/lib/feature-flags";
import { recommend } from "@/lib/recommend";
import { normalizeOutingContext, outingEngineFields } from "@/lib/outing-context";
import { resolveEligibleWardrobe } from "@/lib/wardrobe-eligibility";
import { ageInMonths } from "@/lib/baby-age";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]> = {};

// Fixture database for the assistant tool. Keep the module's full shape:
// mock.module is process-wide in bun.
mock.module("@/lib/mcp/supabase", () => ({
  supabaseForUser: () => ({
    from(table: string) {
      const filters: [string, unknown][] = [];
      const rows = () => (tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v));
      const chain = {
        select: () => chain,
        eq(col: string, val: unknown) {
          filters.push([col, val]);
          // wardrobe_items is awaited straight after .eq(); babies continues to maybeSingle().
          return Object.assign(Promise.resolve({ data: rows(), error: null }), chain);
        },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      };
      return chain;
    },
  }),
  textResult: (value: unknown, structured?: Record<string, unknown>) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    ...(structured ? { structuredContent: structured } : {}),
  }),
  errorResult: (message: string) => ({
    content: [{ type: "text" as const, text: message }],
    isError: true,
  }),
}));

const { default: tool } = await import("@/lib/mcp/tools/get-outfit-recommendation");

const ctx = { isAuthenticated: () => true, getToken: () => "t" } as never;
const run = async (overrides: Row = {}) => {
  const res = (await tool.handler(
    {
      baby_id: "a",
      situation: "walk",
      transport_mode: "sitting-stroller",
      duration_min: 60,
      feels_like_c: -5,
      ...overrides,
    } as never,
    ctx,
  )) as {
    structuredContent: {
      wardrobe: { set_aside: { slug: string }[]; availability_filter_applied: boolean };
      recommendation: {
        transportExtras: { slug: string }[];
        missingHelpfulItems: { slug: string }[];
        notes: string[];
      };
    };
  };
  return res.structuredContent;
};

const baby = {
  id: "a",
  name: "Test",
  dob: "2025-12-01",
  temperature_pref: 3,
  latitude: null,
  longitude: null,
  location_label: null,
};
const item = (slug: string, extra: Row = {}) => ({ baby_id: "a", slug, owned: true, ...extra });

describe("assistant outfit tool", () => {
  it("applies the same eligibility rule as the app, following the rollout switch", async () => {
    tables = {
      babies: [baby],
      wardrobe_items: [
        item("footmuff", { availability: "temporarily_unavailable", insulation: "insulated" }),
        item("rain_cover"),
        item("blanket", { owned: false }),
        item("winter_overall"),
      ],
    };
    const out = await run();
    const extras = out.recommendation.transportExtras.map((e) => e.slug);
    expect(out.wardrobe.availability_filter_applied).toBe(toddlerSupportEnabled());
    // Explicitly unowned is never used, in any rollout state.
    expect(extras).not.toContain("blanket");
    if (toddlerSupportEnabled()) {
      expect(extras).not.toContain("footmuff");
      expect(out.wardrobe.set_aside).toEqual([
        { slug: "footmuff", availability: "temporarily_unavailable" },
      ] as never);
    } else {
      expect(extras).toContain("footmuff");
      expect(out.wardrobe.set_aside).toEqual([]);
    }
  });

  it("an empty eligible wardrobe gets no owned transport extras", async () => {
    tables = { babies: [baby], wardrobe_items: [item("footmuff", { owned: false })] };
    const out = await run();
    expect(out.recommendation.transportExtras).toEqual([]);
    expect(out.recommendation.missingHelpfulItems.map((e) => e.slug)).toContain("footmuff");
  });

  it("tips name a set-aside footmuff as unavailable, an unowned one as missing", async () => {
    tables = {
      babies: [baby],
      wardrobe_items: [item("footmuff", { availability: "temporarily_unavailable" })],
    };
    const away = (await run()).recommendation.notes;
    if (toddlerSupportEnabled()) {
      expect(away).toContain("Your footmuff is marked temporarily unavailable.");
      expect(away.some((n) => n.startsWith("No footmuff"))).toBe(false);
    } else {
      expect(away.some((n) => /footmuff/i.test(n))).toBe(false);
    }
    tables = { babies: [baby], wardrobe_items: [item("footmuff", { owned: false })] };
    expect((await run()).recommendation.notes).toContain(
      "No footmuff in your wardrobe — consider one for cold stroller walks.",
    );
  });

  it("normalizes the outing the same way as Today, without changing outfits", async () => {
    tables = {
      babies: [baby],
      wardrobe_items: ["winter_overall", "footmuff", "blanket", "babywearing_cover", "warm_hat"].map(
        (s) => item(s),
      ),
    };
    const eligible = resolveEligibleWardrobe(tables.wardrobe_items as never);
    const ageMonths = ageInMonths(baby.dob);
    for (const [situation, transport_mode] of [
      ["walk", "sitting-stroller"],
      ["walk", "carrier"],
      ["walk", undefined],
      ["car", "pram"],
      ["home", "pram"],
    ] as const) {
      const out = await run({ situation, transport_mode, room_temp_c: 21 });
      const expected = recommend({
        feelsLikeC: -5,
        tempPref: 3,
        ...outingEngineFields(normalizeOutingContext({ situation, transportMode: transport_mode })),
        roomTempC: 21,
        durationMin: 60,
        owned: eligible.eligible,
        setAside: eligible.setAside,
        ageMonths,
      });
      expect(out.recommendation).toEqual(expected as never);
    }
  });
});
