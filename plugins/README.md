# Extra plugins

The repo root is the main plugin, `nikolovski-lab`, and already ships every skill in `skills/` and every agent in `agents/`.

Put additional plugins here, one folder each, such as Phase 1 starter packs:

```
plugins/solo-saas-founder/
  .claude-plugin/plugin.json   # { "name": "solo-saas-founder", "description": "..." }
  skills/<skill-name>/SKILL.md
```

Then add an entry to `.claude-plugin/marketplace.json`:

```json
{ "name": "solo-saas-founder", "source": "./plugins/solo-saas-founder" }
```

Keep the entry name and the `plugin.json` name identical. A plugin can't reach outside its own folder, so a starter pack carries its own copy of each skill (a small sync script can keep the copies in step with `skills/`).
