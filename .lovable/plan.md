Add cotton socks as a new wardrobe item alongside the existing wool socks.

### What will change

- **`src/lib/wardrobe-catalog.ts`**
  - Add `cotton_socks` to the `WardrobeSlug` type union.
  - Add it to the Accessories step (next to wool socks) with label "Cotton socks" and hint "Everyday socks".
  - Optionally include it in `QUICK_SETUP_OWNED` so quick-setup users get both cotton and wool socks.

- **`src/components/icons/index.tsx`**
  - Add a Nordic-minimal `CottonSocksIcon` SVG (a simple sock shape, similar to `WoolSocksIcon` but visually distinct enough for the catalog).
  - Map `cotton_socks` in `iconMap`.

- **`src/lib/recommend.ts`**
  - Update sock recommendations so cotton socks are suggested for mild temperatures and wool socks for cold temperatures.
  - Outdoor example: recommend cotton socks for ~18–24°C effective temp, wool socks below ~18°C, nothing above ~24°C.
  - Home example: recommend cotton socks for ~12–24°C, wool socks below ~12°C.
  - Keep the existing behavior where unowned items are shown as dimmed / missing.

- **`src/routes/index.tsx`**
  - Tweak the landing-page bullet from "Wool hat & socks" to "Warm & cotton socks" to reflect the new item.

### No database changes
The `wardrobe_items` table stores arbitrary slugs, so no migration is needed. Existing users can select cotton socks from the wardrobe checklist.