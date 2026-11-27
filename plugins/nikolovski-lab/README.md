# nikolovski-lab

Every skill and agent in the Nikolovski Lab as one plugin.

## Install (Claude Code)

```
/plugin marketplace add nikolovski/nikolovski-lab
/plugin install nikolovski-lab@nikolovski-lab
```

In the Claude app, add `nikolovski/nikolovski-lab` as a plugin marketplace, then install `nikolovski-lab`.

## What's in it

| Skill | What it does |
| --- | --- |
| [architecture-review](skills/architecture-review/SKILL.md) | Evidence-based review of a codebase or design: scorecard, ranked findings, a roadmap and diagrams. |
| [improve-prompt](skills/improve-prompt/SKILL.md) | Rewrites a vague prompt into a clear, complete one for any AI tool. |

## How it's built

This folder is the only home of every skill and agent in the repo: edit them here, in `skills/<name>/` and `agents/`. The site, the MCP server and the starter packs all read from it. See [plugins/README.md](../README.md).
