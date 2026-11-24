# Agent instructions

Shared instructions for any coding agent working in this repo (Claude Code reads them through `CLAUDE.md`).

## Source of truth
Git is the only source of truth. There is no database. The site in `site/` only reads the folders at the repo root.

## Layout rules
- **Skills**: `skills/<name>/SKILL.md`. The folder name must equal the frontmatter `name`. `name` is lowercase letters, digits and hyphens, 64 characters at most. `description` is required, 1024 characters at most, and says what the skill does and when to use it. Supporting files (scripts, references, templates) sit next to `SKILL.md`.
- **Agents**: `agents/<name>.md` with frontmatter `name` and `description` (optional `tools`, `model`).
- **Lessons**: `lessons/YYYY-MM-DD-slug.md` with frontmatter `title`, `date` (YYYY-MM-DD), `summary`, optional `skill` (must match a folder in `skills/`), `tags`, `draft`. Files starting with `_` are templates and are ignored.
- **Resources**: add entries to `resources/resources.yaml`. Every entry needs `id` (unique, kebab-case), `title`, `url` (https), `category` and `why` (one line on why it matters).
- **MCP server**: `mcp/` holds the logic, `api/mcp.mjs` is the Vercel Function, `test/` the tests. It only reads `skills/` and `lessons/` and must never serve `draft: true` lessons. Run `npm test` after changing it.
- **Plugins**: the repo root itself is the main plugin (`nikolovski-lab`) and picks up `skills/` and `agents/` automatically. Extra plugins live in `plugins/<name>/` and must be added to `.claude-plugin/marketplace.json`.
- **Starter packs**: a marketplace entry with `"source": "./"` and a `skills` list of `./skills/<name>` folders, plus `plugins/<name>/README.md` with the install line and the skills it ships. Never copy a skill into a pack. See `plugins/README.md`.

## Before you open a PR
1. `npm run validate` passes.
2. `npm run build` passes if you touched `site/` or content; `npm test` passes if you touched `mcp/` or `api/`.
3. One topic per PR. Explain what changed and why in the description.
4. Never commit secrets, API keys or private details about other people or their code. Case studies need the repo owner's written OK first.

## Writing style
Plain, direct sentences. Lead with the point. No filler.
