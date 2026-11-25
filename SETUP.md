# Setup (one time)

1. **Create the GitHub repo** (empty, no README), for example `nikolovski-lab`.
2. **Set the owner** in `site/src/site.config.ts` (`repo: "OWNER/nikolovski-lab"`) and replace `OWNER` in `README.md`.
3. **Push:**
   ```
   git init -b main
   git add .
   git commit -m "Initial scaffold"
   git remote add origin git@github.com:OWNER/nikolovski-lab.git
   git push -u origin main
   git tag v0.1.0 && git push origin v0.1.0   # optional: first release
   ```
4. **Protect main** (Settings > Branches): require the `Validate` check before merging.
5. **Vercel:** New Project > import the repo. Leave the root directory as the repo root; `vercel.json` sets the build (`npm run build`) and output (`site/dist`). Every merge to `main` deploys; every PR gets a preview.
6. **Domain:** in Vercel, Project > Settings > Domains, add `nikolovski.ai` and `www.nikolovski.ai`, then add the DNS records Vercel shows at your domain registrar.
7. **Weekly skill review (optional):**
   - Add the repo secret `ANTHROPIC_API_KEY`.
   - Settings > Actions > General: allow GitHub Actions to create pull requests.
   - Keep at least one required approval on `main`, so the workflow cannot merge its own PRs.
   - Claude can fetch only the sites listed in `.github/workflows/skill-review.yml`, plus its built-in documentation sites. When a skill cites a new site, add it there.
   - Try it from the Actions tab (Run workflow). To run it every Monday, add the repo variable `SKILL_REVIEW_ENABLED` = `true`.
8. **Starter packs:** `.github/workflows/publish-packs.yml` builds the packs onto the `packs` branch on every merge that touches `plugins/`. Nothing to configure. Don't delete that branch or add a protection rule that blocks `github-actions[bot]` from pushing to it. To rebuild by hand, run the workflow from the Actions tab.
9. **Install it yourself** in Claude Code to check: `/plugin marketplace add OWNER/nikolovski-lab`, then `/plugin install nikolovski-lab@nikolovski-lab`.
