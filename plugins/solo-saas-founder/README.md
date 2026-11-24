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
| [architecture-review](../../skills/architecture-review/SKILL.md) | Review your own system before it hurts: scalability, tenancy, security and trade-offs, with a ranked roadmap. |
| [improve-prompt](../../skills/improve-prompt/SKILL.md) | Get the right result from Claude, Cursor, Codex and image tools on the first try. |

## Planned, not in yet

Ideas for skills this pack should get once they exist in `skills/`. None of them ship today.

- A launch checklist for a new feature or release.
- A pricing and plan-limits review.
- A support-reply drafter for customer email.

## How it's built

`skills/` at the repo root is the source of truth. The pack ships generated copies in `plugins/solo-saas-founder/skills/`, because the Claude app loads each plugin as its own folder and can't reach skills outside it. To add a skill to the pack, run `npm run sync:plugins -- --add solo-saas-founder <skill>` and add it to the table above. `npm run sync:plugins` refreshes the copies after a skill changes, and `npm run validate` fails when a copy is out of step, so never edit the copies by hand.
