**Claude:**

**Phase 0: intake.** Evidence is one design document (Mode B): *Parcelly: architecture overview*. Every claim in it counts as E2 (documented). The "Known pain points" section counts as E3 (reported). I have no code, IaC, metrics or ADRs, so confidence tops out at Medium. Depth is **quick**, so you'll get the executive summary, scorecard, top 10 findings and the ADRs to write. Code design (§9) will be N/A because there's no code.

The document is detailed. Seven gaps could still change a severity or the final verdict. They're ranked by impact below, each with a default. Answer the ones you know, or reply **"use defaults"** and I'll proceed with those assumptions written down.

1. **RPO/RTO.** What data loss and recovery time can you accept? §Business promises 99.9% monthly uptime, which allows about 43 minutes of downtime a month (30 × 24 × 60 × 0.001). §Stack shows a single-instance RDS and a restore that has never been tested. Your answer decides whether the database finding is Critical or High, and it may change the verdict.
   *Default: RPO 1 hour, RTO 1 hour.*

2. **Webhook contract.** Do tenants, or the marketplace partner, expect guaranteed delivery of status webhooks, or best effort? Today §Main flows 3 drops the job after 5 retries, and §Known pain points says the biggest tenant reports missing webhooks.
   *Default: at-least-once delivery is expected, even if no contract says so.*

3. **Partnership requirements.** Does the regional logistics marketplace require SOC 2, SSO/SAML, an API integration, data residency or a tenant isolation level? These set the weight of security and compliance, and whether the shared-table tenancy model is a one-way door heading the wrong way.
   *Default: SOC 2 Type II within 12 months and an API integration. No residency rule and no siloed tenants.*

4. **Privacy and compliance scope.** Where are tenants, drivers and recipients located? Does any regulation apply to driver GPS history and recipient phone numbers? §Main flows 2 says `driver_locations` has no retention policy.
   *Default: US only, with CCPA-style obligations and no GDPR.*

5. **Load shape.** How many hours a day is a typical driver active? How sharp is the lunch peak? Will the 400 tenants be about the size of today's? This drives the growth math. Today 1,200 drivers × 6 pings/min is about 120 inserts/s. At 10 active hours that's about 4.3M rows/day. The same tenant mix at 400 tenants is about 10× that.
   *Default: 10 active hours per driver, a lunch peak at 3× average, and new tenants the same size as today's. That gives 10× volume: about 12,000 drivers and 250,000 deliveries/day.*

6. **Recent incidents.** Have you had any outages, data loss, tenant data leaks or Twilio/webhook incidents in the last 6 months? Do you measure actual uptime? This sets likelihood ratings.
   *Default: nothing beyond the two reported pain points, and uptime isn't measured.*

7. **Constraints.** Will the team grow past 4 engineers in the next 18 months? Is there budget for more managed AWS spend (Multi-AZ, larger Redis, etc.)? Is anything out of scope, such as the driver app or the dashboard frontend? This sets how much each recommendation can ask for.
   *Default: 4 to 6 engineers, AWS only, a modest infrastructure increase is acceptable, and the review covers backend and infrastructure only.*


**User:**

> use defaults

**Claude:**

