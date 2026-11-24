# Agent instructions

Shared instructions for any coding agent working in this repo (Claude Code reads them through `CLAUDE.md`).

## Source of truth
Git is the only source of truth. There is no database. The site in `site/` only reads the folders at the repo root.

## Layout rules
- **Skills**: `skills/<name>/SKILL.md`. The folder name must equal the frontmatter `name`. `name` is lowercase letters, digits and hyphens, 64 characters at most. `description` is required, 1024 characters at most, and says what the skill does and when to use it. Supporting files (scripts, references, templates) sit next to `SKILL.md`.
- **Agents**: `agents/<name>.md` with frontmatter `name` and `description` (optional `tools`, `model`).
- **Lessons**: `lessons/YYYY-MM-DD-slug.md` with frontmatter `title`, `date` (YYYY-MM-DD), `summary`, optional `skill` (must match a folder in `skills/`), `tags`, `draft`. Files starting with `_` are templates and are ignored.
- **Demos**: `demos/<skill>/` with `demo.md` (frontmatter `skill` matching the folder and a folder in `skills/`, `title`, `summary`, `generated` (YYYY-MM-DD), `generated_by`, `setup`; body is the "what changed" note), plus `task.md`, `without.md` and `with.md`. Generate both outputs from the same message in fresh sessions, paste them unedited, and never use someone else's real code without the owner's written OK. Every skill should have one; the validator warns when it doesn't.
- **Resources**: add entries to `resources/resources.yaml`. Every entry needs `id` (unique, kebab-case), `title`, `url` (https), `category` and `why` (one line on why it matters).
- **Plugins**: the repo root itself is the main plugin (`nikolovski-lab`) and picks up `skills/` and `agents/` automatically. Extra plugins live in `plugins/<name>/` and must be added to `.claude-plugin/marketplace.json`.

## Before you open a PR
1. `npm run validate` passes.
2. `npm run build` passes if you touched `site/` or content.
3. One topic per PR. Explain what changed and why in the description.
4. Never commit secrets, API keys or private details about other people or their code. Case studies need the repo owner's written OK first.

## Writing style
Plain, direct sentences. Lead with the point. No filler.
