#!/usr/bin/env node
// Content checks for the Nikolovski Lab repo. Run: npm run validate
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

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

// Plugin marketplace, starter packs and standalone plugins
const RESERVED_RE = /^(claude-|anthropic-|anthropics-|cc-plugin-)/;
const mpFile = join(root, ".claude-plugin", "marketplace.json");
const at = rel(mpFile);
const entryNames = new Set();
const packNames = new Set();
const pluginDirs = new Set();
function checkManifest(pj, expectedName) {
  let m;
  try { m = JSON.parse(readFileSync(pj, "utf8")); } catch (e) { err(rel(pj), `invalid JSON (${e.message})`); return; }
  if (!str(m.name)) err(rel(pj), "`name` is required");
  else if (m.name !== expectedName) err(rel(pj), `name "${m.name}" must equal the marketplace entry name "${expectedName}"`);
  if (m.description != null && !str(m.description)) err(rel(pj), "`description` must be a non-empty string");
  if (m.author != null && !str(m.author?.name)) err(rel(pj), "`author` must be an object with a `name`");
  if (m.homepage != null) { try { new URL(m.homepage); } catch { err(rel(pj), "`homepage` must be a URL"); } }
  if (m.keywords != null && !(Array.isArray(m.keywords) && m.keywords.every(str))) err(rel(pj), "`keywords` must be a list of strings");
}
try {
  const mp = JSON.parse(readFileSync(mpFile, "utf8"));
  if (!str(mp.name)) err(at, "`name` is required");
  if (!str(mp.owner?.name)) err(at, "`owner.name` is required");
  if (!Array.isArray(mp.plugins) || mp.plugins.length === 0) err(at, "`plugins` must be a non-empty list");
  for (const p of mp.plugins ?? []) {
    if (!str(p.name)) { err(at, "every plugin needs a `name`"); continue; }
    const who = `plugin "${p.name}"`;
    if (!NAME_RE.test(p.name) || p.name.length > 64) err(at, `${who}: name must be lowercase-hyphenated, max 64 chars`);
    if (RESERVED_RE.test(p.name)) err(at, `${who}: names starting with claude-, anthropic- or cc-plugin- are reserved`);
    if (entryNames.has(p.name)) err(at, `${who}: duplicate name`);
    entryNames.add(p.name);
    if (!str(p.description)) err(at, `${who}: \`description\` is required`);
    if (p.homepage != null) { try { new URL(p.homepage); } catch { err(at, `${who}: \`homepage\` must be a URL`); } }
    if (typeof p.source !== "string") continue;
    if (p.source !== "./" && p.source !== "." && !p.source.startsWith("./")) err(at, `${who}: relative source must start with ./`);
    if (p.source.includes("..")) err(at, `${who}: source must not contain ..`);
    const dir = join(root, p.source);
    if (!existsSync(dir)) { err(at, `${who}: source ${p.source} does not exist`); continue; }
    const isRoot = p.source === "./" || p.source === ".";
    if (!isRoot) {
      const m = p.source.match(/^\.\/plugins\/([^/]+)\/?$/);
      if (!m) err(at, `${who}: a non-root source must be ./plugins/<name>`);
      else {
        pluginDirs.add(m[1]);
        if (m[1] !== p.name) err(at, `${who}: folder plugins/${m[1]} must match the entry name`);
      }
      const pj = join(dir, ".claude-plugin", "plugin.json");
      if (!existsSync(pj)) err(at, `${who}: ${p.source}.claude-plugin/plugin.json is missing`.replace("//", "/"));
      else checkManifest(pj, p.name);
    } else if (existsSync(join(root, ".claude-plugin", "plugin.json"))) {
      checkManifest(join(root, ".claude-plugin", "plugin.json"), p.name);
    }
    if (p.skills != null) {
      // Starter pack: root source plus a list of skill folders from skills/.
      if (!isRoot) err(at, `${who}: a \`skills\` list is only for starter packs whose source is ./`);
      const list = Array.isArray(p.skills) ? p.skills : [p.skills];
      if (list.length === 0) err(at, `${who}: \`skills\` must list at least one skill`);
      const seen = new Set();
      for (const s of list) {
        const m = typeof s === "string" && s.match(/^\.\/skills\/([^/]+)\/?$/);
        if (!m) { err(at, `${who}: skill path "${s}" must look like ./skills/<name>`); continue; }
        if (!skillNames.has(m[1])) err(at, `${who}: skill "${m[1]}" has no folder in skills/`);
        if (seen.has(m[1])) err(at, `${who}: skill "${m[1]}" is listed twice`);
        seen.add(m[1]);
      }
      if (isRoot) {
        packNames.add(p.name);
        const readme = join(root, "plugins", p.name, "README.md");
        if (!existsSync(readme)) err(at, `${who}: starter pack needs plugins/${p.name}/README.md`);
        else {
          const text = readFileSync(readme, "utf8");
          if (!text.includes(`/plugin install ${p.name}@${mp.name}`)) err(rel(readme), `must show the install line \`/plugin install ${p.name}@${mp.name}\``);
          for (const name of seen) if (!text.includes(`skills/${name}/`)) err(rel(readme), `must list the skill "${name}" that the pack ships`);
        }
      }
    }
  }
} catch (e) {
  err(at, `missing or invalid JSON (${e.message})`);
}
// Every folder in plugins/ is a starter pack or a registered standalone plugin.
for (const d of dirs(join(root, "plugins"))) {
  if (!packNames.has(d) && !pluginDirs.has(d)) err(`plugins/${d}`, "is neither a starter pack nor a plugin registered in .claude-plugin/marketplace.json");
}

for (const w of warn) console.warn(`warning: ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`ok: ${skillNames.size} skill(s), ${packNames.size} starter pack(s), content valid`);
