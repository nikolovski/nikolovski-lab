# code-reviewer

Starter pack for reviewing code and systems. Today it holds one skill; more review skills join it as they land in the lab.

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
| [architecture-review](../nikolovski-lab/skills/architecture-review/SKILL.md) | Evidence-based review of a codebase or design: scorecard, ranked findings and a roadmap. |

## Planned, not in yet

Ideas for skills this pack should get once they exist in `plugins/nikolovski-lab/skills/`. None of them ship today.

- A pull request review focused on correctness, security and missing tests.
- A test-gap review that lists the riskiest untested paths.

## How it's built

This folder holds no skills on `main`. `pack.json` lists the skills the pack ships, and each skill lives once, in `plugins/nikolovski-lab/skills/`. CI builds the complete pack onto the `packs` branch, which is where the marketplace installs it from, because the Claude app needs real files inside each plugin folder. To add a skill to the pack, add its name to `pack.json` and to the table above. See [plugins/README.md](../README.md).
