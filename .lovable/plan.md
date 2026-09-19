# Fix the surprising sunscreen advice on a grey day

On your screen it is 16°, overcast, feels like 12° — and Layerly still shows four sun warnings, including "apply broad-spectrum SPF 30+".

## Why it happens

The weather service reports a UV reading of 3 for Helsinki right now, even though the sky is 81% clouded over. Layerly treats "UV 3 or more" as sunny, so it prints the whole sun-safety set. On top of that, the four messages overlap: shade, sunscreen, reapply, "sun protection is recommended" all say roughly the same thing.

## What changes

1. **Respect the clouds.** Layerly will also read how cloudy it is. When the sky is mostly covered (roughly 70%+) and the UV reading is only moderate (under 6), the sun advice is dropped entirely — a grey 16° walk gets no sunscreen card.
2. **Raise the bar slightly.** Sunscreen advice starts at a meaningful UV level rather than the lowest "moderate" step, so a weak autumn sun does not read like a beach day.
3. **No more repeats.** At most two sun lines ever show: one about shade or sunscreen, and one about strength if the sun is genuinely strong. The generic "Sun protection is recommended." line goes away, since it adds nothing next to the others.
4. **Strong sun still warns.** When UV is high (6+) the advice appears regardless of cloud cover, because it can still burn through broken cloud.

With today's Helsinki conditions the "Weather safety" block would simply not appear.

## Technical notes

- `src/lib/weather.ts`: add `cloud_cover` to the Open-Meteo `current` params and expose `cloudCoverPct?: number` on `Weather`.
- `src/lib/recommend.ts` + `src/lib/recommend/pick-outdoor.ts`: thread `cloudCoverPct` through `RecommendInput` / `OutdoorContext`; pass it from `src/components/today-screen/index.tsx`.
- In `buildSafetyAdvice` (pick-outdoor.ts ~line 337): compute `effectiveSun = uv >= 6 || (uv >= 4 && cloudCover < 70)`; drop the `uv >= 3` generic line; keep the hot-weather branch (`feelsLikeC >= TEMP.HOT`) independent of cloud cover, and cap the sun block at two messages.
- Also flows into the MCP recommendation tool, which shares `recommend()` — no separate change needed.
- Add cases to `src/lib/recommend/__tests__/recommend.test.ts`: overcast + UV 3 → no sun advice; clear + UV 5 → sunscreen advice; overcast + UV 7 → strong-sun advice.
