# Backups — Royal Temple Worship Centre Database (Aiven MySQL)

## Aiven Automated Backups

- Aiven provides **automated daily backups** on most plans.
- **Confirm this is enabled** in the Aiven console: open the MySQL service →
  **Backups** tab. Verify backups are running and note the configured
  **retention period** (typically 7–30 days depending on plan; check the plan
  details for your service).
- Backups are stored by Aiven in a separate region from the primary by default,
  which protects against region-level failures. This is configurable in the
  service settings.

## Manual Backups Before Schema Changes

- Always take a manual export **before any major schema change** (e.g. before
  applying new migrations or dropping columns/tables):

  ```bash
  mysqldump \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --user=$DB_USER \
    --password=$DB_PASSWORD \
    --single-transaction \
    --routines \
    --triggers \
    $DB_NAME > backups/royaltemple_$(date +%Y%m%d_%H%M%S).sql
  ```

- Keep exports out of version control (add `backups/` to `.gitignore`).

## Restore

To restore from a dump:

```bash
mysql --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASSWORD $DB_NAME < backups/royaltemple_YYYYMMDD_HHMMSS.sql
```

Restoring over an existing database will overwrite data — restore into a fresh
database first when in doubt, then verify row counts before switching.
