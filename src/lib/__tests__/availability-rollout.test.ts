// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { recommend, type RecommendInput } from "@/lib/recommend";
import { localizeClothingText } from "@/lib/clothing-text";
import {
  availabilityBadge,
  garmentDetailFields,
  normalizeGarmentDetails,
} from "@/lib/garment-details";
import { submitGarmentDetails } from "@/lib/garment-details-save";
import {
  createGuestProfile,
  guestGarmentDetails,
  withGuestGarmentDetails,
} from "@/lib/guest-profile";
import {
  extraItemTip,
  guestWardrobeRows,
  hasDetailQuestions,
  resolveEligibleWardrobe,
} from "@/lib/wardrobe-eligibility";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";

const COLD_RAINY_WALK: Omit<RecommendInput, "owned"> = {
  feelsLikeC: -5,
  tempPref: 3,
  situation: "walk",
  transportMode: "sitting-stroller",
  isRaining: true,
  durationMin: 60,
  ageMonths: 8,
};
const BASICS: WardrobeSlug[] = [
  "long_sleeve_bodysuit",
  "pants",
  "sweater",
  "winter_overall",
  "warm_hat",
  "wool_socks",
  "mittens",
  "blanket",
];

function walkNotes(rows: { slug: string; owned: boolean; availability?: string }[], on: boolean) {
  const w = resolveEligibleWardrobe(rows, { availabilityFilter: on });
  return recommend({ ...COLD_RAINY_WALK, owned: w.eligible, setAside: w.setAside }).notes;
}
const owned = (slugs: string[]) => slugs.map((slug) => ({ slug, owned: true }));

describe("availability controls follow the switch", () => {
  it("hides only the Availability question when filtering is off", () => {
    expect(garmentDetailFields("jacket", { availability: false })).toEqual([
      "insulation",
      "waterproof",
    ]);
    expect(garmentDetailFields("jacket", { availability: true })).toEqual([
      "insulation",
      "waterproof",
      "availability",
    ]);
    expect(garmentDetailFields("pajamas", { availability: false })).toEqual([
      "sleepwear_shape",
      "foot_coverage",
    ]);
  });

  it("shows no availability badge while filtering is off", () => {
    expect(availabilityBadge("outgrown", false)).toBeNull();
    expect(availabilityBadge("temporarily_unavailable", false)).toBeNull();
    expect(availabilityBadge("outgrown", true)).toBe("Outgrown");
    expect(availabilityBadge("temporarily_unavailable", true)).toBe("Unavailable");
  });

  it("offers no Details action for an item whose only question is Availability", () => {
    expect(hasDetailQuestions("cotton_socks", false)).toBe(false);
    expect(hasDetailQuestions("cotton_socks", true)).toBe(true);
    expect(hasDetailQuestions("jacket", false)).toBe(true);
  });
});

describe("stored availability survives while hidden", () => {
  it("editing another detail while off writes only that detail (signed-in path)", async () => {
    const current = normalizeGarmentDetails({ availability: "outgrown" });
    const writes: Record<string, unknown>[] = [];
    const res = await submitGarmentDetails(current, { ...current, insulation: "insulated" }, (p) => {
      writes.push(p);
      return Promise.resolve();
    });
    expect(res.status).toBe("saved");
    expect(writes).toEqual([{ insulation: "insulated" }]);
  });

  it("editing another detail while off keeps availability in the phone-kept profile", () => {
    let p = createGuestProfile("6-12m");
    p = { ...p, wardrobe: [...p.wardrobe, "footmuff"] };
    p = withGuestGarmentDetails(p, "footmuff", { availability: "temporarily_unavailable" });
    p = withGuestGarmentDetails(p, "footmuff", { insulation: "insulated" });
    expect(guestGarmentDetails(p, "footmuff")).toMatchObject({
      availability: "temporarily_unavailable",
      insulation: "insulated",
    });
  });

  it("re-enabling filtering restores the saved status and sets the item aside", () => {
    let p = createGuestProfile("6-12m");
    p = { ...p, wardrobe: [...p.wardrobe, "footmuff"] };
    p = withGuestGarmentDetails(p, "footmuff", { availability: "outgrown" });
    p = withGuestGarmentDetails(p, "footmuff", { waterproof: "yes" });
    const off = resolveEligibleWardrobe(guestWardrobeRows(p), { availabilityFilter: false });
    const on = resolveEligibleWardrobe(guestWardrobeRows(p), { availabilityFilter: true });
    expect(off.eligible.has("footmuff")).toBe(true);
    expect(on.eligible.has("footmuff")).toBe(false);
    expect(on.setAside.get("footmuff")).toBe("outgrown");
    expect(on.details.get("footmuff")?.waterproof).toBe("yes");
  });
});

describe("tips distinguish unowned, unavailable and outgrown", () => {
  it("names a temporarily unavailable footmuff as such", () => {
    const notes = walkNotes(
      [...owned(BASICS), { slug: "footmuff", owned: true, availability: "temporarily_unavailable" }],
      true,
    );
    expect(notes).toContain("Your footmuff is marked temporarily unavailable.");
    expect(notes.some((n) => n.startsWith("No footmuff"))).toBe(false);
    expect(localizeClothingText("Your footmuff is marked temporarily unavailable.", "F")).toBe(
      "Your stroller bunting is marked temporarily unavailable.",
    );
  });

  it("names an outgrown footmuff as such", () => {
    const notes = walkNotes(
      [...owned(BASICS), { slug: "footmuff", owned: true, availability: "outgrown" }],
      true,
    );
    expect(notes).toContain("Your footmuff is marked outgrown.");
    expect(localizeClothingText("Your footmuff is marked outgrown.", "F")).toBe(
      "Your stroller bunting is marked outgrown.",
    );
  });

  it("keeps the missing-wardrobe wording for an unowned footmuff", () => {
    for (const on of [true, false]) {
      const notes = walkNotes(
        [...owned(BASICS), { slug: "footmuff", owned: false, availability: "outgrown" }],
        on,
      );
      expect(notes).toContain("No footmuff in your wardrobe — consider one for cold stroller walks.");
    }
  });

  it("applies the same distinction to the rain cover tip", () => {
    const away = walkNotes(
      [...owned(BASICS), { slug: "rain_cover", owned: true, availability: "outgrown" }],
      true,
    );
    expect(away).toContain("Your rain cover is marked outgrown.");
    const none = walkNotes(owned(BASICS), true);
    expect(none).toContain("No rain cover in your wardrobe — consider one to keep baby dry.");
  });

  it("with filtering off, a marked footmuff is used and no tip mentions it", () => {
    const notes = walkNotes(
      [...owned(BASICS), { slug: "footmuff", owned: true, availability: "outgrown" }],
      false,
    );
    expect(notes.some((n) => /footmuff/i.test(n))).toBe(false);
  });

  it("extraItemTip falls back to the unowned wording without set-aside data", () => {
    expect(extraItemTip("footmuff", "footmuff", "No footmuff.")).toBe("No footmuff.");
  });
});
