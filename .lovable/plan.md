
## Password reset polish

### `/reset-password`
- After `supabase.auth.updateUser({ password })` succeeds, sign the user out and navigate to `/auth` (instead of `/today`) so they sign in fresh with the new password. Toast: "Password updated — please sign in."
- Invalid/expired state already links to `/forgot-password`; keep the link and add a short helper line ("Reset links expire after 1 hour.") for clarity.

### `/forgot-password`
- Keep the toast, and also render an inline message inside the card:
  - Success: sage confirmation block (already partially there via `sent` state) — leave as-is.
  - Error: capture the error into local state and show a red inline message below the input; clear it on the next submit attempt.
- Submit button already disables via `busy`; also disable when email is empty and show "Sending…" label (already present). No other change.

No backend or schema changes.
