#!/usr/bin/env node
// Content checks for the Nikolovski Lab repo. Run: npm run validate
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { syncPluginCopies, copiedSkills } from "./lib/plugin-copies.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warn = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function frontmatter(path) {
  const text = readFileSync(path, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  try {
    return parseYaml(m[1]) ?? {};
  } catch (e) {
    err(rel(path), `frontmatter is not valid YAML (${e.message.split("\n")[0]})`);
    return {};
  }
}
const rel = (p) => p.slice(root.length + 1);
const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory()) : []);
const mdFiles = (p) => (existsSync(p) ? readdirSync(p).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md") : []);
const str = (v) => typeof v === "string" && v.trim().length > 0;
const asDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));

// Skills
const skillNames = new Set();
for (const d of dirs(join(root, "skills"))) {
  const file = join(root, "skills", d, "SKILL.md");
  if (!existsSync(file)) { err(`skills/${d}`, "missing SKILL.md"); continue; }
  const fm = frontmatter(file);
  if (!fm) { err(rel(file), "missing YAML frontmatter"); continue; }
  if (!str(fm.name)) err(rel(file), "frontmatter `name` is required");
  else {
    if (!NAME_RE.test(fm.name) || fm.name.length > 64) err(rel(file), "`name` must be lowercase-hyphenated, max 64 chars");
    if (fm.name !== d) err(rel(file), `\`name\` (${fm.name}) must match its folder (${d})`);
  }
  if (!str(fm.description)) err(rel(file), "frontmatter `description` is required");
  else if (fm.description.length > 1024) err(rel(file), "`description` must be 1024 chars or fewer");
  skillNames.add(d);
}
if (skillNames.size === 0) warn.push("no skills found in skills/");

// Agents
for (const f of mdFiles(join(root, "agents"))) {
  const file = join(root, "agents", f);
  const fm = frontmatter(file);
  if (!fm) { err(rel(file), "missing YAML frontmatter"); continue; }
  if (!str(fm.name)) err(rel(file), "frontmatter `name` is required");
  if (!str(fm.description)) err(rel(file), "frontmatter `description` is required");
}

// Lessons
for (const f of mdFiles(join(root, "lessons"))) {
  const file = join(root, "lessons", f);
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(f)) err(rel(file), "file name must be YYYY-MM-DD-slug.md");
  const fm = frontmatter(file);
  if (!fm) { err(rel(file), "missing YAML frontmatter"); continue; }
  if (!str(fm.title)) err(rel(file), "`title` is required");
  if (!str(fm.summary)) err(rel(file), "`summary` is required");
  const date = asDate(fm.date);
  if (!DATE_RE.test(date)) err(rel(file), "`date` must be YYYY-MM-DD");
  else if (!f.startsWith(date)) err(rel(file), "`date` must match the file name prefix");
  if (fm.skill != null && !skillNames.has(fm.skill)) err(rel(file), `\`skill\` "${fm.skill}" has no folder in skills/`);
}

// Demos: demos/<skill>/ holds demo.md (frontmatter + "what changed"), task.md, without.md and with.md
const demoSkills = new Set();
for (const d of dirs(join(root, "demos"))) {
  const at = `demos/${d}`;
  for (const part of ["demo.md", "task.md", "without.md", "with.md"]) {
    const f = join(root, "demos", d, part);
    if (!existsSync(f)) err(at, `missing ${part}`);
    else if (readFileSync(f, "utf8").trim().length === 0) err(`${at}/${part}`, "must not be empty");
  }
  const file = join(root, "demos", d, "demo.md");
  if (!existsSync(file)) continue;
  const fm = frontmatter(file);
  if (!fm) { err(rel(file), "missing YAML frontmatter"); continue; }
  if (!str(fm.skill)) err(rel(file), "`skill` is required");
  else if (fm.skill !== d) err(rel(file), `\`skill\` (${fm.skill}) must match its folder (${d})`);
  else if (!skillNames.has(d)) err(rel(file), `\`skill\` "${d}" has no folder in skills/`);
  for (const k of ["title", "summary", "generated_by", "setup"]) if (!str(fm[k])) err(rel(file), `\`${k}\` is required`);
  if (!DATE_RE.test(asDate(fm.generated))) err(rel(file), "`generated` must be YYYY-MM-DD");
  demoSkills.add(d);
}
for (const s of skillNames) if (!demoSkills.has(s)) warn.push(`skill "${s}" has no before/after demo in demos/${s}/`);

// Resources
const resFile = join(root, "resources", "resources.yaml");
if (existsSync(resFile)) {
  let items;
  try { items = parseYaml(readFileSync(resFile, "utf8")); } catch (e) { err("resources/resources.yaml", `invalid YAML (${e.message.split("\n")[0]})`); }
  if (items !== undefined) {
    if (!Array.isArray(items)) err("resources/resources.yaml", "must be a list");
    else {
      const ids = new Set();
      items.forEach((r, i) => {
        const at = `resources/resources.yaml[${i}]`;
        if (!str(r?.id) || !NAME_RE.test(r.id)) err(at, "`id` is required and must be kebab-case");
        else if (ids.has(r.id)) err(at, `duplicate id "${r.id}"`);
        else ids.add(r.id);
        for (const k of ["title", "category", "why"]) if (!str(r?.[k])) err(at, `\`${k}\` is required`);
        if (!str(r?.url) || !/^https:\/\/\S+$/.test(r.url)) err(at, "`url` must be an https URL");
      });
    }
  }
}

