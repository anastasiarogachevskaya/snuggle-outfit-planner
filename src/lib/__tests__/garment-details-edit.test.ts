// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import {
  changedGarmentDetails,
  garmentDetailFields,
  normalizeGarmentDetails,
} from "@/lib/garment-details";
import {
  createGuestProfile,
  guestGarmentDetails,
  upgradeGuestProfile,
  withGuestGarmentDetails,
} from "@/lib/guest-profile";

describe("garment detail editing", () => {
  it("legacy jacket and snow_pants stay Not sure until edited", () => {
    const p = upgradeGuestProfile({
      dob: "2025-01-01",
      wardrobe: ["jacket", "snow_pants"],
    })!.profile;
    expect(guestGarmentDetails(p, "jacket").insulation).toBe("unknown");
    expect(guestGarmentDetails(p, "snow_pants").insulation).toBe("unknown");
    expect(guestGarmentDetails(p, "snow_pants").waterproof).toBe("unknown");
  });
  it("editing one property keeps the others and ownership", () => {
    let p = createGuestProfile("6-12m");
    p = withGuestGarmentDetails(p, "winter_overall", {
      insulation: "insulated",
      waterproof: "yes",
    });
    p = withGuestGarmentDetails(p, "winter_overall", { availability: "outgrown" });
    expect(guestGarmentDetails(p, "winter_overall")).toMatchObject({
      insulation: "insulated",
      waterproof: "yes",
      availability: "outgrown",
    });
    expect(p.wardrobe).toContain("winter_overall");
  });
  it("clearing back to Not sure and restoring availability drops stored details", () => {
    let p = withGuestGarmentDetails(createGuestProfile("6-12m"), "jacket", {
      insulation: "light",
      availability: "outgrown",
    });
    p = withGuestGarmentDetails(p, "jacket", { insulation: "unknown", availability: "available" });
    expect(p.wardrobeDetails?.jacket).toBeUndefined();
  });
  it("un-owning and re-owning keeps details", () => {
    let p = withGuestGarmentDetails(createGuestProfile("6-12m"), "pajamas", {
      foot_coverage: "footed",
    });
    p = { ...p, wardrobe: p.wardrobe.filter((s) => s !== "pajamas") };
    p = { ...p, wardrobe: [...p.wardrobe, "pajamas"] };
    expect(guestGarmentDetails(p, "pajamas").foot_coverage).toBe("footed");
  });
  it("only changed fields are written", () => {
    const before = normalizeGarmentDetails({ insulation: "light" });
    expect(changedGarmentDetails(before, { ...before, waterproof: "no" })).toEqual({
      waterproof: "no",
    });
    expect(changedGarmentDetails(before, before)).toEqual({});
  });
  it("asks only applicable questions", () => {
    expect(garmentDetailFields("pajamas")).toEqual([
      "sleepwear_shape",
      "foot_coverage",
      "availability",
    ]);
    expect(garmentDetailFields("wool_leggings")).toEqual(["leggings_use", "availability"]);
    expect(garmentDetailFields("snow_pants")).toContain("insulation");
    expect(garmentDetailFields("cotton_socks")).toEqual(["availability"]);
  });
});
