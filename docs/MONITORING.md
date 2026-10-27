# Monitoring and Alerting

## Health checks
- `GET /api/health` returns 200 when the API is running.
- Configure the load balancer or uptime monitor to poll this endpoint every minute.

## Logs
- API logs unhandled errors via `console.error`.
- Capture stdout/stderr with the process manager or container runtime.
- Do not log passwords, tokens, or payment secrets.

## Alerts
- Alert when `/api/health` fails 3 consecutive checks.
- Alert on 5xx error rate above 5% over 5 minutes.
- Alert on database connection failures.
- Alert when disk space on the database host falls below 20%.

## Backups
- Alert if a daily backup job does not complete successfully.
