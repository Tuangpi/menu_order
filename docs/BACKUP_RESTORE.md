# Backup and Restore Procedure

## Backup
Create a compressed SQL dump:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=/backups/menu_order_$(date +%F).dump
```

Schedule daily via cron and retain at least 7 days.

## Restore (non-production test)
```bash
createdb menu_order_restore_test
gunzip -c /backups/menu_order_YYYY-MM-DD.dump.gz | pg_restore --dbname=menu_order_restore_test --no-owner
```

For custom format:
```bash
pg_restore --dbname=menu_order_restore_test --no-owner /backups/menu_order_YYYY-MM-DD.dump
```

## Verification
- Run `npm run prisma:migrate -w @menu/api` against the restored database.
- Start the API with `DATABASE_URL` pointing to the restored database and check `/api/health`.
- Confirm restaurant, menu, order, and payment records are present.

## Cleanup
```bash
dropdb menu_order_restore_test
```

## Verification record
- Restored `/tmp/menu_order.dump` to `menu_order_restore_test` on 2026-10-27; record counts matched source.
