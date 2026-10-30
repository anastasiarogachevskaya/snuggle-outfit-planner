// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { isRolloutEnabled, parseRollout, toddlerRulesApply } from "../feature-flags";

describe("toddler rollout switch", () => {
  it("defaults to off for missing or unknown values", () => {
    expect(parseRollout(undefined)).toBe("off");
    expect(parseRollout("true")).toBe("off");
  });

  it("is off in published and preview builds when set to off", () => {
    expect(isRolloutEnabled("off", false)).toBe(false);
    expect(isRolloutEnabled("off", true)).toBe(false);
  });

  it("preview mode enables only the dev/preview server, never published builds", () => {
    expect(isRolloutEnabled("preview", true)).toBe(true);
    expect(isRolloutEnabled("preview", false)).toBe(false);
  });

  it("public mode enables everywhere", () => {
    expect(isRolloutEnabled("public", false)).toBe(true);
  });

  it("applies toddler rules only for 12–35 months when enabled", () => {
    expect(toddlerRulesApply(11, true)).toBe(false);
    expect(toddlerRulesApply(12, true)).toBe(true);
    expect(toddlerRulesApply(35, true)).toBe(true);
    expect(toddlerRulesApply(36, true)).toBe(false);
    expect(toddlerRulesApply(20, false)).toBe(false);
  });
});
