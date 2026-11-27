Do a quick architecture review of this system. Include all the diagrams that apply.

> Parcelly is a fictional system written for this demo. Any resemblance to a real product is accidental.

# Parcelly: architecture overview

Parcelly is a multi-tenant SaaS that small courier companies use to dispatch deliveries, track drivers and keep recipients informed.

## Business
- 40 courier companies (tenants) today, about 1,200 drivers and 25,000 deliveries a day. The largest tenant is about 30% of volume.
- Goal: 400 tenants within 18 months, through a partnership with a regional logistics marketplace.
- Recipients get SMS updates. Tenants get webhooks when a delivery changes status.
- Customer contracts promise 99.9% monthly uptime.
- Team: 4 engineers in one product team. Two of them share on-call.

## Stack and deployment
- One Node.js 22 (Express) API service and one worker service, both on AWS ECS Fargate: 3 API tasks and 2 worker tasks, single region (us-west-2), 2 availability zones.
- PostgreSQL 16 on RDS, single instance (not Multi-AZ). All tenants share tables with a `tenant_id` column. Nightly automated snapshots. A restore has never been tested.
- Redis on ElastiCache, single node, holds sessions and the BullMQ job queue.
- An ALB sits in front of the API. GitHub Actions builds images and deploys to ECS with a rolling update.

## Main flows
1. **Dispatch:** a dispatcher creates a delivery. The API writes the row, calls Twilio to text the recipient inside the same request, then enqueues a job to compute the route ETA.
2. **Driver location:** the driver app posts GPS every 10 seconds per active driver. The API inserts one row per ping into `driver_locations`. There is no retention policy.
3. **Status change:** the API updates the delivery row, then enqueues a webhook job. The worker POSTs to the tenant's URL, retries 5 times, then drops the job.
4. **Dashboard:** the tenant dashboard polls `GET /api/deliveries?status=active` every 5 seconds.

## Security
- Users log in with email and password. The API issues a JWT (24-hour expiry) signed with a shared secret stored in an ECS task environment variable.
- Each route handler scopes queries with `WHERE tenant_id = $1`, taking the tenant from the JWT claim.
- An `/admin` router for tenant management lives in the same API, protected by an `is_admin` claim.
- The driver app uses the same kind of JWT.

## Observability
- Plain-text logs to CloudWatch. CPU and memory alarms on ECS. No tracing.
- Twilio and webhook failures are logged but not alerted on.

## Known pain points (reported by the team)
- The dashboard gets slow at the lunch peak.
- The biggest tenant sometimes reports missing webhooks.
