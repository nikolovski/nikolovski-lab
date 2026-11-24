# Extra plugins

The repo root is the main plugin, `nikolovski-lab`, and already ships every skill in `skills/` and every agent in `agents/`.

This folder holds two kinds of extra plugin.

## Starter packs

A starter pack is a named subset of the skills in `skills/`, installed with one command. It has no copies of skills. Its entry in `.claude-plugin/marketplace.json` points at the repo root and lists the skill folders it includes:

```json
{
  "name": "solo-saas-founder",
  "source": "./",
  "description": "...",
  "skills": ["./skills/architecture-review", "./skills/improve-prompt"]
}
```

When a marketplace entry's source is the repo root and it lists skill folders, Claude Code loads only those folders, so the pack always ships the current version of each skill.

Each pack also gets `plugins/<name>/README.md` with its install lines, what's in it and the skills planned for it. Current packs:

- [solo-saas-founder](solo-saas-founder/README.md)
- [code-reviewer](code-reviewer/README.md)

To make a new pack: add the marketplace entry, add `plugins/<name>/README.md`, and run `npm run validate`. List only skills that exist in `skills/`; put the rest under "Planned, not in yet".

## Standalone plugins

A plugin with its own files (commands, hooks, MCP servers) gets its own folder:

```
plugins/<name>/
  .claude-plugin/plugin.json   # { "name": "<name>", "description": "..." }
  skills/<skill-name>/SKILL.md
```

Register it in `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`. Keep the entry name and the `plugin.json` name identical. A copied plugin can't read files outside its own folder.
