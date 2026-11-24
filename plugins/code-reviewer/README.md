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

## What's in it

| Skill | Why it's in this pack |
| --- | --- |
| [architecture-review](../../skills/architecture-review/SKILL.md) | Evidence-based review of a codebase or design: scorecard, ranked findings and a roadmap. |

## Planned, not in yet

Ideas for skills this pack should get once they exist in `skills/`. None of them ship today.

- A pull request review focused on correctness, security and missing tests.
- A test-gap review that lists the riskiest untested paths.

## How it's built

The pack has no copies of skills. Its entry in [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json) points at the repo root and lists the skill folders it includes, so it always ships the current version from `skills/`. To add a skill to the pack, add its folder to that entry's `skills` list and to the table above.
