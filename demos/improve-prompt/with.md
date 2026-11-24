**Claude:**

A few questions before I rewrite it:

1. **Target tool:** where will you run this: Claude Code, Codex, Cursor or something else?
2. **Dashboard and stack:** which app or repo, and where does the dashboard live (paths, endpoints)? Is it Node.js + PostgreSQL + Redis, or something else?
3. **What's slow:** the first page load, specific widgets, API calls or DB queries? Any numbers you have (for example "p95 is 4s on /api/dashboard")?
4. **Done means:** what counts as fast enough (for example "under 1s p95"), and how should the agent prove it: a benchmark, a profiler run, tests?
5. **Limits:** is Redis a must, or one idea among others (query or index fixes, fewer round trips, pagination)? What must not change: how fresh the data is, the schema, API contracts, multi-tenant isolation?

**User** (answers written for this demo):

> 1. Claude Code.
> 2. Our Express API (Node.js 22 + PostgreSQL 16, Redis already running for sessions). The dashboard calls one endpoint, GET /api/dashboard/summary, handled in src/routes/dashboard.ts.
> 3. That API call. p95 is about 2.4s, worse for tenants with lots of orders. The page itself renders fine once the data arrives.
> 4. Under 300ms p95. Not sure how to prove it, you pick.
> 5. Redis was just an idea. The numbers can be up to a minute stale. Don't change the JSON the endpoint returns, and every tenant must only see its own data.

**Claude:**

**Assumptions**
- Proof of speed is a before/after load test on a tenant with many orders, plus `EXPLAIN ANALYZE` on the queries it changes.
- No new infrastructure. The existing Redis may be used for caching, but needs its own key prefix so it can't touch session keys.
- Adding database indexes through a migration is allowed. Other schema changes are not.
- The agent may add or update tests, and the existing test suite must still pass.

**Improved prompt**
```
You are working in our Express API (Node.js 22, PostgreSQL 16, Redis already running for sessions). Our dashboard is fast to render but waits on one slow endpoint.

<problem>
GET /api/dashboard/summary, handled in src/routes/dashboard.ts, has a p95 latency of about 2.4s. It gets worse for tenants with many orders, so the cost likely grows with order volume.
</problem>

Task: make GET /api/dashboard/summary return in under 300ms at p95, including for tenants with large order volumes.

Find the actual cause before you change anything. Trace what the handler does: queries, round trips, N+1 patterns, missing indexes, work done in JS that Postgres could do. Measure first. Then pick the fix or fixes that the evidence supports. Possible fixes include query rewrites, indexes, fewer round trips, and caching. Redis is one option, not a requirement. Prefer fixing the query path. Add caching only if the queries can't reach the target on their own.

<constraints>
- The JSON response must stay byte-for-byte the same in shape: same fields, types, nesting and ordering semantics. Clients depend on it.
- Tenant isolation is the top priority. Every query must stay scoped to the caller's tenant. Any cache key must include the tenant ID, and one tenant's data must never be served to another.
- Data may be up to 60 seconds stale. Don't let any cache live longer than that.
- If you use Redis, use a dedicated key prefix (for example `dash:summary:<tenantId>`) so nothing collides with session keys. If Redis is unavailable, the endpoint must still answer from Postgres.
- Indexes may be added through a migration. Make no other schema changes.
- Keep changes focused on this endpoint and what it needs.
</constraints>

Verification:
1. Before changing anything, record a baseline: run a load test (autocannon or k6) against the endpoint for a tenant with a large number of orders, and capture `EXPLAIN ANALYZE` for each query it runs. If no such tenant exists in local or test data, seed one.
2. After your changes, run the same load test and capture `EXPLAIN ANALYZE` again. p95 must be under 300ms.
3. Add a test that the response JSON is unchanged for a fixed dataset (snapshot or deep-equal against the old output).
4. Add a test showing that two tenants calling the endpoint, with caching active, each get only their own data.
5. Run the full existing test suite. It must pass.

Output when done:
- The root cause, in a few sentences, backed by what you measured.
- What you changed and why, file by file.
- Before/after p95 and p50 numbers, and the load-test command so I can rerun it.
- Any migration added, and any risk or follow-up I should know about.
```

Want me to run it, or change anything?
