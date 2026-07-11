## Split Baby profile into three focused pages

Right now `/baby` mixes profile fields, a wardrobe link, and all account/data actions. We'll split it into three routes, all reachable from a hub on `/baby`.

### New route structure

```text
/baby              → Baby profile hub (name, DOB, temp pref, location)
                     + navigation cards → Wardrobe, Account & data
/wardrobe          → (already exists) manage owned items
/account           → Sign out, Export data, Reset wardrobe,
                     Clear feedback history, Delete profile
```

### `/baby` (profile only)

- Keep: name, date of birth, temperature preference slider, location (GPS + label), Save button.
- Remove: the entire "Account & data" section and destructive dialogs.
- Add two large tappable cards below the form:
  - **Wardrobe** → `/wardrobe` (icon + "Manage owned items")
  - **Account & data** → `/account` (icon + "Sign out, export, delete")
- Keep the "Not sure? You can change this later." footer.

### `/account` (new route)

New file `src/routes/_authenticated/account.tsx`. Move the existing Account & data section from `baby.tsx` here verbatim:

- Sign out
- Export data (JSON download)
- Reset wardrobe (confirm dialog → `/onboarding/wardrobe`)
- Clear feedback history (confirm dialog)
- Delete profile (type-baby-name-to-confirm modal)

Header shows a back link to `/baby`, page title "Account & data", and the same `max-w-md` mobile-first shell.

### `/wardrobe` header

Add a back link to `/baby` at the top so navigation feels consistent (currently users can only get out via browser back).

### OAuth sign-in

The user hasn't published yet. Google/Apple OAuth failing in preview is almost always the preview environment's fetch proxy interfering with the OAuth popup handshake — not an app bug. Action:

- No code changes to the auth flow.
- Recommend publishing and re-testing Google/Apple on the published `.lovable.app` URL. If it still fails there, we'll debug for real.

### Files touched

- `src/routes/_authenticated/baby.tsx` — strip Account & data section, add nav cards.
- `src/routes/_authenticated/account.tsx` — new, contains moved section.
- `src/routes/_authenticated/wardrobe.tsx` — add back-to-Baby link in header.

No database, auth, or business-logic changes.
