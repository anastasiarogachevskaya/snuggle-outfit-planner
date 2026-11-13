// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { normalizeGarmentDetails, type GarmentDetails } from "@/lib/garment-details";
import { saveSignedInGarmentDetails, submitGarmentDetails } from "@/lib/garment-details-save";

type Row = { id: string; baby_id: string; slug: string; owned: boolean } & GarmentDetails;

/**
 * In-memory stand-in for the database client's
 * from("wardrobe_items").update().eq().eq().select() chain. It applies the
 * update to matching rows (like the real table) and records every call.
 */
function fakeClient(rows: Row[], opts: { fail?: string } = {}) {
  const calls: { table: string; patch: Record<string, unknown>; filters: [string, string][] }[] =
    [];
  const client = {
    from(table: string) {
      return {
        update(patch: Record<string, unknown>) {
          const filters: [string, string][] = [];
          calls.push({ table, patch, filters });
          const chain = {
            eq(col: string, val: string) {
              filters.push([col, val]);
              return chain;
            },
            async select() {
              if (opts.fail) return { data: null, error: { message: opts.fail } };
              const hit = rows.filter((r) =>
                filters.every(([c, v]) => (r as Record<string, unknown>)[c] === v),
              );
              hit.forEach((r) => Object.assign(r, patch));
              return { data: hit.map((r) => ({ slug: r.slug })), error: null };
            },
          };
          return chain;
        },
      };
    },
  };
  return { client: client as never, calls };
}

const row = (
  baby_id: string,
  slug: string,
  details: Partial<GarmentDetails> = {},
  owned = true,
): Row => ({
  id: `${baby_id}-${slug}`,
  baby_id,
  slug,
  owned,
  ...normalizeGarmentDetails(details),
});

function seed() {
  return [
    row("baby-a", "winter_overall", { insulation: "insulated", waterproof: "yes" }),
    row("baby-a", "pajamas", { foot_coverage: "footed" }),
    row("baby-a", "jacket", {}, false),
    // Same garment for a sibling: must never be touched by baby-a's edits.
    row("baby-b", "winter_overall", { insulation: "light" }),
  ];
}

describe("signed-in garment details save", () => {
  it("targets the right child and garment and writes only the changed property", async () => {
    const rows = seed();
    const before = structuredClone(rows);
    const { client, calls } = fakeClient(rows);
    const current = normalizeGarmentDetails(rows[0]);

    const res = await submitGarmentDetails(current, { ...current, waterproof: "no" }, (patch) =>
      saveSignedInGarmentDetails(client, "baby-a", "winter_overall", patch),
    );

    expect(res).toEqual({ status: "saved" });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe("wardrobe_items");
    expect(calls[0].filters).toEqual([
      ["baby_id", "baby-a"],
      ["slug", "winter_overall"],
    ]);
    expect(calls[0].patch).toEqual({ waterproof: "no" });
    // Ownership, ID and untouched details stay as they were.
    expect(rows[0]).toEqual({ ...before[0], waterproof: "no" });
    expect(rows.slice(1)).toEqual(before.slice(1));
  });

  it("clears a property back to Not sure", async () => {
    const rows = seed();
    const { client, calls } = fakeClient(rows);
    const current = normalizeGarmentDetails(rows[0]);
    await submitGarmentDetails(current, { ...current, insulation: "unknown" }, (p) =>
      saveSignedInGarmentDetails(client, "baby-a", "winter_overall", p),
    );
    expect(calls[0].patch).toEqual({ insulation: "unknown" });
    expect(rows[0]).toMatchObject({
      insulation: "unknown",
      waterproof: "yes",
      owned: true,
      availability: "available",
    });
  });

  it("restores availability without touching other details or ownership", async () => {
    const rows = seed();
    rows[1].availability = "outgrown";
    const { client, calls } = fakeClient(rows);
    const current = normalizeGarmentDetails(rows[1]);
    await submitGarmentDetails(current, { ...current, availability: "available" }, (p) =>
      saveSignedInGarmentDetails(client, "baby-a", "pajamas", p),
    );
    expect(calls[0].patch).toEqual({ availability: "available" });
    expect(rows[1]).toMatchObject({
      availability: "available",
      foot_coverage: "footed",
      owned: true,
      id: "baby-a-pajamas",
    });
  });

  it("never sends ownership or unknown columns, even if passed in", async () => {
    const rows = seed();
    const { client, calls } = fakeClient(rows);
    await saveSignedInGarmentDetails(client, "baby-a", "jacket", {
      insulation: "light",
      owned: true,
      baby_id: "baby-b",
    } as Partial<GarmentDetails>);
    expect(calls[0].patch).toEqual({ insulation: "light" });
    expect(rows[2]).toMatchObject({ owned: false, baby_id: "baby-a", insulation: "light" });
  });

  it("makes no write when nothing changed", async () => {
    const rows = seed();
    const { client, calls } = fakeClient(rows);
    const current = normalizeGarmentDetails(rows[0]);
    const res = await submitGarmentDetails(current, current, (p) =>
      saveSignedInGarmentDetails(client, "baby-a", "winter_overall", p),
    );
    expect(res).toEqual({ status: "unchanged" });
    expect(calls).toHaveLength(0);
  });

  it("keeps the parent's edits and stored data when the save fails", async () => {
    const rows = seed();
    const before = structuredClone(rows);
    const { client } = fakeClient(rows, { fail: "Network error" });
    const current = normalizeGarmentDetails(rows[0]);
    const draft: GarmentDetails = {
      ...current,
      insulation: "light",
      availability: "temporarily_unavailable",
    };

    const res = await submitGarmentDetails(current, draft, (p) =>
      saveSignedInGarmentDetails(client, "baby-a", "winter_overall", p),
    );

    expect(res.status).toBe("failed");
    if (res.status !== "failed") return;
    expect(res.draft).toEqual(draft);
    expect(res.message).toContain("Network error");
    expect(res.message).toContain("weren't saved");
    expect(rows).toEqual(before);
  });

  it("treats a save that matched no row (wrong child or missing item) as failed", async () => {
    const rows = seed();
    const before = structuredClone(rows);
    const { client } = fakeClient(rows);
    const current = normalizeGarmentDetails(undefined);
    const draft: GarmentDetails = { ...current, insulation: "insulated" };
    const res = await submitGarmentDetails(current, draft, (p) =>
      saveSignedInGarmentDetails(client, "baby-c", "winter_overall", p),
    );
    expect(res).toMatchObject({ status: "failed", draft });
    expect(rows).toEqual(before);
  });
});
