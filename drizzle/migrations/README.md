# These migrations are hand-written

Drizzle is used here purely as a **migration runner**, never as an ORM:
`drizzle-orm` is not imported anywhere in `src/`, and `drizzle/schema.ts` is an
intentionally blank placeholder.

## Never run `drizzle-kit generate`

Because `schema.ts` is blank, drizzle-kit believes the database should be
empty. Generating would diff the real `app_events` table against nothing and
propose **dropping it**, along with its RLS policies and the retention job.
The snapshots in `meta/` only cover `0000`–`0002`, so they are stale too.

Add a migration by hand instead:

1. Write `NNNN_short_description.sql` with the next number in sequence.
2. Add a matching entry to `meta/_journal.json` (`idx`, `tag`, `when` in ms).

## Two migration directories exist

- `supabase/migrations/` owns `profiles`, `babies`, `wardrobe_items`, `feedback`.
- `drizzle/migrations/` owns `app_events` (plus `pg_cron` and the RLS policies).

They don't overlap, but ordering between the two is not enforced, and
`0001`/`0002` here add foreign keys to `auth.users`. A from-scratch rebuild of
the database may therefore need the `supabase/` set applied first.