// Plugin marketplace and plugins. The Claude app loads each plugin as its own folder
// with .claude-plugin/plugin.json, so every entry points at ./plugins/<name>.
const RESERVED_RE = /^(claude-|anthropic-|anthropics-|cc-plugin-)/;
const mpFile = join(root, ".claude-plugin", "marketplace.json");
const at = rel(mpFile);
const pluginDirs = new Set();
const packNames = new Set();
function checkManifest(pj, expectedName) {
  let m;
  try { m = JSON.parse(readFileSync(pj, "utf8")); } catch (e) { err(rel(pj), `invalid JSON (${e.message})`); return; }
  if (!str(m.name)) err(rel(pj), "`name` is required");
  else if (m.name !== expectedName) err(rel(pj), `name "${m.name}" must equal the marketplace entry name "${expectedName}"`);
  if (m.description != null && !str(m.description)) err(rel(pj), "`description` must be a non-empty string");
  if (m.author != null && !str(m.author?.name)) err(rel(pj), "`author` must be an object with a `name`");
  if (m.homepage != null) { try { new URL(m.homepage); } catch { err(rel(pj), "`homepage` must be a URL"); } }
  if (m.keywords != null && !(Array.isArray(m.keywords) && m.keywords.every(str))) err(rel(pj), "`keywords` must be a list of strings");
  for (const k of ["skills", "agents", "commands"]) {
    if (m[k] != null) err(rel(pj), `drop \`${k}\`: put the files in the plugin folder instead (see plugins/README.md)`);
  }
}
let mp;
try {
  mp = JSON.parse(readFileSync(mpFile, "utf8"));
} catch (e) {
  err(at, `missing or invalid JSON (${e.message})`);
}
if (mp) {
  if (!str(mp.name)) err(at, "`name` is required");
  if (!str(mp.owner?.name)) err(at, "`owner.name` is required");
  if (!Array.isArray(mp.plugins) || mp.plugins.length === 0) err(at, "`plugins` must be a non-empty list");
  const entryNames = new Set();
  for (const p of mp.plugins ?? []) {
    if (!str(p.name)) { err(at, "every plugin needs a `name`"); continue; }
    const who = `plugin "${p.name}"`;
    if (!NAME_RE.test(p.name) || p.name.length > 64) err(at, `${who}: name must be lowercase-hyphenated, max 64 chars`);
    if (RESERVED_RE.test(p.name)) err(at, `${who}: names starting with claude-, anthropic- or cc-plugin- are reserved`);
    if (entryNames.has(p.name)) err(at, `${who}: duplicate name`);
    entryNames.add(p.name);
    if (!str(p.description)) err(at, `${who}: \`description\` is required`);
    if (p.homepage != null) { try { new URL(p.homepage); } catch { err(at, `${who}: \`homepage\` must be a URL`); } }
    for (const k of ["skills", "agents", "commands"]) {
      if (p[k] != null) err(at, `${who}: drop \`${k}\`: the Claude app loads the plugin folder as it is (see plugins/README.md)`);
    }
    if (typeof p.source !== "string") continue;
    const m = p.source.match(/^\.\/plugins\/([^/]+)\/?$/);
    if (!m) { err(at, `${who}: source must be ./plugins/<name>; the Claude app can't load a plugin from the repo root`); continue; }
    if (m[1] !== p.name) err(at, `${who}: folder plugins/${m[1]} must match the entry name`);
    const dir = join(root, "plugins", m[1]);
    if (!existsSync(dir)) { err(at, `${who}: source ${p.source} does not exist`); continue; }
    pluginDirs.add(m[1]);
    const pj = join(dir, ".claude-plugin", "plugin.json");
    if (!existsSync(pj)) err(at, `${who}: plugins/${m[1]}/.claude-plugin/plugin.json is missing`);
    else checkManifest(pj, p.name);
    if (existsSync(join(dir, "bin"))) err(`plugins/${m[1]}`, "remove bin/: the Claude app won't install a plugin that has one");
    const shipped = existsSync(pj) ? copiedSkills(root, m[1]) : [];
    if (m[1] !== mp.name && shipped.length > 0) packNames.add(m[1]);
    const readme = join(dir, "README.md");
    if (!existsSync(readme)) err(`plugins/${m[1]}`, "needs a README.md");
    else {
      const text = readFileSync(readme, "utf8");
      if (!text.includes(`/plugin install ${p.name}@${mp.name}`)) err(rel(readme), `must show the install line \`/plugin install ${p.name}@${mp.name}\``);
      for (const name of shipped) if (!text.includes(`skills/${name}/`)) err(rel(readme), `must list the skill "${name}" that the plugin ships`);
    }
  }
  if (str(mp.name) && !entryNames.has(mp.name)) err(at, `the main plugin "${mp.name}" (named like the marketplace) is missing`);
  // Generated copies must match skills/ and agents/.
  if (errors.length === 0) {
    for (const c of syncPluginCopies(root)) err("plugins", `${c} (run npm run sync:plugins)`);
  }
}
// Every folder in plugins/ is a plugin registered in the marketplace.
for (const d of dirs(join(root, "plugins"))) {
  if (!pluginDirs.has(d)) err(`plugins/${d}`, "is not a plugin registered in .claude-plugin/marketplace.json");
}

for (const w of warn) console.warn(`warning: ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`ok: ${skillNames.size} skill(s), ${demoSkills.size} demo(s), ${packNames.size} starter pack(s), content valid`);
