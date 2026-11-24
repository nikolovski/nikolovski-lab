---
skill: architecture-review
title: "Architecture review: a fictional courier SaaS"
summary: "A quick review of Parcelly, a made-up multi-tenant delivery platform, from a one-page design doc, without and with the skill."
generated: 2026-11-24
generated_by: "Claude"
setup: "Both runs used the same Claude model and the same user message, each in a fresh session with no other context. The with-skill run had SKILL.md loaded. Outputs are pasted unedited. Parcelly is fictional; the design doc was written for this demo."
---

- **It asked first, with defaults.** The skill stopped at intake with seven ranked questions (RPO/RTO, webhook contract, partner requirements), each with a default, so "use defaults" was a valid answer. The plain run went straight to advice and listed questions at the end.
- **A verdict and a score.** Without the skill you get a ranked risk list. With it you get "Not fit for purpose, 1.6 / 5" from a weighted scorecard, with the math shown and caps applied for open Critical and High findings.
- **Every claim is graded.** Each finding cites the design doc section and marks evidence as documented, reported or inferred. Confidence is capped at Medium because there was no code.
- **Severity is explicit.** One Critical (single-copy database and Redis, untested restore) and six Highs, each with a fix, alternatives with trade-offs, effort, reversibility and a test that proves it's fixed.
- **Strengths count.** The skill records what to keep (one API plus one worker fits a team of four) and tells you not to split into microservices.
- **What the plain run did well:** it spotted most of the same risks and gave a sensible sequence. The skill's version is what you'd hand to a team or an investor; the plain one is a good first read.
