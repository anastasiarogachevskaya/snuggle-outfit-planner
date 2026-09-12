# Clear analytics on account deletion

## Changes
- Link signed-in analytics rows to their account with automatic deletion when the account is removed.
- Explicitly clear the caller’s analytics rows before deleting their sign-in account, while leaving anonymous events untouched.
- Update the deletion confirmation and privacy wording to include analytics data.

## Validation
- Confirm the database rule applies successfully.
- Confirm the account flow builds without errors.
