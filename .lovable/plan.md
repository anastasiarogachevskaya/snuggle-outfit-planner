### Objective
Replace the 👕 emoji in the `NavCard` on `/baby` with the wardrobe icon the user uploaded.

### Why this needs a clean-up
The uploaded image is a line-art wardrobe on a dark gray background. Dropping it directly into the white card would show a dark square behind it. I’ll first generate a clean, transparent-background version that matches the app’s soft Nordic aesthetic.

### Steps

1. **Generate a clean transparent wardrobe icon**
   - Use `imagegen--edit_image` on `user-uploads://wardrobe.png`.
   - Prompt: remove the dark gray background, keep only the black wardrobe line art, make it suitable for a small app icon on a white card, clean minimal lines.
   - Save to `src/assets/wardrobe-icon.png` with `transparent_background: true`.

2. **Register as a Lovable asset**
   - Run `lovable-assets create` for the generated icon and create `src/assets/wardrobe-icon.png.asset.json`.

3. **Update `NavCard` in `src/routes/_authenticated/baby.tsx`**
   - Change the `icon` prop from `string` to `React.ReactNode` so it can render either an emoji or an image.
   - Render the icon node as-is when it’s a React node; keep emoji rendering for the remaining `⚙` account card.
   - Use the wardrobe asset for the Wardrobe card, sized at `w-6 h-6` to match the previous emoji scale.

4. **Verify**
   - Run `bun run build` to confirm no TypeScript/import errors.
   - Capture a preview screenshot of `/baby` to confirm the wardrobe icon appears clean and aligned with the card text.
