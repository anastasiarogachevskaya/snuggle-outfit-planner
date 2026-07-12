## Improve walk recommendations for transport type and covers

Make walk mode distinguish pram / sitting stroller / carrier, and factor in rain cover, footmuff, blanket, and babywearing cover. Update the UI, the effective-temperature math, the reason text, and add safety notes.

### 1. `src/lib/recommend.ts` — inputs and math

Extend `RecommendInput` for walk mode:

- Replace `strollerMode?: "stroller" | "carrier"` with:
  - `transportMode?: "pram" | "sitting-stroller" | "carrier"`
- Add optional cover flags:
  - `rainCoverUsed?: boolean`
  - `footmuffUsed?: boolean`
  - `blanketUsed?: boolean`
  - `babywearingCoverUsed?: boolean`

After the existing base + `tempPref` adjustment, when `situation === "walk"` apply:

```text
pram              → effective += 1
sitting-stroller  → effective -= 1
carrier           → effective += 3
carrier + babywearingCover → additional +2
rainCoverUsed     → +2
footmuffUsed      → +2
blanketUsed       → +1
```

Existing accessory rules stay, but replace the current stroller-only footmuff/blanket auto-suggestions with:

- If `transportMode` is `pram` or `sitting-stroller` and `effective < 10`, only suggest `footmuff` when the user hasn't already marked `footmuffUsed`.
- Same idea for blanket suggestions — don't recommend a cover the parent already reports using.
- Carrier mode: don't suggest footmuff/blanket at all; suggest `babywearing_cover` when `effective < 8` and it's not already in use.

Extend `Recommendation` with `notes: string[]` and populate:

- `rainCoverUsed` → "Rain cover makes the stroller warmer and reduces airflow. Check baby's neck or chest regularly and remove a layer if baby feels hot."
- `transportMode === "carrier"` → "Carrier keeps baby warmer because of adult body heat. Dress baby slightly lighter than for a stroller walk and check baby's neck/chest during the walk."
- `carrier + babywearingCoverUsed` → append "Babywearing cover adds extra warmth. Avoid too many thick layers under it."

Update `buildReason` for walk mode to mention transport effect, e.g.:

- pram → "Feels like Xo°C outside. Pram is slightly more protected, so outfit is adjusted a little warmer than open air."
- sitting-stroller → "Feels like X°C outside. Sitting stroller is more exposed to wind, so outfit is adjusted slightly warmer."
- carrier → "Feels like X°C outside. Carrier adds warmth from adult body heat, so baby needs fewer layers than in a stroller."
- If rain cover used, append: " Rain cover adds warmth and reduces airflow, so the outfit is adjusted lighter."

### 2. `src/routes/_authenticated/today.tsx` — walk UI

Replace the current `strollerMode` state with:

- `transportMode: "pram" | "sitting-stroller" | "carrier"` (default `sitting-stroller`)
- `covers: { rain: boolean; footmuff: boolean; blanket: boolean; babywearing: boolean }`

Walk section becomes:

1. **How will baby travel?** — 3 pill buttons: Pram / bassinet, Sitting stroller, Baby carrier.
2. **Any extra cover?** — multi-select chips, filtered by transport:
   - Pram or sitting stroller → Rain cover, Footmuff, Blanket
   - Carrier → Babywearing cover, Blanket
3. Duration selector stays.

Pass the new fields into `recommend(...)`. Render `rec.notes` under the reason as small info callouts (accent color, no emoji).

Switching transport resets covers that don't apply.

### 3. Notes in the recommendation card

Below the existing `rec.reason`, render each note as a subtle bordered line (`text-xs text-ink/70 border-l-2 border-accent/40 pl-3`).

### 4. Non-goals

- No DB migration — walk inputs are transient UI state, not persisted.
- Home and car flows are untouched.
- Wardrobe catalog and onboarding untouched (all referenced items already exist).
- Feedback payload keeps storing `recommendation` as JSON; the added `notes` field flows through automatically.

### Files touched

- `src/lib/recommend.ts` — types, math, notes, reason.
- `src/routes/_authenticated/today.tsx` — walk UI state, inputs, notes rendering.
