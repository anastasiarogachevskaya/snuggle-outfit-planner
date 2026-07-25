## Remember last room temperature

Persist the Home room temperature per baby so users don't reset it each visit.

### Behavior
- First-time: slider defaults to 21°C.
- On change: save immediately (debounced) to localStorage keyed by baby id.
- On load / baby switch: hydrate slider from stored value (fallback 21°C).
- Recommendation continues to update live while dragging (already does).

### Storage
Use `localStorage` with key `layerly:roomTemp:<babyId>`. Client-only preference — no schema change, no server round-trip, no migration. (If we later want cross-device sync, we can add a column to `babies`; not needed for this task.)

### Changes
- `src/routes/_authenticated/today.tsx`:
  - Replace `useState(21)` with lazy init that reads localStorage for the active baby id.
  - Add `useEffect` on `babyQ.data?.id` to re-hydrate when the selected baby changes.
  - Add `useEffect` on `[babyId, roomTemp]` to persist the value.
  - Guard `localStorage` access for SSR (`typeof window !== "undefined"`).

No UI/copy changes, no onboarding change, no confirmation dialog.
