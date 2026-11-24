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

The pack has no copies of skills. Its entry in [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json) points at the repo root and lists the skill folders it includes, so it always ships the current version from `skills/`. To add a skill to the pack, add its folder to that entry's `skills` list and to the table above.
