---
skill: improve-prompt
title: "Improve prompt: a vague performance ask"
summary: "A one-line \"make the dashboard faster\" prompt, rewritten for a coding agent without and with the skill."
generated: 2026-11-24
generated_by: "Claude"
setup: "Both runs used the same Claude model and the same user message, each in a fresh session with no other context. The with-skill run had SKILL.md loaded. Outputs are pasted unedited. The user's answers to the skill's questions were written for this demo; the app is fictional."
---

- **It asked before writing.** Without the skill, Claude guessed and left `[brackets]` for the user to fill in. With it, Claude asked five questions first, so the prompt names the real endpoint, the file, the 2.4s baseline and the 300ms target.
- **It wrote for the tool.** The user runs it in Claude Code, so the rewrite uses XML tags for inputs and spells out how to verify: a load test before and after, `EXPLAIN ANALYZE`, a response-shape test and a cross-tenant test.
- **Guesses are visible.** Where the user said "you pick", the skill listed its assumptions above the prompt instead of hiding them inside it.
- **Prompt only, then it stops.** No essay on what changed, and it hands the prompt back with "Want me to run it, or change anything?" instead of running it.
- **What the plain run did well:** it also pushed to measure before caching. The difference is a prompt you can paste now versus a template you still have to finish.
