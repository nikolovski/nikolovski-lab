# Agent instructions

Shared instructions for any coding agent working in this repo (Claude Code reads them through `CLAUDE.md`).

## Source of truth
Git is the only source of truth. There is no database. The site in `site/` only reads the folders in this repo. Every skill and agent exists once, in the main plugin's folder `plugins/nikolovski-lab/`. Never copy one somewhere else.

## Layout rules
- **Skills**: `plugins/nikolovski-lab/skills/<name>/SKILL.md`. The folder name must equal the frontmatter `name`. `name` is lowercase letters, digits and hyphens, 64 characters at most. `description` is required, 1024 characters at most, and says what the skill does and when to use it. Supporting files (scripts, references, templates) sit next to `SKILL.md`.
- **Agents**: `plugins/nikolovski-lab/agents/<name>.md` with frontmatter `name` and `description` (optional `tools`, `model`).
- **Lessons**: `lessons/YYYY-MM-DD-slug.md` with frontmatter `title`, `date` (YYYY-MM-DD), `summary`, optional `skill` (must match a skill folder), `tags`, `draft`. Files starting with `_` are templates and are ignored.
- **Demos**: `demos/<skill>/` with `demo.md` (frontmatter `skill` matching the folder and a skill folder, `title`, `summary`, `generated` (YYYY-MM-DD), `generated_by`, `setup`; body is the "what changed" note), plus `task.md`, `without.md` and `with.md`. Generate both outputs from the same message in fresh sessions, paste them unedited, and never use someone else's real code without the owner's written OK. Every skill should have one; the validator warns when it doesn't.
- **Diagrams**: Markdown in `demos/` and `lessons/` may use ```mermaid blocks; the site renders them in the browser (`site/src/components/Mermaid.astro`, Mermaid pinned in `site/package.json`). `npm run check:mermaid` checks lessons and every demo's `with.md`, and must pass; CI runs it. `without.md` isn't checked: it is pasted unedited, so a broken diagram there stays and the site shows it as code with a note.
- **Resources**: add entries to `resources/resources.yaml`. Every entry needs `id` (unique, kebab-case), `title`, `url` (https), `category` and `why` (one line on why it matters).
- **MCP server**: `mcp/` holds the logic, `api/mcp.mjs` is the Vercel Function, `test/` the tests. It only reads `plugins/nikolovski-lab/skills/` and `lessons/` and must never serve `draft: true` lessons. Run `npm test` after changing it.
- **Plugins**: every plugin is a folder `plugins/<name>/` with `.claude-plugin/plugin.json` and a `README.md`, registered in `.claude-plugin/marketplace.json`. `plugins/nikolovski-lab/` is the main plugin: it holds every skill and agent as real files and is registered with `"source": "./plugins/nikolovski-lab"`. Never point an entry at the repo root: the Claude app can't load it.
- **Starter packs**: a plugin that ships a subset of the skills. On `main` it is `plugin.json`, `README.md` and `pack.json` (`{ "skills": [...] }`), with no `skills/` folder. CI builds the full pack onto the `packs` branch and the marketplace entry points there, because the Claude app needs real files in each plugin folder and drops symlinks and plugin dependencies. To add a skill to a pack, add its name to `pack.json` and its README. Never edit the `packs` branch by hand. See `plugins/README.md`.

## Before you open a PR
1. `npm run validate` passes.
2. `npm run build` passes if you touched `site/` or content (plus `npm run check:mermaid` if you touched diagrams); `npm test` passes if you touched `mcp/` or `api/`.
3. One topic per PR. Explain what changed and why in the description.
4. Never commit secrets, API keys or private details about other people or their code. Case studies need the repo owner's written OK first.

## Writing style
Plain, direct sentences. Lead with the point. No filler.
