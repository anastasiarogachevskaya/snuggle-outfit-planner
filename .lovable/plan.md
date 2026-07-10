# Baby profile — account & data actions

Wardrobe pagination is already correct in the Detailed flow, so no changes there.

## Scope
Add an "Account & data" section to `/baby` with five actions. Mobile-first, stays within the existing `max-w-md` layout and Soft Nordic Minimal styling.

## Actions

1. **Sign out** — calls `supabase.auth.signOut()`, then navigates to `/auth`. Simple button, no confirm.
2. **Reset wardrobe** — confirm dialog. Deletes all `wardrobe_items` for the current baby, then navigates to `/onboarding/wardrobe` to re-run setup.
3. **Export data** — downloads a JSON file (`layer-export-<babyname>-<date>.json`) containing baby profile, wardrobe items, and feedback history. Client-side blob download, no server work.
4. **Clear feedback history** — confirm dialog. Deletes all `feedback` rows for the current baby. Toast on success.
5. **Delete profile** — destructive. Opens a modal that requires typing the baby's exact name to enable the red "Delete permanently" button. On confirm: delete `feedback` → `wardrobe_items` → `babies` row (RLS scopes to the user). Then sign out and navigate to `/auth`. Explain that this removes the baby, wardrobe, and all feedback.

## UI

Below the existing "Wardrobe" link on `/baby`, add a section:

```text
─── Account & data ────────────
[ Sign out                  → ]
[ Export data               ↓ ]
[ Reset wardrobe            ⟲ ]  (muted)
[ Clear feedback history    ⟲ ]  (muted)
[ Delete profile              ]  (destructive, red text)
```

Each row is a tappable card matching the existing wardrobe-link card style. Destructive action uses `text-destructive` / red border.

The delete modal is a centered dialog with:
- Warning copy listing what gets removed
- Text input labeled "Type «{baby.name}» to confirm"
- Cancel + Delete permanently buttons (Delete disabled until exact match)

## Technical notes

- All DB writes go through the existing browser `supabase` client; RLS policies already restrict rows to the owner, so no new policies needed.
- Deletion order matters (feedback → wardrobe_items → babies) because there are no cascade rules on these tables.
- Export uses `URL.createObjectURL(new Blob([...], { type: 'application/json' }))` + a temporary `<a download>`.
- After sign-out/delete, invalidate the `["baby"]` and `["wardrobe"]` React Query caches.
- Reuse `sonner` toasts (already has `closeButton`).

## Files touched

- `src/routes/_authenticated/baby.tsx` — add the Account & data section, dialogs, and handlers. No other files change.
