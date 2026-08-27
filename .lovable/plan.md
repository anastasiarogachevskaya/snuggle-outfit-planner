# Re-require email confirmation, keep a sane OTP expiry

## What I checked

I queried the auth user list directly. Findings:

- The three most recent signups (all Aug 26) each have a `confirmation_sent_at` timestamp followed by confirmation ~20 seconds later — so at that point confirmation emails were being sent and required.
- There is **no user row created on Aug 27**, i.e. the fresh-email signup you just tried did not create a new account. That points at the email you used already existing and already being confirmed, which would explain "logged in immediately, no email" without confirmation being globally off.

I cannot read the current "Confirm email" toggle value with the tools available — it is only readable in the Cloud auth settings UI. So the diagnosis above is likely but not proven; the plan starts by settling it.

## Plan

1. Explicitly write the auth configuration so confirmation is required: set auto-confirm email signups to **off**, leaving signups enabled, anonymous users off, and HIBP leaked-password checking unchanged. This makes the state deterministic regardless of what the toggle is now.
2. Confirm the OTP expiry is set to 24 hours in Cloud → Users → Auth settings (this dial is UI-only; I will tell you exactly where if it still reads low).
3. Verify with a genuinely unused email address: sign up, confirm a new `auth.users` row appears with `confirmation_sent_at` set and `email_confirmed_at` null, check the email arrives, wait a couple of minutes, then open the link and confirm it succeeds rather than returning `otp_expired`.

## Notes

- Step 1 is a settings change only — no app code changes.
- If step 3 shows the row created but no email delivered, the next thing to inspect is the email delivery log rather than the auth toggles.
