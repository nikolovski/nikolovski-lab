Here's a tighter version. It gives the model (or engineer) the context it needs and asks it to find the cause before choosing a fix:

```
The dashboard page is slow and I want it faster.

Context:
- Page/route: [e.g. /dashboard]
- Current load time: [e.g. ~4s to first meaningful paint, API call /api/dashboard takes ~3s]
- Target: [e.g. under 1s]
- Stack: [e.g. Node.js API, PostgreSQL, React frontend, Redis available]
- When it's slow: [always / only for large tenants / only on first load / after N records]

What I want:
1. Profile first. Find out where the time actually goes: slow SQL queries,
   N+1 queries, large payloads, missing indexes, unbatched API calls,
   heavy frontend rendering, or something else. Show the evidence
   (EXPLAIN ANALYZE output, timings, network waterfall).
2. Rank the bottlenecks by impact.
3. Propose fixes for the top ones, starting with the cheapest high-impact
   change. Caching (e.g. Redis) is an option, but only if the data can
   tolerate staleness. If you suggest it, say what to cache, the key
   structure, the TTL and how invalidation works.
4. Implement the fixes and show before/after numbers.

Constraints:
- Don't change the dashboard's behavior or the data it shows.
- [Multi-tenant: cache keys and queries must be scoped per tenant.]
- [Anything off-limits, e.g. no schema changes without asking.]
```

What changed and why:

- **Measure before fixing.** "Maybe add Redis" jumps to a solution. Most slow dashboards come from a few bad queries or N+1 patterns, and caching only hides them (and adds invalidation bugs).
- **Numbers.** "Slow" and "faster" have no finish line. A current time and a target do.
- **Context.** The stack, the route and when it's slow cut out a lot of guessing.
- **Caching only on conditions.** It stays on the table, but whoever proposes it has to justify it and plan invalidation.
- **Constraints.** These protect behavior and tenant isolation, which a careless cache can break.

Fill in the brackets. If you don't know the numbers yet, change step 1 to "measure and report the current numbers" and stop there before any fixes.
