# Add analytics retention and anonymization

## Changes
- Change account deletion to anonymize matching analytics rows by clearing their account ID instead of deleting the rows.
- Remove the account-deletion cascade rule so anonymized funnel history remains available.
- Add a daily cleanup job that permanently deletes analytics events older than 90 days.
- Update the account deletion confirmation and privacy policy with the exact behavior.

## Validation
- Confirm the database migration and scheduled cleanup are active.
- Confirm account deletion code and pages build successfully.
