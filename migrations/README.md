# Database Migrations

Execute in order:

## Fresh Deploy (new database)

1. **`supabase-schema.sql`** — full schema with seed data
2. Numbered migrations in order: `001-*.sql`, `002-*.sql`, ...

## Existing Database (upgrade)

1. Numbered migrations only, in order: `001-*.sql`, `002-*.sql`, ...

Each migration is idempotent — safe to re-run.
After all migrations, refresh PostgREST schema cache:

```sql
NOTIFY pgrst, 'reload schema';
```
