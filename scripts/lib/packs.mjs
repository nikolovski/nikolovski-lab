// Starter packs: plugins that ship a named subset of the main plugin's skills.
//
// Every skill lives once, in plugins/<main>/skills/. The Claude app (claude.ai,
// Claude Desktop, Cowork) installs each plugin as its own folder, drops symlinks and
// ignores plugin dependencies, so a pack still has to hold real copies of its skills
// somewhere. They are built here and published to the `packs` branch by CI
// (.github/workflows/publish-packs.yml). On main a pack is only its manifest, README
// and pack.json, and its marketplace entry points at the `packs` branch.
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const REPO = "nikolovski/nikolovski-lab";
export const PACKS_REF = "packs";

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const subdirs = (p) => (isDir(p) ? readdirSync(p).filter((d) => isDir(join(p, d))).sort() : []);

// The main plugin is named like the marketplace and holds every skill and agent.
export function mainPlugin(root) {
  return JSON.parse(readFileSync(join(root, ".claude-plugin", "marketplace.json"), "utf8")).name;
}
export const skillsDir = (root) => join(root, "plugins", mainPlugin(root), "skills");
export const agentsDir = (root) => join(root, "plugins", mainPlugin(root), "agents");

// The marketplace source every pack entry must use.
export const packSource = (name) => ({
  source: "git-subdir",
  url: `https://github.com/${REPO}.git`,
  path: `plugins/${name}`,
  ref: PACKS_REF,
});

// Packs are the folders in plugins/ that have a pack.json: { "skills": ["<name>", ...] }.
export function listPacks(root) {
  const packs = [];
  for (const name of subdirs(join(root, "plugins"))) {
    const file = join(root, "plugins", name, "pack.json");
    if (!existsSync(file)) continue;
    const skills = JSON.parse(readFileSync(file, "utf8")).skills;
    packs.push({ name, dir: join(root, "plugins", name), skills: Array.isArray(skills) ? skills : [] });
  }
  return packs;
}

// Every file under dir, as sorted paths relative to dir.
function files(dir, prefix = "") {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name === ".DS_Store") continue;
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (statSync(join(dir, name)).isDirectory()) out.push(...files(join(dir, name), relPath));
    else out.push(relPath);
  }
  return out;
}

function copyTree(src, dest, skip = () => false) {
  for (const f of files(src)) {
    if (skip(f)) continue;
    mkdirSync(join(dest, f, ".."), { recursive: true });
    copyFileSync(join(src, f), join(dest, f));
  }
}

// Writes the tree of the `packs` branch into out: plugins/<pack>/ with the pack's own
// files plus a copy of each skill it lists, a README and a vercel.json that turns
// deployments off for the branch. Returns [{ name, skills }].
export function buildPacks(root, out) {
  const source = skillsDir(root);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const built = [];
  for (const pack of listPacks(root)) {
    const dest = join(out, "plugins", pack.name);
    copyTree(pack.dir, dest, (f) => f === "pack.json" || f.startsWith("skills/"));
    for (const skill of pack.skills) {
      if (!existsSync(join(source, skill, "SKILL.md"))) throw new Error(`plugins/${pack.name}/pack.json lists "${skill}", which is not in ${source.slice(root.length + 1)}/`);
      copyTree(join(source, skill), join(dest, "skills", skill));
    }
    built.push({ name: pack.name, skills: pack.skills });
  }
  writeFileSync(
    join(out, "README.md"),
    [
      "# Starter packs (generated)",
      "",
      `This branch is built from \`main\` by \`.github/workflows/publish-packs.yml\`. Don't edit it: change the skill in \`plugins/${mainPlugin(root)}/skills/\` or the pack in \`plugins/<pack>/\` on \`main\`.`,
      "",
      ...built.map((p) => `- \`plugins/${p.name}\`: ${p.skills.join(", ")}`),
      "",
    ].join("\n"),
  );
  // Vercel builds a preview for every pushed branch. This one has no site to build.
  writeFileSync(
    join(out, "vercel.json"),
    JSON.stringify({ $schema: "https://openapi.vercel.sh/vercel.json", git: { deploymentEnabled: false } }, null, 2) + "\n",
  );
  return built;
}
