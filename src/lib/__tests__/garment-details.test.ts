// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { normalizeGarmentDetails, isUsable, DEFAULT_GARMENT_DETAILS } from "@/lib/garment-details";
import { upgradeGuestProfile, GUEST_PROFILE_VERSION, guestGarmentDetails } from "@/lib/guest-profile";

const v1 = {
  dob: "2026-01-10",
  name: "Mila",
  temperaturePref: 4,
  latitude: 60.1,
  longitude: 24.9,
  locationLabel: "Helsinki",
  wardrobe: ["snow_pants", "winter_overall", "wool_leggings"],
  feedback: [{ rating: "cold", createdAt: "2026-10-01T08:00:00Z" }],
  createdAt: "2026-02-01T00:00:00Z",
};

describe("garment details", () => {
  it("missing properties are unknown and legacy items stay available", () => {
    expect(normalizeGarmentDetails(undefined)).toEqual(DEFAULT_GARMENT_DETAILS);
    expect(DEFAULT_GARMENT_DETAILS.availability).toBe("available");
  });
  it("invalid values fall back to unknown", () => {
    expect(normalizeGarmentDetails({ insulation: "toasty", waterproof: true }).insulation).toBe("unknown");
  });
  it("outgrown or temporarily unavailable items are not usable", () => {
    expect(isUsable({ owned: true, availability: "outgrown" })).toBe(false);
    expect(isUsable({ owned: true, availability: "temporarily_unavailable" })).toBe(false);
    expect(isUsable({ owned: true })).toBe(true);
  });
});

describe("local profile upgrade", () => {
  it("keeps ownership, feedback and profile fields", () => {
    const up = upgradeGuestProfile(structuredClone(v1))!;
    expect(up.changed).toBe(true);
    expect(up.profile.version).toBe(GUEST_PROFILE_VERSION);
    expect(up.profile.wardrobe).toEqual(v1.wardrobe);
    expect(up.profile.feedback).toEqual(v1.feedback);
    expect(up.profile.name).toBe("Mila");
    expect(up.profile.locationLabel).toBe("Helsinki");
  });
  it("is repeatable", () => {
    const once = upgradeGuestProfile(structuredClone(v1))!.profile;
    const twice = upgradeGuestProfile(JSON.parse(JSON.stringify(once)))!;
    expect(twice.changed).toBe(false);
    expect(twice.profile).toEqual(once);
  });
  it("does not guess snow_pants or jacket properties from the slug", () => {
    const p = upgradeGuestProfile(structuredClone(v1))!.profile;
    const d = guestGarmentDetails(p, "snow_pants");
    expect(d.insulation).toBe("unknown");
    expect(d.waterproof).toBe("unknown");
  });
  it("keeps stated details through reload", () => {
    const withDetails = { ...v1, wardrobeDetails: { wool_leggings: { leggings_use: "standalone" }, pajamas: { sleepwear_shape: "two_piece", foot_coverage: "footed" } } };
    const p = upgradeGuestProfile(JSON.parse(JSON.stringify(withDetails)))!.profile;
    const again = upgradeGuestProfile(JSON.parse(JSON.stringify(p)))!.profile;
    expect(guestGarmentDetails(again, "wool_leggings").leggings_use).toBe("standalone");
    expect(guestGarmentDetails(again, "pajamas").foot_coverage).toBe("footed");
  });
});
