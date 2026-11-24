# Roadmap

## Phase 0: foundation (this scaffold)
- [x] Repo layout: skills, agents, plugins, lessons, resources
- [x] Claude Code plugin marketplace file
- [x] Astro site with Lessons, Toolkit and Resources
- [x] CI: content validation and site build on every PR
- [x] Tagged releases
- [ ] Paste the real `architecture-review` skill and publish the first lesson
- [x] Add the `improve-prompt` skill
- [ ] Write the `improve-prompt` lesson
- [ ] Connect Vercel and point nikolovski.ai at it
- [ ] Turn on the weekly skill review once the API key secret is set

## Phase 1
- [ ] **MCP server**: lets anyone's agent search and pull skills and lessons from this repo (`search_skills`, `get_skill`, `search_lessons`, `get_lesson`). Likely a small read-only server deployed next to the site.
- [ ] **Before/after demos**: one per skill, showing the agent's output without and with the skill.
- [ ] **Starter packs**: one-command bundles as extra plugins under `plugins/`, for example:
  - `solo-saas-founder`
  - `code-reviewer`

## Later
- [ ] Weekly digest newsletter
- [ ] Case studies (each needs the repo owner's written OK before publishing)
