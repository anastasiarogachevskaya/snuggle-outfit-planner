# Fahrenheit option for US parents

## What parents get
- On first open, devices set to the US region show °F and mph. Everyone else sees °C and km/h.
- A "Temperature units" switch (°C / °F) in Profile. The choice is remembered on the phone. Signed-in parents keep it across devices.
- Every temperature in the app follows the setting: the weather line ("Now is 59° · feels like 54°"), the Check outfit panel (wind in mph too), the room temperature picker at home, and outfit notes such as "Room is ~68°F" or "It's 41°F now but expected to drop to about 34°F…".
- The outfit advice stays exactly the same. Only the way numbers are shown changes.

## Not changing
- The landing page, blog and guides (the guide already shows both °C and °F).
- How outfits are worked out. Everything keeps running in °C internally.

## Technical details
- New `src/lib/units.ts`: `TempUnit = "C" | "F"`, `formatTemp(c, unit, {suffix})`, `formatWind(kph, unit)`, `cToF`, `fToC`, `defaultUnitFromLocale(navigator.language / Intl region)` (US, LR, MM → F).
- `useTempUnit()` hook: reads localStorage `layerly:temp-unit` in `useEffect` (SSR-safe, default "C" before hydration), falls back to the locale default; for signed-in users, saves to a new nullable `profiles.temp_unit` column (migration, existing RLS covers it).
- Recommendation notes: `pick-home.ts` / `pick-outdoor.ts` take an optional `unit` in their input and format numbers through `formatTemp`; default "C" so existing tests stay valid.
- Room temperature picker: shows and steps in °F (whole degrees) when F is chosen, converting to °C before saving.
- Update `weather-summary.tsx`, `check-outfit-panel.tsx`, `activity-picker.tsx`; add the switch to the Profile screen; log a `units_changed` event.
- Tests: conversions (0°C = 32°F, 20°C = 68°F, −10°C = 14°F), locale default (en-US → F, fi-FI → C), and one note rendered in °F.
