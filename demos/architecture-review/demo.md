---
skill: architecture-review
title: "Architecture review: a fictional courier SaaS"
summary: "A quick review of Parcelly, a made-up multi-tenant delivery platform, from a one-page design doc, without and with the skill. Both runs were asked for every diagram that applies."
generated: 2026-11-27
generated_by: "Claude"
setup: "Both runs used the same Claude model and the same user message, each in a fresh session with no other context. The with-skill run had SKILL.md loaded and could run its diagram check script. Outputs are pasted unedited. Parcelly is fictional; the design doc was written for this demo."
---

- **15 diagrams, and all of them render.** The skill drew the system context, containers, API components, deployment, three critical flows, the data model, trust boundaries, event topology, tenancy isolation, a risk quadrant, a scorecard chart, a remediation roadmap and current vs target. It checked every block with mermaid-cli before answering. The plain run drew 5 diagrams, and one of them doesn't parse: a `;` inside a sequence message breaks Mermaid, so the site shows it as code.
- **Diagrams carry the findings.** Components with a problem are colored by severity and tagged with finding IDs (F-01 to F-10), so the container diagram doubles as a map of where the risk sits. The plain run's diagrams show the system but not the problems.
- **Every figure says what it rests on.** Each caption marks the diagram as evidenced, partly inferred or inferred, names the design doc sections it came from, and draws guessed parts dashed. The data model says which columns were documented and which were guessed.
- **A roadmap sized to the team.** The Gantt chart fits the fixes to the assumed capacity of about one engineer and says which finding moved to Later because it didn't fit.
- **It lists what it didn't draw.** Diagrams the doc can't support, like state machines, are named with the reason.
- **What the plain run did well:** it found the same main risks, gave its own scorecard and a sensible 6-month roadmap, and is less than half the length (about 2,800 words against 6,600). If you only need a first read, it's enough. The skill's version is what you'd hand to a team or an investor.
