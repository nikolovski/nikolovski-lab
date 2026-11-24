# Roadmap

## Phase 0: foundation (this scaffold)
- [x] Repo layout: skills, agents, plugins, lessons, resources
- [x] Claude Code plugin marketplace file
- [x] Astro site with Lessons, Toolkit and Resources
- [x] CI: content validation and site build on every PR
- [x] Tagged releases
- [x] Add the `architecture-review` skill
- [ ] Write the `architecture-review` lesson
- [x] Add the `improve-prompt` skill
- [ ] Write the `improve-prompt` lesson
- [x] Connect Vercel and point nikolovski.ai at it
- [x] Turn on the weekly skill review

## Phase 1
- [x] **MCP server**: lets anyone's agent search and pull skills and lessons from this repo (`search_skills`, `get_skill`, `search_lessons`, `get_lesson`). Read-only, at `https://nikolovski.ai/mcp`, deployed next to the site.
- [x] **Before/after demos**: one per skill, showing the agent's output without and with the skill.
- [x] **Starter packs**: one-command bundles as extra plugins under `plugins/`, for example:
  - `solo-saas-founder`
  - `code-reviewer`

## Later
- [ ] Weekly digest newsletter
- [ ] Case studies (each needs the repo owner's written OK before publishing)
