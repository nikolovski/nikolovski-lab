# Plugins

Every plugin in the marketplace has its own folder here, with `.claude-plugin/plugin.json`. Keep the marketplace entry name, the folder name and the `plugin.json` name identical.

## One home for every skill

`plugins/nikolovski-lab/` is the main plugin. It holds every skill and every agent, and it is the only place they exist in git:

```
plugins/nikolovski-lab/
  .claude-plugin/plugin.json
  README.md
  skills/<skill>/SKILL.md      # edit skills here
  agents/<agent>.md            # and agents here
```

The site, the MCP server, the weekly skill review and the [skills CLI](https://github.com/vercel-labs/skills) all read this folder. There is nothing to sync.

## Starter packs

A starter pack is a plugin that ships a named subset of those skills. On `main` a pack is three small files and no skills:

```
plugins/<pack>/
  .claude-plugin/plugin.json
  README.md                    # install line and what it ships
  pack.json                    # { "skills": ["<skill>", ...] }
```

Current packs:

- [solo-saas-founder](solo-saas-founder/README.md)
- [code-reviewer](code-reviewer/README.md)

### Why packs are built, not committed

The Claude app (claude.ai, Claude Desktop, Cowork) installs each plugin as its own folder. It drops symlinks and ignores plugin `dependencies`, so a pack only works there if its folder holds real copies of its skills. Committing those copies to `main` meant every skill lived in several places.

So CI makes the copies instead. On every merge that touches `plugins/`, `.github/workflows/publish-packs.yml` runs `npm run build:packs` and publishes the result to the `packs` branch, where each pack is a complete plugin folder: its own files plus `skills/<skill>/` for every skill in its `pack.json`. The marketplace entry of a pack points there:

```json
"source": {
  "source": "git-subdir",
  "url": "https://github.com/nikolovski/nikolovski-lab.git",
  "path": "plugins/<pack>",
  "ref": "packs"
}
```

Never edit the `packs` branch by hand, and don't delete it: installs of the packs come from it. `npm run build:packs` writes the same tree to `dist/packs/` if you want to look at it or load a pack locally (`claude --plugin-dir dist/packs/plugins/<pack>`).

### Make a new pack

1. Add `plugins/<name>/.claude-plugin/plugin.json`, `plugins/<name>/README.md` and `plugins/<name>/pack.json`. List only skills that exist in `plugins/nikolovski-lab/skills/`; put the rest under "Planned, not in yet" in the README.
2. Register it in `.claude-plugin/marketplace.json` with the `git-subdir` source above.
3. Run `npm run validate`.

To add a skill to a pack, add its name to `pack.json` and to the table in the pack's README.

## Standalone plugins

A plugin can also hold its own skills, commands, hooks or MCP servers. Give it a folder here with real files and no `pack.json`, and register it with `"source": "./plugins/<name>"`. Never point an entry at the repo root: the Claude app can't load it. Don't add a `bin/` folder: the Claude app won't install a plugin that has one.
