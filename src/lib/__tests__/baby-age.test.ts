// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import { ageInMonths, childStage, completedMonths, stageFromMonths } from "../baby-age";

describe("completed age", () => {
  it("first birthday: day before, on and after", () => {
    expect(completedMonths("2025-03-15", "2026-03-14")).toBe(11);
    expect(completedMonths("2025-03-15", "2026-03-15")).toBe(12);
    expect(completedMonths("2025-03-15", "2026-03-16")).toBe(12);
    expect(childStage("2025-03-15", "2026-03-14")).toBe("infant");
    expect(childStage("2025-03-15", "2026-03-15")).toBe("toddler_12_23");
  });

  it("third birthday: day before, on and after", () => {
    expect(completedMonths("2023-03-15", "2026-03-14")).toBe(35);
    expect(completedMonths("2023-03-15", "2026-03-15")).toBe(36);
    expect(completedMonths("2023-03-15", "2026-03-16")).toBe(36);
    expect(childStage("2023-03-15", "2026-03-14")).toBe("toddler_24_35");
    expect(childStage("2023-03-15", "2026-03-15")).toBe("child_36_plus");
  });

  it("second year boundary", () => {
    expect(stageFromMonths(23)).toBe("toddler_12_23");
    expect(stageFromMonths(24)).toBe("toddler_24_35");
  });

  it("month ends complete on the shorter month's last day", () => {
    expect(completedMonths("2026-01-31", "2026-02-27")).toBe(0);
    expect(completedMonths("2026-01-31", "2026-02-28")).toBe(1);
    expect(completedMonths("2026-01-31", "2026-03-30")).toBe(1);
    expect(completedMonths("2026-01-31", "2026-03-31")).toBe(2);
  });

  it("leap-day birthdays", () => {
    expect(completedMonths("2024-02-29", "2025-02-27")).toBe(11);
    expect(completedMonths("2024-02-29", "2025-02-28")).toBe(12);
    expect(completedMonths("2024-02-29", "2025-03-01")).toBe(12);
    expect(completedMonths("2024-02-29", "2028-02-28")).toBe(47);
    expect(completedMonths("2024-02-29", "2028-02-29")).toBe(48);
  });

  it("calendar-month difference alone is not used", () => {
    // Old formula said 1 month on 1 Feb for a 31 Jan birthday.
    expect(completedMonths("2026-01-31", "2026-02-01")).toBe(0);
  });

  it("missing, invalid and future birthdays stay unknown, never zero", () => {
    for (const dob of [null, undefined, "", "invalid", "2026-02-30", "2026-13-01"]) {
      expect(completedMonths(dob, "2026-06-01")).toBeNull();
      expect(childStage(dob, "2026-06-01")).toBe("unknown");
    }
    expect(completedMonths("2026-06-02", "2026-06-01")).toBeNull();
    expect(completedMonths("2026-06-01", "2026-06-01")).toBe(0);
    expect(ageInMonths(null)).toBeNull();
  });

  it("device time zone does not shift a date-only birthday", () => {
    const original = process.env.TZ;
    try {
      for (const tz of ["UTC", "Pacific/Honolulu", "Europe/Helsinki", "Pacific/Kiritimati"]) {
        process.env.TZ = tz;
        // Local calendar date 15 March 2026, noon.
        const ref = new Date(2026, 2, 15, 12, 0, 0);
        expect({ tz, m: completedMonths("2025-03-15", ref) }).toEqual({ tz, m: 12 });
        const before = new Date(2026, 2, 14, 23, 59, 0);
        expect({ tz, m: completedMonths("2025-03-15", before) }).toEqual({ tz, m: 11 });
      }
    } finally {
      process.env.TZ = original;
    }
  });
});
