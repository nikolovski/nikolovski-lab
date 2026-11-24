export const site = {
  title: "Nikolovski Lab",
  tagline: "Skills, agents and lessons from building with AI coding agents.",
  repo: "nikolovski/nikolovski-lab",
  branch: "main",
};

export const repoUrl = `https://github.com/${site.repo}`;
export const sourceUrl = (path: string) => `${repoUrl}/blob/${site.branch}/${path}`;
