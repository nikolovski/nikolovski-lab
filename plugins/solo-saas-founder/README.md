# solo-saas-founder

Starter pack for a solo founder building a SaaS. One install gives you the skills that help most when you are the whole engineering team.

## Install (Claude Code)

```
/plugin marketplace add nikolovski/nikolovski-lab
/plugin install solo-saas-founder@nikolovski-lab
```

On Claude Code 2.1.275 or later, one line does both:

```
/plugin install solo-saas-founder --marketplace nikolovski/nikolovski-lab
```

In the Claude app, add `nikolovski/nikolovski-lab` as a plugin marketplace, then install `solo-saas-founder`.

## What's in it

| Skill | Why it's in this pack |
| --- | --- |
| [architecture-review](../nikolovski-lab/skills/architecture-review/SKILL.md) | Review your own system before it hurts: scalability, tenancy, security and trade-offs, with a ranked roadmap. |
| [improve-prompt](../nikolovski-lab/skills/improve-prompt/SKILL.md) | Get the right result from Claude, Cursor, Codex and image tools on the first try. |

## Planned, not in yet

Ideas for skills this pack should get once they exist in `plugins/nikolovski-lab/skills/`. None of them ship today.

- A launch checklist for a new feature or release.
- A pricing and plan-limits review.
- A support-reply drafter for customer email.

## How it's built

This folder holds no skills on `main`. `pack.json` lists the skills the pack ships, and each skill lives once, in `plugins/nikolovski-lab/skills/`. CI builds the complete pack onto the `packs` branch, which is where the marketplace installs it from, because the Claude app needs real files inside each plugin folder. To add a skill to the pack, add its name to `pack.json` and to the table above. See [plugins/README.md](../README.md).
