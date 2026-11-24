# code-reviewer

Starter pack for reviewing code and systems. Today it holds one skill; more review skills join it as they land in `skills/`.

## Install (Claude Code)

```
/plugin marketplace add nikolovski/nikolovski-lab
/plugin install code-reviewer@nikolovski-lab
```

On Claude Code 2.1.275 or later, one line does both:

```
/plugin install code-reviewer --marketplace nikolovski/nikolovski-lab
```

In the Claude app, add `nikolovski/nikolovski-lab` as a plugin marketplace, then install `code-reviewer`.

## What's in it

| Skill | Why it's in this pack |
| --- | --- |
| [architecture-review](../../skills/architecture-review/SKILL.md) | Evidence-based review of a codebase or design: scorecard, ranked findings and a roadmap. |

## Planned, not in yet

Ideas for skills this pack should get once they exist in `skills/`. None of them ship today.

- A pull request review focused on correctness, security and missing tests.
- A test-gap review that lists the riskiest untested paths.

## How it's built

`skills/` at the repo root is the source of truth. The pack ships generated copies in `plugins/code-reviewer/skills/`, because the Claude app loads each plugin as its own folder and can't reach skills outside it. To add a skill to the pack, run `npm run sync:plugins -- --add code-reviewer <skill>` and add it to the table above. `npm run sync:plugins` refreshes the copies after a skill changes, and `npm run validate` fails when a copy is out of step, so never edit the copies by hand.
