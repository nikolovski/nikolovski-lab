// Keeps the skill and agent copies inside plugins/<name>/ in step with skills/ and agents/.
//
// The Claude app (claude.ai, Claude Desktop, Cowork) loads each plugin as its own
// folder with .claude-plugin/plugin.json, so plugins can't point back at the repo
// root. skills/ and agents/ stay the source of truth, and these copies are generated.
//
// - The main plugin (named like the marketplace) ships every skill and every agent.
// - Any other plugin ships the skill folders it already holds. A skill folder whose
//   name matches one in skills/ is a copy and must match it byte for byte. A folder
//   with no match in skills/ is the plugin's own and is left alone.
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const subdirs = (p) => (isDir(p) ? readdirSync(p).filter((d) => isDir(join(p, d))).sort() : []);

// Every file under dir, as sorted paths relative to dir.
function files(dir, prefix = "") {
  if (!isDir(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name === ".DS_Store") continue;
    const full = join(dir, name);
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) out.push(...files(full, relPath));
    else out.push(relPath);
  }
  return out;
}

const sameTree = (a, b) => {
  const fa = files(a);
  const fb = files(b);
  if (fa.length !== fb.length || fa.some((f, i) => f !== fb[i])) return false;
  return fa.every((f) => readFileSync(join(a, f)).equals(readFileSync(join(b, f))));
};

function copyTree(src, dest) {
  rmSync(dest, { recursive: true, force: true });
  for (const f of files(src)) {
    const to = join(dest, f);
    mkdirSync(join(to, ".."), { recursive: true });
    copyFileSync(join(src, f), to);
  }
}

export function marketplaceName(root) {
  return JSON.parse(readFileSync(join(root, ".claude-plugin", "marketplace.json"), "utf8")).name;
}

// Plugin folders: plugins/<name>/ with .claude-plugin/plugin.json.
export function pluginFolders(root) {
  return subdirs(join(root, "plugins")).filter((d) => existsSync(join(root, "plugins", d, ".claude-plugin", "plugin.json")));
}

// The skill copies a plugin ships: folders in plugins/<name>/skills/ that match skills/.
export function copiedSkills(root, plugin) {
  const canonical = new Set(subdirs(join(root, "skills")));
  return subdirs(join(root, "plugins", plugin, "skills")).filter((s) => canonical.has(s));
}

// Lists what is out of step. With write: true, also fixes it.
// add: { plugin, skills: [...] } copies new skills into a plugin first.
export function syncPluginCopies(root, { write = false, add } = {}) {
  const changes = [];
  const main = marketplaceName(root);
  const canonicalSkills = subdirs(join(root, "skills")).filter((s) => existsSync(join(root, "skills", s, "SKILL.md")));
  const canonicalAgents = isDir(join(root, "agents"))
    ? readdirSync(join(root, "agents")).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md").sort()
    : [];

  const syncSkill = (plugin, skill) => {
    const src = join(root, "skills", skill);
    const dest = join(root, "plugins", plugin, "skills", skill);
    if (isDir(dest) && sameTree(src, dest)) return;
    changes.push(`plugins/${plugin}/skills/${skill} ${isDir(dest) ? "differs from" : "is missing a copy of"} skills/${skill}`);
    if (write) copyTree(src, dest);
  };

  if (add) {
    if (!pluginFolders(root).includes(add.plugin)) throw new Error(`plugins/${add.plugin}/.claude-plugin/plugin.json does not exist`);
    for (const s of add.skills) {
      if (!canonicalSkills.includes(s)) throw new Error(`skills/${s} does not exist`);
      syncSkill(add.plugin, s);
    }
  }

  for (const plugin of pluginFolders(root)) {
    if (plugin === main) {
      // Every skill, and nothing that is no longer in skills/.
      for (const s of canonicalSkills) syncSkill(plugin, s);
      for (const s of subdirs(join(root, "plugins", plugin, "skills"))) {
        if (canonicalSkills.includes(s)) continue;
        changes.push(`plugins/${plugin}/skills/${s} is no longer in skills/`);
        if (write) rmSync(join(root, "plugins", plugin, "skills", s), { recursive: true, force: true });
      }
      // Every agent, and nothing that is no longer in agents/.
      const agentDir = join(root, "plugins", plugin, "agents");
      for (const a of canonicalAgents) {
        const src = join(root, "agents", a);
        const dest = join(agentDir, a);
        if (existsSync(dest) && readFileSync(src).equals(readFileSync(dest))) continue;
        changes.push(`plugins/${plugin}/agents/${a} ${existsSync(dest) ? "differs from" : "is missing a copy of"} agents/${a}`);
        if (write) { mkdirSync(agentDir, { recursive: true }); copyFileSync(src, dest); }
      }
      for (const a of isDir(agentDir) ? readdirSync(agentDir) : []) {
        if (canonicalAgents.includes(a)) continue;
        changes.push(`plugins/${plugin}/agents/${a} is no longer in agents/`);
        if (write) rmSync(join(agentDir, a), { recursive: true, force: true });
      }
    } else {
      for (const s of copiedSkills(root, plugin)) syncSkill(plugin, s);
    }
  }
  return changes;
}
