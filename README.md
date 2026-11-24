# Nikolovski Lab

Skills, agents, plugins, lessons and curated resources from my work with AI coding agents. Everything here is plain files in Git; the site at [nikolovski.ai](https://nikolovski.ai) is built straight from this repo.

## What's inside

| Folder | What it holds |
| --- | --- |
| `skills/<name>/SKILL.md` | Agent Skills (Claude Code, Codex, Cursor and any agent that reads `SKILL.md`) |
| `agents/*.md` | Subagent definitions |
| `plugins/<name>/` | Extra Claude Code plugins, such as starter packs (see `plugins/README.md`) |
| `lessons/YYYY-MM-DD-slug.md` | Dated write-ups; each links the skill it produced |
| `resources/resources.yaml` | Curated links, each with a line on why it matters |
| `.claude-plugin/marketplace.json` | Makes this repo a Claude Code plugin marketplace |
| `site/` | Astro site (Lessons, Toolkit, Resources), deployed on Vercel |
| `scripts/validate.mjs` | Content checks that CI runs on every PR |

## Install

Replace `OWNER` with the GitHub account that hosts this repo.

**Claude Code** (all skills and agents as one plugin):

```
/plugin marketplace add OWNER/nikolovski-lab
/plugin install nikolovski-lab@nikolovski-lab
```

**Codex, Cursor and other agents** (one skill, via the open [skills CLI](https://github.com/vercel-labs/skills)):

```
npx skills add OWNER/nikolovski-lab --skill architecture-review -a codex
npx skills add OWNER/nikolovski-lab --skill architecture-review -a cursor
```

**Manual:** copy `skills/<name>/` into your agent's skills folder (for Claude Code, `~/.claude/skills/<name>/`).

## Skills

| Skill | What it does |
| --- | --- |
| [architecture-review](skills/architecture-review/SKILL.md) | Evidence-based architecture review. Outputs a scorecard, ranked findings and a roadmap. |
| [improve-prompt](skills/improve-prompt/SKILL.md) | Rewrites a rough prompt for any AI tool. Asks first, states assumptions, hands the prompt back for your OK. |

## Working on the repo

```
npm install            # installs root tooling and the site (npm workspaces)
npm run validate       # checks frontmatter, YAML and JSON
npm run dev            # site at http://localhost:4321
npm run build          # validate + production build into site/dist
```

Flow: branch, change, open a PR. CI validates content and builds the site; merging to `main` auto-deploys through Vercel. Cut a release by pushing a tag like `v0.1.0`; the release workflow writes the notes.

First-time setup (push, Vercel, domain, weekly review) is in [SETUP.md](SETUP.md). Conventions for humans and agents are in [AGENTS.md](AGENTS.md). Plans are in [ROADMAP.md](ROADMAP.md).

## License

Code under MIT (see `LICENSE`). TODO: decide whether lessons and resources get a content license such as CC BY 4.0.
