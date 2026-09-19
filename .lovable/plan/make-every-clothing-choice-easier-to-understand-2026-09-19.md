# Make every clothing choice easier to understand

## Mockup set

Before implementation, show the same clothing guidance in the three places where parents will encounter it:

1. **First-time wardrobe setup** — the existing **Mid layers** step shown while creating the baby profile.
2. **Profile → Wardrobe** — the existing checklist where parents edit what they own later.
3. **Today → Layer up** — the existing outfit builder where parents choose what baby is wearing now.

Each mockup will be clearly titled with its location and shown at iPhone size. The screens will retain Layerly’s current layout and colors, so the preview reads as an update to the real app rather than a separate concept page.

The mockups will use plain examples only: **Light merino layer — thin, smooth jersey worn over a bodysuit** and **Warm wool layer — thick knit or boiled wool**. They will not use fabric weights, technical measurements, or temperature claims.

## What will change

- Give every wardrobe item a short plain-language explanation and a simple warmth level, such as **Light**, **Warm**, or **Very warm**.
- Show that guidance consistently during setup, in the saved wardrobe, and in the **Layer up** outfit picker—not only in the first checklist.
- Add a small **What counts?** explanation for easily confused items, using familiar examples and fit/thickness cues rather than technical fabric measurements.

## Clarify wool and merino

- Split the current broad wool choice into:
  - **Light merino layer** — thin, smooth jersey worn over a bodysuit; warmth similar to a light sweater.
  - **Warm wool layer** — thicker knit or boiled wool; warmth similar to fleece.
- Explain that a merino bodysuit still belongs under **Long-sleeve bodysuit**; the new merino-layer choice is for a separate garment worn over the base layer.
- Keep existing **Wool layer** selections compatible by treating them as the warm version, matching how Layerly currently evaluates them. Parents can adjust that choice when they next open their wardrobe.

## Interface

- Add a compact warmth marker and clearer example below each clothing name.
- Let parents tap an information icon for a short explanation when the tile needs more context.
- In **Layer up**, keep the picker compact but show warmth beside each garment name and expose the same explanation on demand.
- Improve vague labels such as “Warm mid” so they describe what the garment looks or feels like—for example, “Thin merino jersey” or “Thick knit / boiled wool.”
- Keep the explanations visually compact in setup and **Layer up**; allow slightly more detail in **Profile → Wardrobe**, where there is more room to review saved items.

## Recommendation behavior

- Score a light merino layer like a light sweater and a warm wool layer like fleece.
- Include light merino among lighter mid-layer alternatives and warm wool among cold-weather alternatives.
- Keep recommendation text and substitutions aligned with the exact item the parent selected, avoiding a thin merino garment being presented as equivalent to fleece.

## Technical details

- Extend the central wardrobe catalog with explanation and warmth metadata so all screens use one source of truth.
- Add a backward-compatible slug for the light merino option while retaining the existing wool slug for current saved wardrobes.
- Update wardrobe mapping, outfit warmth values, picker groups, icons, and recommendation labels for the new distinction.
- Add focused tests for light-versus-warm wool recommendations, saved wardrobe compatibility, and outfit-checker verdicts.
- Verify setup, wardrobe editing, recommendations, and **Layer up** at iPhone size, plus the account-based web wardrobe.
