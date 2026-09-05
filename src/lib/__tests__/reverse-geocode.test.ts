// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect, afterEach } from "bun:test";
import {
  REVERSE_GEOCODE_TIMEOUT_MS,
  coordinateLabel,
  reverseGeocode,
  reverseGeocodeLabel,
} from "../reverse-geocode";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** A fetch that only settles when its abort signal fires — like a stalled network. */
function stalledFetch(): typeof fetch {
  return ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return; // never settles without a signal — the test would time out
      if (signal.aborted) {
        reject(new DOMException("Aborted", "TimeoutError"));
        return;
      }
      signal.addEventListener("abort", () =>
        reject(new DOMException("The operation timed out", "TimeoutError")),
      );
    })) as unknown as typeof fetch;
}

describe("reverseGeocode", () => {
  it("returns a place when the geocoder answers", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ city: "Helsinki", countryName: "Finland" }),
        { status: 200 },
      )) as unknown as typeof fetch;

    expect(await reverseGeocodeLabel(60.17, 24.94)).toBe("Helsinki, Finland");
  });

  it("falls back to locality, then subdivision, when no city is given", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ locality: "Kupittaa", countryName: "Finland" }), {
        status: 200,
      })) as unknown as typeof fetch;
    expect(await reverseGeocodeLabel(60.45, 22.3)).toBe("Kupittaa, Finland");

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ principalSubdivision: "Southwest Finland", countryName: "Finland" }),
        { status: 200 },
      )) as unknown as typeof fetch;
    expect(await reverseGeocodeLabel(60.45, 22.3)).toBe("Southwest Finland, Finland");
  });

  it("aborts and falls back to null when the geocoder exceeds the abort window", async () => {
    globalThis.fetch = stalledFetch();

    const started = Date.now();
    const label = await reverseGeocodeLabel(60.17, 24.94, 150);
    const elapsed = Date.now() - started;

    expect(label).toBeNull();
    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeLessThan(2000);
  });

  it("aborts within the default 6s window", async () => {
    expect(REVERSE_GEOCODE_TIMEOUT_MS).toBe(6000);

    globalThis.fetch = ((_url: string, init?: RequestInit) => {
      // The caller must always pass a finite abort signal.
      expect(init?.signal).toBeDefined();
      return Promise.reject(new DOMException("The operation timed out", "TimeoutError"));
    }) as unknown as typeof fetch;

    expect(await reverseGeocodeLabel(60.17, 24.94)).toBeNull();
  });

  it("returns null on network errors, non-OK responses and empty results", async () => {
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await reverseGeocode(1, 2)).toBeNull();

    globalThis.fetch = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    expect(await reverseGeocode(1, 2)).toBeNull();

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({}), { status: 200 })) as unknown as typeof fetch;
    expect(await reverseGeocode(1, 2)).toBeNull();
  });

  it("provides a coordinate fallback label", () => {
    expect(coordinateLabel(60.1699, 24.9384)).toBe("60.17, 24.94");
  });
});
