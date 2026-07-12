## Plan

1. **Fix OAuth redirect target**
   - Change Google/Apple sign-in to use a public same-origin redirect URL, not `/today`.
   - Store the intended destination separately, then navigate to `/today` only after the auth session is confirmed.
   - This is likely the main bug: `/today` is behind the authenticated route gate, so OAuth can return before the session is hydrated and get bounced back to `/auth`.

2. **Preserve onboarding flow after registration**
   - For email signup, redirect to the public auth page/callback first, then route the user into the setup flow.
   - Keep the desired next step as a safe same-origin path, e.g. baby profile or wardrobe onboarding.

3. **Improve auth page behavior**
   - Add loading/error handling around social sign-in so failures show the real provider error when available.
   - Prevent the sign-in button from staying disabled if the OAuth helper returns an error.
   - Keep closeable toast notifications as they are already configured.

4. **Verify provider configuration**
   - Reconfigure/confirm Google and Apple auth providers through Lovable Cloud auth tooling if needed.
   - Google is known to be supported; Apple support depends on the managed auth provider state, so I’ll verify before claiming it works.

5. **Validate**
   - Test email/password sign-in route behavior locally.
   - Check that Google/Apple buttons no longer target the protected `/today` route directly.
   - Confirm authenticated users land on the intended page after session hydration.