**Mode B (one design document), quick depth, backend and infrastructure only.** Citations use `[Parcelly overview §section]`.
**Assumptions (your defaults):** RPO 1 h and RTO 1 h. At-least-once webhooks. SOC 2 Type II within 12 months plus a partner API. US only with CCPA-style duties. 10 active driver-hours a day, a 3× lunch peak and 10× volume at 400 tenants. No incidents beyond the two reported, and uptime isn't measured. Team of 4–6, AWS only, modest budget.
**Not scored:** D2 and D11 need code. D3 is N/A (one API plus one worker isn't microservices), as are D5 (no CQRS/ES) and D15 (no LLM use).
**What would raise confidence:** the repo, IaC, RDS/ElastiCache settings and a month of ALB/RDS metrics.

## 1. Executive summary

**Verdict: Not fit for purpose** against the 99.9% uptime promise and the 400-tenant goal. Overall score **1.6 / 5**. The score is provisional because it rests on one design document.

Parcelly's basic design is right. One API and one worker on managed AWS services suits a four-person team, and every fix below fits inside that design. The problems are in the data layer and in failures nobody is watching.

**Top risk themes**
1. **Uptime and recovery** (F-01, F-08). The database and Redis each run as a single copy, and no one has ever tested a restore. One bad day can break every customer contract at once.
2. **Tenant data separation** (F-03, F-04). One forgotten filter or one leaked key could show one courier another courier's data, or give an attacker admin over every tenant.
3. **Growth and silent failures** (F-02, F-05, F-06, F-07). GPS data grows forever, the dashboard polls the same database, and webhook events get lost with no alert. The biggest customer is already affected.

**Top strengths**
- The architecture is sized to the team (F-09).
- Deploys are automated and the app runs across two availability zones (F-10).
- Shared-table tenancy keeps the cost per tenant low.

**Most important action:** this week, turn on Multi-AZ for the database and replication for Redis, confirm point-in-time recovery, and time a full restore. That takes days of configuration, not a project.

## 4. Scorecard

The weights come from the four (H,H) quality scenarios:
- **QA1 availability:** a DB host or availability zone fails at the lunch peak, and service is back within 1 h, with at most 43 min of downtime a month.
- **QA2 recovery:** after data corruption, a restore to data at most 1 h old is done within 1 h.
- **QA3 isolation:** a tenant A user asking for tenant B data, or a forged token, is denied.
- **QA4 growth:** at 400 tenants and the 3× lunch peak, the dashboard and GPS ingest stay within the latency target.

QA5 (H,M) is integration: a tenant endpoint is down for 6 h, and every webhook still arrives after it recovers.

| Dimension | Weight | Score (0–5) | Confidence | Cap applied? | Rationale |
|---|---|---|---|---|---|
| D1 Style and structural fit | 5 | `███▌░ 3.5` | Medium | No | One API plus one worker on managed services fits a single team of 4 (F-09). |
| D4 Job queue / async | 10 | `█▌░░░ 1.5` | Medium | ≤2.5 (F-02) | Dual write, jobs dropped after 5 retries, no DLQ or alert, queue on a single Redis node. |
| D6 Scalability and performance | 15 | `██░░░ 2.0` | Medium | ≤2.5 (F-05, F-06) | The API scales out, but GPS writes and dashboard polling both land on one primary with no limits. |
| D7 Reliability and resilience | 18 | `█░░░░ 1.0` | Medium | ≤1.5 (F-01) | Single-AZ DB and Redis, untested restore, Twilio called synchronously. |
| D8 Data and tenancy | 12 | `██░░░ 2.0` | Medium | ≤2.5 (F-03) | The pooled model is right, but isolation lives only in app code and there's no retention policy. |
| D9 Security / Zero Trust | 15 | `█▌░░░ 1.5` | Medium | ≤2.5 (F-04) | One shared signing secret for every token, 24 h tokens, admin in the public API, no MFA described. |
| D10 API and integration | 5 | `█▌░░░ 1.5` | Low (provisional) | No | The doc says nothing on versioning, rate limits or webhook signing. |
| D12 Observability | 8 | `█░░░░ 1.0` | Medium | ≤2.5 (F-07) | Plain-text logs, CPU/memory alarms only, no SLIs, failures not alerted. |
| D13 Delivery and governance | 4 | `██▌░░ 2.5` | Low (provisional) | No | Automated CI/CD (F-10). No ADRs, fitness functions, rollback or migration strategy described. |
| D14 Cost | 3 | `██░░░ 2.0` | Low (provisional) | No | Managed and right-sized for today. Unit cost isn't tracked, and GPS storage grows without bound. |
| D16 Compliance | 5 | `█░░░░ 1.0` | Low (provisional) | No | Against the assumed SOC 2 and CCPA: no retention, audit logging or admin MFA described. |
| **Overall (weighted)** | **100** | **`█▌░░░ 1.6`** | | | **Not fit for purpose**: below 2.5, with one open Critical. |

Math: (3.5×5 + 1.5×10 + 2.0×15 + 1.0×18 + 2.0×12 + 1.5×15 + 1.5×5 + 1.0×8 + 2.5×4 + 2.0×3 + 1.0×5) / 100 = 163.5 / 100 = 1.6.

F-01's fix takes days, not months, and fixing F-01 through F-04 would bring D4, D7, D8 and D9 up to their caps or higher. After those fixes, a re-score would likely land at "Fit with conditions".

## 5. Findings

### [F-01] Database and Redis are single points of failure, and recovery has never been tested
- Dimension: D7 | Severity: Critical | Confidence: Medium
- Evidence (E2): [Parcelly overview §Stack and deployment]: PostgreSQL on RDS is a "single instance (not Multi-AZ)", with "Nightly automated snapshots. A restore has never been tested." Redis is a "single node", and it "holds sessions and the BullMQ job queue". [§Business]: contracts promise 99.9% monthly uptime.
- Observation: Compute runs in 2 AZs, but each stateful component exists in one place only. The only backup the doc describes is a nightly snapshot. Nobody knows whether a restore works or how long it takes.
- Impact: 99.9% allows about 43 min of downtime a month. If the DB host or its AZ fails, the whole service is down until AWS replaces the host or you restore somewhere else. One multi-hour event uses up several months of error budget and breaches the contract with all 40 tenants at once. If point-in-time recovery isn't on, worst-case loss is about 24 h of data, or roughly 25,000 deliveries, against the assumed 1 h RPO. If the Redis node is lost, every queued webhook and ETA job is gone and every session is logged out. This threatens QA1 and QA2. Severity: the likelihood is moderate, but the blast radius is every tenant and the gap to the contract is large.
- Root cause: Early-stage defaults were never revisited after the contracts added an uptime promise.
- Recommendation: Turn on RDS Multi-AZ. Confirm automated backups with point-in-time recovery and set the retention period. Run a timed restore drill into a fresh instance now, then every quarter. Turn on ElastiCache replication with a replica in the second AZ and automatic failover. Keep Redis non-authoritative (see F-02).
- Alternatives & trade-offs:
  - (a) A Multi-AZ DB cluster with readable standbys: also gives F-06 a read target, but costs more.
  - (b) Moving to Aurora: faster failover and storage scaling, but it's a migration project a team of 4 doesn't need yet.
  - (c) Staying single-AZ and relying on restores: cheapest, but it can't meet 43 min a month.
  - Multi-AZ roughly doubles the DB instance cost. It wins because it's a setting change.
- Effort: S | Reversibility: two-way
- Verification: Force an RDS failover and a Redis failover, first in staging and then in a prod maintenance window. The API 5xx rate should return to baseline within 5 min. The restore drill should bring back data no more than 1 h old and serve traffic within 1 h. Log each quarter's drill result.

### [F-02] Webhook events are lost silently in three ways
- Dimension: D4 | Severity: High | Confidence: Medium
- Evidence (E2, E3): [§Main flows 3]: "the API updates the delivery row, then enqueues a webhook job… retries 5 times, then drops the job." [§Stack and deployment]: the queue runs on a single Redis node. [§Observability]: webhook failures are "logged but not alerted on". [§Known pain points]: the biggest tenant reports missing webhooks (E3).
- Observation: Events get lost three ways:
  1. A crash between the DB commit and the enqueue (a dual write).
  2. A tenant endpoint that stays down longer than the 5-retry window.
  3. Losing the Redis node.

  None of these alerts anyone. The doc doesn't state a backoff schedule.
- Impact: Tenants' systems drift away from Parcelly without anyone noticing. The affected tenant carries about 30% of volume, roughly 7,500 deliveries a day. Under the assumed at-least-once expectation, this is a contract failure, and the marketplace integration will multiply it. This threatens QA5 and the partnership driver.
- Root cause: A volatile queue is treated as the source of truth. There's no outbox and no dead-letter path.
- Recommendation:
  - Write the status change and an outbox row in the same Postgres transaction. A relay moves outbox rows into BullMQ.
  - Retry with exponential backoff and jitter over about 24 h.
  - After the last retry, mark the event failed in Postgres (a dead-letter record), alert, and let tenants replay it.
  - Send a unique event ID so tenants can drop duplicates.
- Alternatives & trade-offs:
  - (a) SQS with a DLQ in place of BullMQ: a durable managed queue, but a second queue technology to run.
  - (b) A poller that delivers straight from the outbox: fewer moving parts, but you rebuild retry scheduling yourself.
  - The recommendation keeps today's tools.
- Effort: M | Reversibility: two-way
- Verification: Run two fault tests. Kill the worker between commit and enqueue, and take a test tenant endpoint down for 6 h. In both, 100% of events should arrive after recovery. Add a daily reconciliation check (status changes = delivered + dead-lettered) that alerts on any gap.

### [F-03] Tenant isolation depends on every handler remembering one clause
- Dimension: D8 | Severity: High | Confidence: Medium
- Evidence (E2): [§Security]: "Each route handler scopes queries with `WHERE tenant_id = $1`, taking the tenant from the JWT claim." [§Stack and deployment]: all tenants share tables.
- Observation: Pooled tables are the right cost model for 400 small tenants. But isolation lives in each handler, and nothing in the database stops a query that leaves the clause out. The doc doesn't say how the worker or the `/admin` router scope their queries.
- Impact: One missed clause exposes other couriers' deliveries and their recipients' phone numbers (OWASP API1:2023 BOLA). Every new endpoint adds to the risk, and the 400-tenant growth plus the partner API add many more endpoints and widen the blast radius. Detectability is low because no test or alert would catch a leak. This threatens QA3. The tenancy model is a one-way door, and this is the right moment to harden it.
- Root cause: Isolation is enforced by convention, with no second layer.
- Recommendation: Keep the pooled tables and add a second layer:
  - Turn on Postgres row-level security for every tenant table.
  - Have the app connect as a non-owner role and set the tenant for each transaction (`SET LOCAL`).
  - Give the admin and worker paths a separate role with explicit, reviewed access.
  - Add CI tests that call every tenant route with tenant A's token and tenant B's IDs.
- Alternatives & trade-offs:
  - (a) A schema per tenant: stronger separation, but 400× the migrations.
  - (b) A database per tenant for the largest tenants: maximum isolation, but more cost and operations than a team of 4 should carry.
  - (c) A query wrapper in code only: cheaper, but still no defense in depth.
  - Row-level security adds a small cost per query. Setting the tenant per transaction has to be done carefully with pooled connections.
- Effort: M | Reversibility: one-way for the tenancy model (keep it), two-way for row-level security
- Verification: The cross-tenant CI suite covers 100% of tenant routes with zero leaks. A query run with no tenant set returns zero rows.

### [F-04] One shared secret can mint any token, admin included
- Dimension: D9 | Severity: High | Confidence: Medium
- Evidence (E2, E4): [§Security]: email-and-password login; JWTs with a 24-hour expiry, "signed with a shared secret stored in an ECS task environment variable"; `/admin` "lives in the same API, protected by an `is_admin` claim"; the driver app "uses the same kind of JWT". Inference (E4): a symmetric secret lets anyone who can read it sign tokens. If the value sits in plain text in the task definition, rather than injected from Secrets Manager (the doc doesn't say), anyone allowed to read task definitions can see it.
- Observation: One secret signs every token for every tenant, user type and admin. The doc describes no rotation, no revocation and no MFA.
- Impact: If the secret leaks (through logs, environment dumps or broad IAM read access), an attacker can mint an `is_admin` token and manage all 40 tenants. A token from a stolen driver phone stays valid for 24 h with no way to revoke it. The admin surface sits behind the same public ALB. This threatens QA3, and the assumed SOC 2 audit will flag it.
- Root cause: The simplest JWT setup carried over into a multi-tenant product with an admin plane.
- Recommendation:
  - Now: keep the secret in Secrets Manager, rotate it and restrict who can read it.
  - Next: move to asymmetric signing (ES256 or RS256) with key IDs, short access tokens (15 min or less) with revocable refresh tokens, and separate audiences for dashboard, driver and admin tokens.
  - Then: require MFA for admins, and route `/admin` through a separate ALB rule open only to staff.
- Alternatives & trade-offs:
  - (a) A managed IdP such as Cognito: it handles MFA, SSO and key rotation, which matters if the partner wants SSO, but costs a migration plus per-user fees.
  - (b) Keeping HS256 and only rotating: cheapest, but it leaves the blast radius as it is.
- Effort: M | Reversibility: two-way for the token format, one-way for the identity model
- Verification: A CI check confirms no secret values appear in task definitions. Tokens signed with a retired key are rejected. `/admin` returns 403 to any token without the admin audience and MFA. A revoked refresh token can't get a new access token.

### [F-05] `driver_locations` grows without limit on the only database
- Dimension: D6 | Severity: High | Confidence: Medium
- Evidence (E2, E4): [§Main flows 2]: the app posts GPS every 10 s per active driver, one row per ping, "no retention policy". [§Business]: 1,200 drivers. The math below uses the assumed 10 active hours and 10× growth.
- Observation:
  - Today: 1,200 drivers × 6 pings/min = 120 inserts/s. Over 36,000 active seconds that's about 4.3M rows a day, or about 1.6B rows a year.
  - At 10×: about 1,200 inserts/s, about 43M rows a day, about 15.8B rows a year.
  - Storage, assuming about 100 bytes per row with indexes: about 430 MB a day now and about 4.3 GB a day at target, or about 1.6 TB a year.
- Impact: This becomes the largest table on the single primary. Write load, index bloat, vacuum time and backup/restore time all grow without limit, so the 1 h RTO from F-01 gets harder every month. Keeping drivers' GPS history forever is personal data with no purpose limit (CCPA assumed). This threatens QA4 and QA2.
- Root cause: Live tracking and history share one append-only table.
- Recommendation: Split live position from history:
  - Keep each driver's latest position in a one-row-per-driver table (upsert), or in Redis, for the dashboard.
  - Batch history inserts into a table partitioned by day.
  - Drop partitions after a fixed retention period (for example 30–90 days, set by contract), and export older data to S3 only if tenants need it.
- Alternatives & trade-offs:
  - (a) A time-series database: better compression, but a new store for a team of 4.
  - (b) Streaming pings to S3 through Kinesis Data Firehose: cheapest storage, but a pipeline to run.
  - Partitioning costs one migration and a scheduled job.
- Effort: M | Reversibility: two-way
- Verification: Once retention is live, table size stays within ±10% week over week. A load test at 1,200 inserts/s keeps GPS insert p95 under the agreed target. Restore-drill time doesn't grow month over month.

### [F-06] Dashboard polling loads the primary whether anything changed or not
- Dimension: D6 | Severity: High | Confidence: Medium
- Evidence (E2, E3): [§Main flows 4]: the dashboard polls `GET /api/deliveries?status=active` every 5 s. [§Known pain points]: "slow at the lunch peak" (E3). [§Stack and deployment]: one primary handles all reads and writes.
- Observation: Each open dashboard sends 720 requests an hour whether or not anything changed. They hit the same primary that takes the GPS writes in F-05. The doc doesn't say which indexes serve this query or whether there are per-tenant limits.
- Impact: Load grows with open screens × tenants, not with actual changes. At 10× tenants, poll load grows 10× on top of 10× GPS writes, at the same lunch peak that's already slow. With the largest tenant at about 30% of volume and no described rate limits, one tenant can slow down the rest. This threatens QA4.
- Root cause: Polling was the simplest way to get live updates, and no one revisited it as load grew.
- Recommendation, in order:
  1. Run `EXPLAIN` on the query and add a partial index for active deliveries per tenant if it's missing.
  2. Return only changes since the last poll, using an `updated_since` cursor or an ETag with 304 responses.
  3. Add per-tenant rate limits at the API.
  4. When needed, push updates over server-sent events fed by F-02's outbox, and move the remaining reads to a replica or readable standby.
- Alternatives & trade-offs:
  - (a) A read replica first: quick relief, but it adds lag and cost and doesn't remove the wasted queries.
  - (b) WebSockets: two-way, which isn't needed here. Server-sent events are simpler.
- Effort: S for steps 1–3, M for step 4 | Reversibility: two-way
- Verification: A load test at 10× tenants with a 3× lunch peak keeps the dashboard endpoint p95 under the target set in the ADR, with DB CPU at no more than 60% at peak.

### [F-07] The 99.9% promise isn't measured, and customers find failures first
- Dimension: D12 | Severity: High | Confidence: Medium
- Evidence (E2, E3): [§Observability]: plain-text logs, CPU and memory alarms, no tracing, Twilio and webhook failures "logged but not alerted on". [§Business]: 99.9% contract, two engineers share on-call. [§Known pain points]: a tenant reported the missing webhooks (E3).
- Observation: No SLI tracks the uptime promise. The alarms watch resources, not user impact.
- Impact: You can't prove or defend the SLA, and you can't see error budget burning before a breach. Two on-call engineers get alarms that don't line up with what customers feel. Time to detect grows as tenants are added. This undermines detection for QA1 through QA4.
- Root cause: Monitoring stayed at infrastructure defaults while the contracts made promises about the service.
- Recommendation:
  - Define three SLIs: API availability (ALB 5xx ratio), dispatch request latency, and webhook delivery success and lag.
  - Set a 99.9% SLO with burn-rate alerts.
  - Alert on Twilio and webhook failure rates, queue depth and oldest-job age.
  - Switch to structured JSON logs that carry the tenant ID and a request ID.
  - Add OpenTelemetry traces across API → queue → worker after that.
- Alternatives & trade-offs:
  - (a) A hosted APM: fastest to set up, but priced per host or per event.
  - (b) CloudWatch alone: cheaper, but more setup work.
  - Either works. Choose by budget.
- Effort: M | Reversibility: two-way
- Verification: A monthly SLO report is generated automatically. In a game day, injected webhook failures page on-call within 10 minutes.

### [F-08] Dispatch waits on Twilio inside the request
- Dimension: D7 | Severity: Medium | Confidence: Medium
- Evidence (E2): [§Main flows 1]: the API writes the row, "calls Twilio to text the recipient inside the same request, then enqueues a job to compute the route ETA."
- Observation: Dispatch latency and success depend on a third party. The doc doesn't say whether the request fails when Twilio fails after the row is written, or what timeout applies.
- Impact: A slow Twilio ties up API capacity during dispatch peaks. A client retry after a timeout can create a duplicate delivery and a second SMS. A Twilio error can skip the ETA job. None of this means a near-term outage, so the severity is Medium.
- Root cause: The SMS was added inline because that was the shortest path.
- Recommendation: Write the delivery and its outbox events in one transaction (shared with F-02), and send the SMS and compute the ETA from worker jobs that have timeouts and retries. Add an idempotency key to create-delivery.
- Alternatives & trade-offs: Keeping the call synchronous with a strict timeout is a smaller change, but dispatch stays coupled to Twilio.
- Effort: S | Reversibility: two-way
- Verification: With Twilio stubbed at 10 s latency, create-delivery p95 doesn't change. Repeating a create with the same idempotency key returns the same delivery and sends one SMS.

### [F-09] Architecture style fits the team and the target scale
- Dimension: D1 | Severity: Strength | Confidence: Medium
- Evidence (E2): [§Stack and deployment]: one API service and one worker service on ECS Fargate, managed RDS and ElastiCache. [§Business]: 4 engineers in one team. [§Main flows 1]: ETA computation is already pushed to the worker.
- Observation: The API tasks are stateless and scale out. Slow work already goes to a queue. Pooled tenancy keeps the cost per tenant low.
- Impact: Running microservices would take more teams and a platform team of its own, and would add network failure modes without serving any stated business goal. Once the data tier is fixed, this design can carry about 10× today's load.
- Root cause: Not applicable.
- Recommendation: Keep it. Don't split services to solve F-01 through F-08. Every fix above works inside this design.
- Alternatives & trade-offs: Microservices would give independent scaling, at the cost of the team capacity you don't have.
- Effort: none | Reversibility: not applicable
- Verification: Revisit if the team grows to more than about two product teams.

### [F-10] Automated deploys on managed compute across two AZs
- Dimension: D13 | Severity: Strength | Confidence: Medium
- Evidence (E2): [§Stack and deployment]: GitHub Actions builds images and deploys to ECS with a rolling update; 3 API tasks and 2 worker tasks across 2 availability zones behind an ALB.
- Observation: Every deploy is automated and repeatable, and the compute tier survives the loss of a task or an AZ.
- Impact: This is a sound base for deploying often with a small team.
- Root cause: Not applicable.
- Recommendation: Keep it. The doc says nothing about the next two steps, so add them: automatic rollback (the ECS deployment circuit breaker tied to alarms) and expand-and-contract DB migrations.
- Alternatives & trade-offs: Blue/green with CodeDeploy gives faster rollback, at the cost of more moving parts.
- Effort: S | Reversibility: two-way
- Verification: A deliberately broken deploy rolls back without anyone stepping in.

## 9. Code design assessment

N/A: no code was provided. Share the repo for a follow-up on D2 (module boundaries) and D11 (SOLID, DRY and testability).

## 12. ADRs to write or revisit

| ADR | Decision drivers | Options to compare |
|---|---|---|
| Data tier availability and DR | 99.9% contract, RPO and RTO of 1 h, team of 4 | RDS Multi-AZ instance; Multi-AZ DB cluster; Aurora. ElastiCache replication on or off |
| Tenant isolation enforcement | 400 tenants, partner and SOC 2, BOLA risk, cost per tenant | Row-level security on pooled tables; schema per tenant; separate DBs for the largest tenants |
| Webhook delivery guarantee | At-least-once expectation, tenant replay, partner integration | Outbox + BullMQ; outbox + SQS with DLQ; outbox poller delivering directly |
| Token and identity model | Leaked-key blast radius, admin plane, SOC 2, possible SSO | HS256 with rotation; asymmetric keys with short tokens and refresh tokens; managed IdP (Cognito or similar) |
| Location data storage and retention | 10× GPS volume, RTO, CCPA purpose limits, tenant history needs | Partitioned Postgres with retention; stream to S3; time-series store |
| Live dashboard updates | Lunch-peak latency, primary DB load, tenant fairness | Change-only polling; server-sent events from the outbox; read replica for remaining reads |
