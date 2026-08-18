# iOS authentication deep links

## What I found (verified in the code)

- `ios-app/ios/App/App/Info.plist` has **no `CFBundleURLTypes` entry**, so `layerly://` is not registered at all. Any auth email link pointing at `layerly://…` currently does nothing on the device.
- All auth redirects are hardcoded to the web origin: `window.location.origin + "/auth-callback"` (sign-up and OAuth in `src/routes/auth.tsx`) and `window.location.origin + "/reset-password"` (`src/routes/forgot-password.tsx`). There is no native branch.
- The deep-link plumbing exists but is incomplete: `src/lib/native-lifecycle.ts` listens to `appUrlOpen`, reads `App.getLaunchUrl()` for cold start, and de-dupes with `lastHandledUrl`. `src/routes/__root.tsx` turns the URL into a router navigation using `pathname + search + hash`.
- That last step is the real gap: the Supabase client only parses tokens from the URL on page load, not on a client-side router navigation, so a `layerly://auth/callback#access_token=…` deep link would navigate but never create a session.
- The iOS app loads the live site (`server.url = https://layerly.online`), so the deep link must be translated into an in-WebView route plus an explicit Supabase session call — the WebView never loads the `layerly://` URL itself.

## What I'll build

### 1. Register the URL scheme (native)
Add a single `CFBundleURLTypes` entry to `Info.plist`: name `online.layerly.app`, scheme `layerly`. No other schemes. Nothing else in the Xcode project needs to change — `AppDelegate` already forwards `application(_:open:)` to Capacitor.

### 2. Platform-aware redirect targets
New helper `src/lib/auth-urls.ts` using the existing `isNativeApp()` from `src/lib/platform.ts`:

```text
native  → layerly://auth/callback         and layerly://auth/reset-password
web     → https://layerly.online/auth-callback and /reset-password (unchanged, via window.location.origin)
```

Sign-up, OAuth, and password reset call this helper instead of hardcoding the origin. Web behaviour is byte-for-byte the same as today.

### 3. Consume the callback correctly
New `src/lib/native-auth-link.ts` that takes the incoming deep-link URL and:

- parses `layerly://auth/callback` and `layerly://auth/reset-password`, reading params from both the query string and the fragment;
- PKCE style (`?code=…`) → `supabase.auth.exchangeCodeForSession(code)`;
- implicit style (`#access_token=…&refresh_token=…`) → `supabase.auth.setSession({ access_token, refresh_token })`;
- error style (`error`, `error_code`, `error_description`, e.g. `otp_expired`) → resolves to a friendly failure;
- returns a result the root handler maps to a route: callback → `/today` (or the stored next path), reset → `/reset-password`, failure → `/auth-callback?error=expired` style state showing "This link has expired or is no longer valid. Please request a new one." with a **Back to sign in** / **Send another link** action.

Nothing is persisted by hand — only official `setSession` / `exchangeCodeForSession`; no token is logged, and the existing diagnostics logging will be checked to make sure it never prints a URL containing a token or code.

### 4. Cold start and warm start
Both paths already exist in `native-lifecycle.ts` (`getLaunchUrl()` at init, `appUrlOpen` while running) and both feed the same handler. I'll harden the de-dupe so the same URL delivered by both paths is processed once, keyed on the link's token/code rather than only on the raw string, and make the handler async-safe so a second delivery while the first exchange is in flight is ignored.

### 5. Reset-password screen
`src/routes/reset-password.tsx` keeps its current logic but will also wait for a session established by the deep link before deciding the link is invalid, so the native flow doesn't flash the "invalid link" state. Token stays out of the UI and out of logs.

### 6. Session restoration
Session persistence already works via the Supabase client's `localStorage` + `persistSession`; the WebView keeps that storage across launches. I'll verify the authenticated gate doesn't flash the sign-in screen on cold launch and, if it does, gate the redirect on the session check resolving rather than adding new auth logic.

## Supabase dashboard changes you must make manually

I cannot change the auth redirect allowlist from here. Add these to the **Redirect URLs** allowlist:

```text
layerly://auth/callback
layerly://auth/reset-password
https://layerly.online/auth-callback
https://layerly.online/reset-password
https://www.layerly.online/auth-callback
https://www.layerly.online/reset-password
```

Site URL stays `https://layerly.online`. I'll report back which of these already exist versus which you need to add, and I won't claim anything was changed that wasn't.

## Not touched

Recommendation logic, weather, location, wardrobe, baby profile, design, icons, splash screen, database schema.

## Testing I can and can't do

I can run `bun run build`, `bun run prepare:ios`, and the unit tests, and verify web auth still works in the preview. Xcode builds, real Mail-app taps, cold-start launches, and the email round trips must be run by you on a Mac/iPhone — I'll list the exact steps and expected results at the end.
