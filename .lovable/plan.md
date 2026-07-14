Update only the activity selector section on `/today` with the user-provided green colors, scoped specifically to the selected activity state.

### Changes

1. **Add scoped CSS variables in `src/styles.css`**
   - Introduce a new token set only for the activity selector selected state, e.g.:
     - `--activity-selected: #A8B894`
     - `--activity-selected-foreground: #2F3A2E`
     - `--activity-selected-border: #8E9F7D`
   - Leave the existing `--primary`, `--activity`, and other global tokens unchanged so the rest of the app stays the same.

2. **Update `src/routes/_authenticated/today.tsx`**
   - In the `situationOptions` mapped buttons, change the selected-card classes to use the new scoped green tokens:
     - Background: `bg-activity-selected`
     - Text: `text-activity-selected-foreground`
     - Border: `border-activity-selected-border` with a thicker border (e.g. `border-2`)
     - Shadow: subtle `shadow-sm` in the green tone
     - Scale: `scale-[1.02]`
     - Title/label: bold (`font-bold`)
     - Icon: dark green / keep existing emoji but style wrapper if needed
   - Change the unselected cards to:
     - White background (`bg-white`)
     - Thin border (`border`)
     - Lighter / neutral text and icon treatment
   - Keep the same three-card layout, emoji icons, labels, and descriptions.

3. **Verify**
   - Run build to confirm no errors.
   - Capture a preview screenshot of the `/today` activity section to confirm the selected card matches the requested richer green palette and the unselected cards remain white.