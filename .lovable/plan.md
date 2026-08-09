# Unit tests for Layerly's core helpers

Today only the recommendation engine is covered (`recommend.test.ts`, `temp-bands.test.ts`). This adds focused unit tests for the pure helper modules around it, using the existing `bun:test` setup — no production code changes.

## New test files

1. `src/lib/__tests__/temperature.test.ts` — the shared temperature helpers in `src/lib/recommend/temperature.ts`: personal preference offsets, personalization offset clamping, wind/rain adjustments, and band boundaries at exact degree values.

2. `src/lib/__tests__/wardrobe-catalog.test.ts` — catalog integrity: every slug is unique, every item has a label and category, TOG sack slugs map to the expected ratings, and every slug referenced by `GUEST_DEFAULT_WARDROBE` exists in the catalog.

3. `src/lib/__tests__/map-wardrobe.test.ts` — layer-kind → wardrobe-slug mapping: owned items are chosen, unowned ones fall back or land in the missing list, and "none" kinds produce no item.

4. `src/lib/__tests__/guest-profile.test.ts` — `dobFromAgeBand` returns an ISO date matching the age band midpoint, age-band round-tripping, and save/load/clear against a small in-memory `localStorage` stub.

5. `src/lib/__tests__/weather.test.ts` — `fetchWeather` with a stubbed global `fetch`: correct Open-Meteo query params, correct mapping of the response fields, `uvIndex` omitted when absent, and a thrown error on a non-OK response. Plus weather-code → condition labels for each documented group.

6. `src/lib/__tests__/seo.test.ts` — `pageMeta` produces a self-referencing canonical URL, unique title/description in both OG and Twitter tags, and every entry in `PUBLIC_ROUTES` is a root-relative path with a valid priority.

7. `src/lib/__tests__/haptics.test.ts` — with `isNativeApp()` stubbed false, no plugin import happens; stubbed true, each helper fires once and the 100 ms per-type rate limiter suppresses an immediate repeat while allowing a different type through.

## Technical notes

- Same conventions as the existing suite: `bun:test` with the `@ts-expect-error` import comment, one `describe` per module, table-driven cases where the input is a plain list.
- Browser globals (`localStorage`, `fetch`, `Date.now`) are stubbed per test and restored afterwards; no network calls.
- Native-only modules are tested through their public helpers only, with module mocks for `@/lib/platform` and `@capacitor/haptics`.
- Run with `bunx vitest`-equivalent `bun test`; the full suite (existing 25 + new cases) must pass before finishing.
