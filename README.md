# Nikolovski Lab

Skills, agents, plugins, lessons and curated resources from my work with AI coding agents. Everything here is plain files in Git; the site at [nikolovski.ai](https://nikolovski.ai) is built straight from this repo.

## What's inside

| Folder | What it holds |
| --- | --- |
| `skills/<name>/SKILL.md` | Agent Skills (Claude Code, Codex, Cursor and any agent that reads `SKILL.md`) |
| `agents/*.md` | Subagent definitions |
| `plugins/<name>/` | Starter packs and extra Claude Code plugins (see `plugins/README.md`) |
| `demos/<skill>/` | Before/after demos: the same task without and with each skill |
| `lessons/YYYY-MM-DD-slug.md` | Dated write-ups; each links the skill it produced |
| `resources/resources.yaml` | Curated links, each with a line on why it matters |
| `.claude-plugin/marketplace.json` | Makes this repo a Claude Code plugin marketplace |
| `site/` | Astro site (Lessons, Toolkit, Demos, Resources), deployed on Vercel |
| `mcp/`, `api/mcp.mjs` | Read-only MCP server at `nikolovski.ai/mcp` (see below) |
| `scripts/validate.mjs` | Content checks that CI runs on every PR |
| `test/` | Tests for the MCP server (`npm test`) |

## Install

**Claude Code** (all skills and agents as one plugin):

```
/plugin marketplace add nikolovski/nikolovski-lab
/plugin install nikolovski-lab@nikolovski-lab
```

**Claude Code starter packs** (a smaller bundle for one kind of work):

```
/plugin marketplace add nikolovski/nikolovski-lab
/plugin install solo-saas-founder@nikolovski-lab
/plugin install code-reviewer@nikolovski-lab
```

| Pack | Skills |
| --- | --- |
| [solo-saas-founder](plugins/solo-saas-founder/README.md) | architecture-review, improve-prompt |
| [code-reviewer](plugins/code-reviewer/README.md) | architecture-review |

**Codex, Cursor and other agents** (one skill, via the open [skills CLI](https://github.com/vercel-labs/skills)):

```
npx skills add nikolovski/nikolovski-lab --skill architecture-review -a codex
npx skills add nikolovski/nikolovski-lab --skill architecture-review -a cursor
```

**Manual:** copy `skills/<name>/` into your agent's skills folder (for Claude Code, `~/.claude/skills/<name>/`).

## MCP server

Any agent that speaks MCP can search and pull skills and lessons straight from this repo, without installing anything. Endpoint: `https://nikolovski.ai/mcp` (Streamable HTTP, read-only, no sign-in).

| Tool | What it does |
| --- | --- |
| `search_skills` | Keyword search over skills; an empty query lists them all |
| `get_skill` | Full `SKILL.md` by name, plus any supporting file with `file` |
| `search_lessons` | Keyword search over published lessons; drafts are never served |
| `get_lesson` | Full lesson by id |

Add it:

```
claude mcp add --transport http nikolovski-lab https://nikolovski.ai/mcp          # Claude Code
codex mcp add nikolovski-lab --url https://nikolovski.ai/mcp                      # Codex CLI
gemini mcp add --transport http nikolovski-lab https://nikolovski.ai/mcp          # Gemini CLI
code --add-mcp '{"name":"nikolovski-lab","type":"http","url":"https://nikolovski.ai/mcp"}'   # VS Code
```

**Cursor:** add `"nikolovski-lab": { "url": "https://nikolovski.ai/mcp" }` under `mcpServers` in `~/.cursor/mcp.json`. **Claude.ai and Claude Desktop:** Settings > Connectors > Add custom connector, with the same URL.

How it works: `api/mcp.mjs` is a Vercel Function next to the static site; `vercel.json` routes `/mcp` to it and ships `skills/` and `lessons/` with it. Content is indexed once per cold start, so it always matches the last deploy. Each request gets a fresh, stateless server.

## Skills

| Skill | What it does |
| --- | --- |
| [architecture-review](skills/architecture-review/SKILL.md) | Evidence-based architecture review. Outputs a scorecard, ranked findings and a roadmap. |
| [improve-prompt](skills/improve-prompt/SKILL.md) | Rewrites a rough prompt for any AI tool. Asks first, states assumptions, hands the prompt back for your OK. |

## Working on the repo

```
npm install            # installs root tooling and the site (npm workspaces)
npm run validate       # checks frontmatter, YAML and JSON
npm test               # MCP server tests
npm run mcp:dev        # MCP server at http://localhost:3333/mcp
npm run mcp:smoke -- https://nikolovski.ai/mcp   # smoke-test any deployment
npm run dev            # site at http://localhost:4321
npm run build          # validate + production build into site/dist
```

Flow: branch, change, open a PR. CI validates content and builds the site; merging to `main` auto-deploys through Vercel. Cut a release by pushing a tag like `v0.1.0`; the release workflow writes the notes.

First-time setup (push, Vercel, domain, weekly review) is in [SETUP.md](SETUP.md). Conventions for humans and agents are in [AGENTS.md](AGENTS.md). Plans are in [ROADMAP.md](ROADMAP.md).

## License

Code under MIT (see `LICENSE`). TODO: decide whether lessons and resources get a content license such as CC BY 4.0.
