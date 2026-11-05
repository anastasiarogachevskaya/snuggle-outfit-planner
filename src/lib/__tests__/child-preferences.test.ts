// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { normalizeChildPreferences } from "@/lib/child-preferences";
import { GUEST_PROFILE_VERSION, upgradeGuestProfile, guestPreferences } from "@/lib/guest-profile";

const v2 = {
  version: 2,
  dob: "2025-01-10",
  name: "Mia",
  temperaturePref: 3,
  latitude: 60,
  longitude: 24,
  locationLabel: "Helsinki",
  wardrobe: ["pants", "snow_pants"],
  wardrobeDetails: { snow_pants: { availability: "outgrown" } },
  feedback: [{ rating: "good" }],
  createdAt: "2025-02-01T00:00:00Z",
};

describe("child preferences", () => {
  it("defaults to both / unknown / no", () => {
    expect(normalizeChildPreferences(undefined)).toEqual({
      clothing_style: "both",
      nappy_use: "unknown",
      easy_toilet_access: false,
    });
  });

  it("upgrades a v2 profile keeping wardrobe, details and feedback", () => {
    const r = upgradeGuestProfile(v2)!;
    expect(r.changed).toBe(true);
    expect(r.profile.version).toBe(GUEST_PROFILE_VERSION);
    expect(r.profile.wardrobe).toEqual(["pants", "snow_pants"]);
    expect(r.profile.wardrobeDetails).toEqual({ snow_pants: { availability: "outgrown" } });
    expect(r.profile.feedback).toEqual([{ rating: "good" }]);
    expect(guestPreferences(r.profile).nappy_use).toBe("unknown");
  });

  it("repeated upgrade changes nothing", () => {
    const once = upgradeGuestProfile(v2)!.profile;
    const twice = upgradeGuestProfile(JSON.parse(JSON.stringify(once)))!;
    expect(twice.changed).toBe(false);
    expect(twice.profile).toEqual(once);
  });

  it("stated preferences survive save and reload", () => {
    const p = { ...upgradeGuestProfile(v2)!.profile, preferences: { clothing_style: "tops", nappy_use: "no", easy_toilet_access: true } };
    const back = upgradeGuestProfile(JSON.parse(JSON.stringify(p)))!;
    expect(back.changed).toBe(false);
    expect(guestPreferences(back.profile)).toEqual({ clothing_style: "tops", nappy_use: "no", easy_toilet_access: true });
    expect(back.profile.wardrobeDetails).toEqual(v2.wardrobeDetails);
  });

  it("age never sets nappy use", () => {
    const older = upgradeGuestProfile({ ...v2, dob: "2023-01-01" })!.profile;
    expect(guestPreferences(older).nappy_use).toBe("unknown");
  });
});
