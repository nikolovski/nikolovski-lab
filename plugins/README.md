# Plugins

Every plugin in the marketplace lives in its own folder here, with `.claude-plugin/plugin.json`. The Claude app (claude.ai, Claude Desktop, Cowork) loads each plugin as a self-contained folder, so a plugin can't point back at the repo root or reach files outside its folder.

```
plugins/<name>/
  .claude-plugin/plugin.json   # { "name": "<name>", "description": "..." }
  README.md                    # install line and what it ships
  skills/<skill>/SKILL.md
  agents/<agent>.md            # main plugin only, for now
```

Register each one in `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`. Keep the entry name, the folder name and the `plugin.json` name identical.

## One source of truth

`skills/` and `agents/` at the repo root are the source of truth. The copies in `plugins/` are generated:

```
npm run sync:plugins                                   # refresh every copy
npm run sync:plugins -- --add <plugin> <skill> [...]   # add skills to a plugin
```

- `nikolovski-lab`, the main plugin, gets every skill and every agent.
- Any other plugin keeps the skills it already holds, refreshed from `skills/`.

`npm run validate` (and CI) fails when a copy is missing or differs from `skills/`, so never edit a copy by hand: edit `skills/<name>/` and run the sync. The weekly skill review runs the sync before it opens its PR.

## Starter packs

A starter pack is a plugin that ships a named subset of the skills in `skills/`. Current packs:

- [solo-saas-founder](solo-saas-founder/README.md)
- [code-reviewer](code-reviewer/README.md)

To make a new pack: add `plugins/<name>/.claude-plugin/plugin.json` and `plugins/<name>/README.md`, register it in the marketplace, run `npm run sync:plugins -- --add <name> <skill> ...`, then `npm run validate`. List only skills that exist in `skills/`; put the rest under "Planned, not in yet".

## Standalone plugins

A plugin can also hold its own skills, commands, hooks or MCP servers. A skill folder whose name doesn't match one in `skills/` is the plugin's own, and the sync leaves it alone. Don't add a `bin/` folder: the Claude app won't install a plugin that has one.
