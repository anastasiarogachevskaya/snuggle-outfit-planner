# Auth fixes: stuck Google sign-in, Apple provider, email confirmations

## 1. Google sign-in gets stuck after backing out (confirmed)

`oauth()` in `src/routes/auth.tsx` sets `busy = true`, and the native Google path
returns `{ status: "pending" }` right after opening the system browser. Nothing
clears `busy` unless the `layerly://auth/callback` deep link comes back, so
dismissing the browser leaves every sign-in button and input disabled.

Fix (small and bounded):
- Add a `browserFinished` listener helper in `src/lib/native-social-auth.ts`
  that fires once when the Capacitor Browser is dismissed.
- In `src/routes/auth.tsx`, subscribe on the pending path and call
  `setBusy(false)` when the browser closes without a deep link; remove the
  listener on unmount and when the deep link does arrive.
- Safety net: also clear `busy` when the auth route regains focus/resume
  without a session.

## 2. Lovable API key / auth email webhook

The project already has a `LOVABLE_API_KEY` secret; the crash you saw came from
`src/routes/lovable/email/auth/webhook.ts` building its handler at import time,
which broke the whole route tree when the variable was not present during dev
module evaluation. That was already changed to build lazily on first request.
Remaining step: confirm the key is actually readable inside the handler at
runtime and, if the gateway rejects it, rotate it once with the managed key
rotation tool. The key cannot be pasted in by hand — it is Lovable-managed.

## 3. Apple provider

Enable Apple through the managed social login configuration so the provider is
active, then verify the native client ID `online.layerly.app` is accepted
alongside the existing web Services ID. If the managed configuration does not
accept a second (native) client ID, that field has to be set once in
Cloud → Users → Auth settings → Apple; the plan will report exactly which of the
two applies after the configuration call.

## 4. Web auth flow (signup → confirm → sign in)

Verify against the live site rather than assume:
- signup creates a user with `confirmation_sent_at` set and
  `email_confirmed_at` null,
- the confirmation email renders through the webhook route,
- following the link signs the user in and lands on `/today`.

Fix whatever step fails; no redesign of the auth screens.

## 5. Real-iPhone walkthrough

This environment has no macOS, Xcode, simulator, or device, so I cannot build
the iOS app or tap through Apple/Google on a real iPhone. After the above lands,
I will hand you a short, ordered test script (what to tap, what to expect at each
step, what to copy back if it fails) so a single TestFlight run pinpoints the
failing step.

## Technical notes

- Files touched: `src/routes/auth.tsx`, `src/lib/native-social-auth.ts`, plus
  the already-lazy `src/routes/lovable/email/auth/webhook.ts`.
- No changes to recommendation, location, wardrobe logic, UI design, app icon,
  or the launch screen.
