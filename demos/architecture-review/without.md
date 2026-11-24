# Parcelly: quick architecture review

**Bottom line:** The architecture fits today's load, but it doesn't back up the 99.9% promise, and the missing webhooks have a clear cause. Before you grow 10x, fix data durability, webhook delivery and tenant isolation. You don't need microservices or multi-region. You need to remove the single points of failure and stop losing messages.

## Top risks, in priority order

### 1. Availability doesn't match the 99.9% SLA
- 99.9% monthly allows about 43 minutes of downtime. The single-instance RDS (not Multi-AZ) can use that up in one AZ incident or one forced maintenance window.
- The single-node Redis holds both sessions and the job queue. If it fails, everyone is logged out and queued jobs are lost.
- **Nobody has ever tested a restore.** Until you do, you don't really have backups. Nightly snapshots also mean up to 24 hours of data loss.

**Fix:** Turn on RDS Multi-AZ and point-in-time recovery, and run a restore drill this month. Switch Redis to a replication group with automatic failover, and turn persistence on. All of this is configuration, not code.

### 2. Webhooks get lost (the biggest tenant's complaint)
There are three separate ways a webhook goes missing:
- **Dual write:** the API updates the row and then enqueues the job. A crash or Redis error between the two steps loses the event silently.
- **Queue loss:** jobs live only in a single, non-replicated Redis.
- **Drop after 5 retries:** a tenant endpoint that's down for a few minutes loses events for good, with no alert.

**Fix:** Use a transactional outbox. Write an event row in the same transaction as the status change, and have a relay publish it to the queue. Use exponential backoff over hours, then send failures to a dead-letter table instead of dropping them. Add a delivery log, a replay endpoint and an event id that tenants can use for idempotency. Alert when failure rates rise.

### 3. Twilio is called inside the dispatch request
A slow or failing Twilio call slows down or fails delivery creation. It has the same dual-write problem as webhooks: the row is committed but the SMS may never go out, or the SMS goes out and the commit fails. **Fix:** send SMS through the same outbox and queue path.

### 4. `driver_locations` grows without limit
At 1,200 drivers, a ping every 10 seconds and about 8 active hours, that's roughly **3.5M rows a day** and around 1.3B a year. At 400 tenants it's about 10x that. Inserts also compete with dashboard reads on the same single instance.

**Fix:**
- Partition by day using native partitioning or pg_partman.
- Set a retention policy, for example 30 to 90 days raw and downsampled after that.
- Keep each driver's latest location in Redis or a small upsert table.
- Batch inserts if needed.

### 5. Tenant isolation depends on every handler remembering `WHERE tenant_id`
One missed clause leaks another tenant's data. The `/admin` router in the same API, protected by a single claim, makes the impact of a bug or a stolen secret much larger.

**Fix:**
- Turn on Postgres row-level security and set `app.tenant_id` per transaction from middleware.
- Add tests that try to read across tenants.
- Move admin to a separate service or at least a separate auth path, with MFA and audit logging.

### 6. Auth hygiene
- The HS256 secret in a task environment variable can sign admin tokens and driver tokens alike. Move it to Secrets Manager with rotation, or better, switch to asymmetric keys (RS256 or ES256) with a `kid` header.
- 24-hour JWTs can't be revoked. Use short access tokens plus refresh tokens, or keep a denylist. This matters most for drivers who leave a company.
- Separate driver and dispatcher tokens with `aud` and scope claims, so a driver token can't call dispatcher or admin routes.
- Add rate limiting on login and confirm passwords are hashed with argon2 or bcrypt.

### 7. Dashboard slows down at lunch
This is likely missing or poorly targeted indexes combined with peak-time write contention from location pings.

**Fix:**
- Add a partial index such as `(tenant_id, status) WHERE status IN (...)`.
- Return `ETag` or `If-None-Match` headers so unchanged polls cost almost nothing.
- Later, push updates with SSE or WebSockets instead of 5-second polling.
- Add a read replica once Multi-AZ is in place.

### 8. Observability is too thin for two people on call
- Today you can't tell "Twilio is failing" or "webhooks are backing up" apart from normal operation.
- Add structured JSON logs that include `tenant_id` and request id.
- Add alerts on queue depth, job failure rate, Twilio and webhook error rates, RDS CPU, connections and storage, and ALB 5xx and latency.
- Add an external synthetic check and SLO burn-rate alerts tied to the 99.9% target.
- Start tracing with OpenTelemetry on the dispatch and status paths.

## Noisy neighbours
One tenant is 30% of volume, and at 400 tenants several will be large. Add per-tenant rate limits and per-tenant queue concurrency, so one tenant's webhook endpoint or burst of activity can't starve everyone else.

## Suggested sequence

| When | Work |
|---|---|
| Weeks 1–2 | RDS Multi-AZ and PITR, restore drill, Redis with failover, failure alerts, rotate the JWT secret into Secrets Manager |
| Weeks 3–6 | Transactional outbox for webhooks and SMS, DLQ, replay and delivery log, partition `driver_locations` plus retention, dashboard index and ETag |
| Months 2–3 | Postgres RLS, split admin out, driver token scoping and refresh tokens, per-tenant limits, structured logs and tracing |
| Before 400 tenants | Load test at 10x, read replica, push-based dashboard, review connection pooling (RDS Proxy or PgBouncer) |

## What not to do yet
- Don't split into microservices or go multi-region. With 4 engineers, that's cost with no matching benefit.
- Don't move to database-per-tenant. Shared tables with RLS is the right model at this size.

## Open questions
- What are the RDS and Redis instance sizes, and how much headroom is there today?
- How are migrations run during the rolling deploy? Are they backward-compatible?
- Do webhooks need ordering guarantees per delivery?
- Does the marketplace partnership bring contract terms (SSO, data residency, audit) that would change these priorities?
