## Add Password Recovery

Currently `/auth` only supports sign-in/sign-up. Users who forget their password have no way to reset it.

### What to build

1. **"Forgot password?" link** on `/auth` (below the password field, sign-in mode only).
2. **New public route `/forgot-password**` (`src/routes/forgot-password.tsx`)
  - Simple email input matching the existing Nordic minimal auth-page style (max-w-md, sage palette, back link).
  - Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
  - Shows a success toast + inline confirmation "Check your email for a reset link".
  - SEO: unique title, description, canonical, noindex.
3. **New public route `/reset-password**` (`src/routes/reset-password.tsx`)
  - Must be public (not under `_authenticated`) — Supabase auto-creates a recovery session when the user clicks the email link.
  - Listens for `onAuthStateChange` `PASSWORD_RECOVERY` event to confirm the recovery session is active; also handles the case where the session is already set on mount.
  - Form: new password + confirm password (min 6 chars, must match).
  - Calls `supabase.auth.updateUser({ password })`, then toast success and navigate to `/today`.
  - If no recovery session is detected, show a "Link expired or invalid — request a new one" state linking back to `/forgot-password`.
  - SEO: unique title, description, canonical, noindex.

### Notes

- No backend/schema changes; Supabase Auth handles reset tokens.
- No changes to the current auth-callback or `_authenticated` gate.
- The default Lovable auth email templates already send recovery emails; no email template scaffolding needed unless you later want custom branding.