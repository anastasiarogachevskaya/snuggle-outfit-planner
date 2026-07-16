The recommendation engine already suggests cotton socks for mild temps in outdoor (walk/car) and home-playing modes, but there are gaps. This plan closes them so cotton socks appear consistently across Home, Walk, and Car.

### Changes in `src/lib/recommend.ts`

1. **Outdoor (walk + car)** — current thresholds:
   - `< 12°C` → wool socks
   - `12–24°C` → cotton socks
   - `≥ 24°C` → nothing
   
   Keep this, but verify car flow: since car adds +2°C to effective temp, cotton socks still trigger correctly for mild outside temps. No change needed beyond confirming behavior.

2. **Home – Playing mode** — cotton/wool socks are only added in the coldest branch (`roomTempC < 20°C`). Extend so cotton socks are suggested in the mild band too:
   - `roomTempC < 12` → wool socks
   - `12–23°C` → cotton socks (add to the 20–23 and 24–25 daytime branches where feet are bare)
   - `≥ 26°C` → no socks

3. **Home – Sleeping mode** — currently no socks at all. Add cotton socks when `roomTempC` is 18–21°C with pajamas, and wool socks below 18°C. Skip socks in sleep sacks warmer than 22°C to avoid overheating.

4. **Missing-item handling** — ensure that when cotton/wool socks aren't owned, they surface in the "missing" list (already handled by the shared `clothingSlugs` → `missing` filter, just confirm the new home-mode additions flow through it).

### No other files change

Icon mapping, wardrobe catalog entry, and quick-setup defaults for `cotton_socks` are already in place from the previous turn.
