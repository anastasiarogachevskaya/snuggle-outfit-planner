// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect, beforeEach, afterAll, mock } from "bun:test";

let native = false;
const calls: string[] = [];

// Keep the full module shape: mock.module is process-wide in bun, so a partial
// mock would break other suites that import @/lib/platform.
mock.module("@/lib/platform", () => ({
  isNativeApp: () => native,
  isWebApp: () => !native,
  isIOSApp: () => native,
  getPlatform: () => (native ? "ios" : "web"),
  getPlatformLabel: () => (native ? "iOS app" : "Web"),
  isGeolocationPluginAvailable: () => native,

}));

mock.module("@capacitor/haptics", () => ({
  Haptics: {
    impact: async (opts: { style: string }) => void calls.push(`impact:${opts.style}`),
    selectionChanged: async () => void calls.push("selection"),
    notification: async (opts: { type: string }) => void calls.push(`notify:${opts.type}`),
  },
  ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" },
  NotificationType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
}));

const { lightHaptic, selectionHaptic, successHaptic, warningHaptic } = await import("../haptics");

const realNow = Date.now;
let now = 1_000_000;

/** Lets the fire-and-forget dynamic import resolve. */
const flush = () => new Promise((r) => setTimeout(r, 10));

beforeEach(() => {
  calls.length = 0;
  now += 10_000; // always outside the rate-limit window
  Date.now = () => now;
});

afterAll(() => {
  Date.now = realNow;
});

describe("haptics on the web", () => {
  it("never loads the plugin or fires anything", async () => {
    native = false;
    lightHaptic();
    selectionHaptic();
    successHaptic();
    warningHaptic();
    await flush();
    expect(calls).toEqual([]);
  });
});

describe("haptics in the native app", () => {
  it("fires the matching plugin call for each helper", async () => {
    native = true;
    lightHaptic();
    await flush();
    expect(calls).toEqual(["impact:LIGHT"]);

    calls.length = 0;
    now += 10_000;
    selectionHaptic();
    await flush();
    expect(calls).toEqual(["selection"]);

    calls.length = 0;
    now += 10_000;
    successHaptic();
    await flush();
    expect(calls).toEqual(["notify:SUCCESS"]);

    calls.length = 0;
    now += 10_000;
    warningHaptic();
    await flush();
    expect(calls).toEqual(["notify:WARNING"]);
  });

  it("suppresses a repeat of the same type within the rate-limit window", async () => {
    native = true;
    selectionHaptic();
    now += 50;
    selectionHaptic();
    now += 20;
    selectionHaptic();
    await flush();
    expect(calls).toEqual(["selection"]);
  });

  it("still fires a different type inside the window", async () => {
    native = true;
    selectionHaptic();
    now += 10;
    lightHaptic();
    await flush();
    expect(calls.sort()).toEqual(["impact:LIGHT", "selection"]);
  });

  it("fires again once the window has passed", async () => {
    native = true;
    lightHaptic();
    now += 150;
    lightHaptic();
    await flush();
    expect(calls).toEqual(["impact:LIGHT", "impact:LIGHT"]);
  });
});
