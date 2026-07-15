## Auto-redirect signed-in users from `/` to `/today`

**Problem:** Logged-in users landing on `/` see the marketing page with a "Sign in" CTA instead of going straight to the app.

**Change:** In `src/routes/index.tsx`, add a client-side session check on mount. If a Supabase session exists, `navigate({ to: "/today", replace: true })` before rendering the landing content. Show nothing (or a blank canvas) while the check is in flight to avoid a flash of the marketing page for signed-in users.

**Details:**
- Use `supabase.auth.getSession()` inside `useEffect` (same pattern as `src/routes/auth.tsx`).
- Track a `checking` state; render `null` (or the canvas background) until resolved.
- If no session, render the existing landing page unchanged.
- Keep SSR/SEO intact — the marketing HTML still renders for crawlers and signed-out visitors; the redirect only fires client-side after hydration.
- No changes to `__root.tsx`, auth flow, or other routes.
