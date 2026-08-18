# Add the iOS auth redirect URLs (Lovable Cloud, not Supabase dashboard)

## Why this is needed

The iOS deep-link code is already implemented and building (`src/lib/auth-urls.ts`,
`src/lib/native-auth-link.ts`, and the `__root.tsx` handler). The only remaining
gap is the auth **Redirect URLs allowlist**: Supabase refuses to redirect to a
URL that isn't on it, so the native `layerly://` links would silently fall back
to the Site URL and never reach the app.

This is a **Lovable Cloud–managed** project. There is **no Supabase dashboard**
to log into — the allowlist is edited inside Lovable itself.

## What's already auto-allowed vs. what you must add

The project **Site URL is `https://layerly.online`** (confirmed via auth config).
Supabase auto-allows any URL that shares the Site URL's origin, so two of the six
are already covered:

| URL | Status |
| --- | --- |
| `https://layerly.online/auth-callback` | Auto-allowed (same origin as Site URL) — no action |
| `https://layerly.online/reset-password` | Auto-allowed (same origin as Site URL) — no action |
| `https://www.layerly.online/auth-callback` | **Must add** (different hostname `www`) |
| `https://www.layerly.online/reset-password` | **Must add** (different hostname `www`) |
| `layerly://auth/callback` | **Must add** (custom scheme — required for iOS) |
| `layerly://auth/reset-password` | **Must add** (custom scheme — required for iOS) |

Adding a URL that's already present is harmless (Supabase de-duplicates), so you
can safely paste all six if it's easier than picking four.

## Where to add them

In the Lovable editor:

1. Open the **Cloud** tab.
2. Go to **Users**.
3. Click **Auth settings** (gear icon).
4. Scroll to the **Advanced** section.
5. In **Redirect URLs**, add the four URLs above (or all six).

Custom schemes like `layerly://` are supported here — this is the one place the
native redirect can be registered. There is a limit of 50 redirect URLs, so four
more is no problem.

## No code changes

The deep-link implementation is already complete and the project builds. This
plan is configuration + verification only.

## How I'll verify after you add them

- Re-check the auth config to confirm the new URLs are present in the allowlist.
- Confirm web sign-up / password-reset still redirect correctly in the preview
  (the `layerly.online` origin path must not regress).
- Note: end-to-end native verification (tapping a real email link on an iPhone,
  cold-start launch, the Apple/Google OAuth round trip) must be run by you on a
  Mac/iPhone — I'll give you the exact steps and expected results.

## If the custom scheme is rejected

If Lovable's Auth settings refuses the `layerly://` entries, do **not** fall back
to the Supabase dashboard (none exists here). Instead we pivot to **Universal
Links**: keep the auto-allowed `https://layerly.online/auth-callback` URL, add an
`apple-app-site-association` file on the domain, and an Associated Domains
entitlement in the iOS app, so iOS opens the app for those HTTPS URLs directly.
No allowlist change is needed for that path.
