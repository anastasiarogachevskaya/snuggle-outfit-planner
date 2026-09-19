# Make temperature preference clear and part of iPhone setup

## What will change

- Add temperature preference to the first iPhone baby setup screen, directly after date of birth.
- Replace the hard-to-read slider presentation with one clear, reusable five-step control that shows the current choice prominently and labels the warm-to-cold direction.
- Use the same control on the local profile page and the account-based web profile setup, fixing the unreadable current web presentation.
- Keep the quick no-account web trial unchanged: it still defaults to **Average** because that flow is intentionally minimal.
- Keep the existing recommendation scale and default of **Average**; only the setup and presentation change.

## Technical details

- Add a shared temperature-preference control with accessible radio inputs for values 1–5.
- Pass the selected value into local profile creation and persist it with the existing on-device profile.
- Update focused tests for local profile creation and run the relevant checks plus an iPhone-size visual verification.
