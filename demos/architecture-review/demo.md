---
skill: architecture-review
title: "Architecture review: a fictional AI help desk"
summary: "A quick review of Tallowdesk, a made-up multi-tenant help desk with an LLM autopilot, from a one-page design doc, without and with the skill."
generated: 2026-11-24
generated_by: "Claude"
setup: "Both runs used the same Claude model and the same user message, each in a fresh session with no other context. The with-skill run had SKILL.md loaded and ran at quick depth. Outputs are pasted unedited. Tallowdesk is fictional; the design doc was written for this demo. This is a single run, not a benchmark."
---

- **Both runs found the same serious risks.** The design hides a cross-tenant leak: the draft cache key has no shop id and masks digits, so one shopper's order details can be sent to another shop's customer. Both runs caught it, plus the unscoped Autopilot refund tools, prompt injection through email, auto-reply loops and a year of full prompts in the logs. The skill did not catch anything consequential that the plain run missed. A second, non-AI scenario gave the same result.
- **What the skill adds is the shape.** A verdict and score ("Not fit for purpose, 2.1 / 5"), a one-line scorecard per dimension, explicit assumptions, and a "proves it" test for every finding, such as an injection-email suite that must show zero refunds on orders the sender doesn't own.
- **One question the plain run didn't ask:** whether the cache has already served drafts across shops, which decides whether shops need to be told.
- **Quick is now quick.** The skill's quick mode came in at about 1,200 words, against about 4,700 in the previous version of this demo, and it no longer stops to ask questions first.
- **What the plain run did well:** it went slightly wider, flagging pgvector recall for small shops, websocket origin checks and Redis eviction settings for the job queue. If you only need the risks, the plain run is enough; the skill is for when you need a verdict and tests to hand to a team.
