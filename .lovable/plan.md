# City picker with live suggestions

Guests who deny GPS (or prefer typing) currently type a free-text city and tap "Set". The app takes the first geocoding hit, so a typo silently resolves to an unrelated city. Replace that with a real search-as-you-type picker.

## What changes

**Guest location step (`/try`)**
- Typing 2+ characters queries the geocoding service (debounced ~250ms) and shows up to 5 matching places in a dropdown under the field.
- Each suggestion shows city name plus region and country so "Springfield" is disambiguable.
- The location is only set by tapping a suggestion — no more blind "Set" button guessing. Keyboard Enter picks the highlighted suggestion.
- States handled inline: searching, "No places found for …", and offline/lookup error with a retry.
- After GPS is denied, the step shows a short line ("No problem — search for your city instead") and focuses the search field, so the manual path is an obvious continuation rather than a fallback the user has to find.

**Baby profile location field (signed-in)**
- Same picker component, so the manual path behaves identically in both places.

## Technical notes

- New `src/components/city-search.tsx`: controlled combobox calling `https://geocoding-api.open-meteo.com/v1/search`, debounced, aborting stale requests, returning `{ latitude, longitude, label }` on select. Accessible listbox semantics (`role="combobox"`/`listbox`/`option`, arrow-key navigation).
- `src/routes/try.tsx`: `LocationStep` replaces the input + "Set" button with `CitySearch`; on GPS failure it sets a `deniedHint` flag instead of only firing a toast.
- `src/routes/_authenticated/baby.tsx`: swap the manual-entry input for `CitySearch`, keeping the existing save flow that writes `latitude`, `longitude`, `location_label`.
- No backend, schema, or recommendation-engine changes.
