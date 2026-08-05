# Regression tests for the 16–22°C bands

Add a focused test suite that locks in the recently-tuned behaviour around room and outdoor temperatures between 16 and 22°C, so future tweaks can't reintroduce abrupt jumps or surprise socks.

## What the tests will guarantee

1. **No indoor socks above 17°C** — for every whole degree 18–22°C, Home + Playing returns no cotton or wool socks. At 17°C and below, cotton socks reappear (single boundary check at 17°C).
2. **Sleep never adds socks** — for every whole degree 16–22°C, Home + Sleeping with a full wardrobe returns no socks, whatever TOG sack gets chosen.
3. **Outdoors is never lighter than indoors** — for each degree 16–22°C, compare Walk (pram, same wardrobe) against Home + Playing at the same temperature using a simple warmth score (base layer weight + mid layer + socks + hat). The walk score must be greater than or equal to the home score.
4. **Smooth transitions** — stepping 16 → 22°C one degree at a time, the warmth score must be monotonically non-increasing for both Home and Walk (no dip-then-rise, no jump of more than one "step" between adjacent degrees).
5. **Named boundary cases** as explicit readable tests:
   - Walk 19°C → long-sleeve + cotton socks + thin hat
   - Walk 21°C → short-sleeve, no socks
   - Home playing 21°C → long-sleeve, no socks
   - Home playing 17°C → sweater + cotton socks
   - Home sleeping 21°C → 1.0 TOG sack, no socks
   - Home sleeping 16°C → 2.5 TOG sack, no socks

## Technical notes

- New file `src/lib/recommend/__tests__/temp-bands.test.ts`, alongside the existing suite, using the same `bun:test` setup and the full-wardrobe helper pattern from `recommend.test.ts`.
- A small local `warmthScore(recommendation)` helper maps returned slugs to weights (sleeveless 0, short-sleeve 1, long-sleeve/pajamas 2, plus 1 for a mid layer, 1 for cotton socks, 2 for wool, 1 for any hat). It stays in the test file — no engine changes.
- Loops use whole degrees 16–22 with `tempPref: 3`, `ageMonths: 8`, and a full wardrobe so results depend only on temperature.
- No production code is modified. If a case fails, it will be reported back with the exact temperature and the mismatch, and we can decide whether to adjust the engine or the expectation.
