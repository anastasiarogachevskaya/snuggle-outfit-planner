
## Custom SVG icon library

Build a small in-repo SVG icon set in the Nordic-minimal style (rounded caps, ~2px stroke, `currentColor`) so icons inherit color/size from parent and stay crisp at any DPI.

### 1. Icon components

Create `src/components/icons/` with one `.tsx` file per icon, each exporting a React component that returns an inline `<svg>` (24×24 viewBox, `stroke="currentColor"`, `strokeWidth={1.75}`, `fill="none"`, rounded linecaps/joins). Props: `size?: number`, `className?: string`, plus standard SVG props.

**Activity / nav icons (thicker ~1.75–2px stroke):**
- `HomeIcon` — simple house with pitched roof
- `WalkIcon` — walking figure silhouette
- `CarIcon` — rounded compact car (cute, small windows + wheels)
- `PlayingIcon` — teddy bear / block toy
- `SleepingIcon` — crescent moon with a small "z"
- `WardrobeIcon` — armoire with hanger detail (replaces the raster PNG)
- `SettingsIcon` — gear

**Clothing icons (line art, same stroke system):**
- `BodysuitIcon`, `TshirtIcon`, `LongSleeveIcon`
- `PantsIcon`, `ShortsIcon`
- `SweaterIcon`, `FleeceIcon`
- `JacketIcon`, `SnowsuitIcon`, `RainCoverIcon`
- `HatIcon`, `SunHatIcon`, `MittensIcon`, `SocksIcon`, `BootiesIcon`
- `SleepSackIcon`, `SwaddleIcon`, `BlanketIcon`
- `PramIcon`, `StrollerIcon`, `CarrierIcon`, `FootmuffIcon`

(Exact list finalized against `src/lib/wardrobe-catalog.ts` / recommend output during build so every item type used in the UI has an icon; anything left over falls back to a neutral shirt icon.)

### 2. Barrel export

`src/components/icons/index.ts` re-exports every icon and a typed `IconName` union plus an `iconMap: Record<IconName, ComponentType>` for data-driven use (e.g. mapping wardrobe category → icon).

### 3. Wire-in

- `src/routes/_authenticated/today.tsx` — replace activity emojis (`🏠 🚶 🚗`) and Home sub-mode emojis (`🧸 🌙`) with the new components. Keep the existing sage-selected card styling; icons inherit `currentColor` so selected/unselected states just work.
- `src/routes/_authenticated/baby.tsx` — swap the raster `wardrobeIcon` asset for `<WardrobeIcon />` and the `⚙` emoji for `<SettingsIcon />`. Delete `src/assets/wardrobe-icon.png.asset.json` via `lovable-assets delete` since the PNG is no longer referenced.
- Recommendation list on `today.tsx` — render the matching clothing icon next to each item using `iconMap`.
- Wardrobe wizard (`onboarding.wardrobe.tsx`) and wardrobe checklist (`wardrobe.tsx`) — show the clothing icon on each tile instead of / alongside the current label.

### 4. Verify

`bun run build`, then a Playwright screenshot pass on `/today`, `/baby`, `/wardrobe`, and `/onboarding/wardrobe` to confirm sizing/contrast at mobile width.

### Technical notes

- Pure SVG, no new dependencies — lucide doesn't cover baby-specific clothing shapes and mixing sets looks inconsistent.
- Stroke `1.75` on a 24px grid gives enough visual weight to fix the "too thin" issue you hit with the wardrobe PNG, while staying minimal.
- `currentColor` means one icon works in white/sage/ink contexts without variants.
- Sizing via `size` prop (defaults to `24`), so activity cards can use `size={32}` and inline lists `size={20}`.
