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

// Plugin marketplace
const mpFile = join(root, ".claude-plugin", "marketplace.json");
try {
  const mp = JSON.parse(readFileSync(mpFile, "utf8"));
  if (!str(mp.name)) err(rel(mpFile), "`name` is required");
  if (!str(mp.owner?.name)) err(rel(mpFile), "`owner.name` is required");
  if (!Array.isArray(mp.plugins) || mp.plugins.length === 0) err(rel(mpFile), "`plugins` must be a non-empty list");
  for (const p of mp.plugins ?? []) {
    if (!str(p.name)) err(rel(mpFile), "every plugin needs a `name`");
    if (typeof p.source === "string") {
      if (p.source !== "." && !p.source.startsWith("./")) err(rel(mpFile), `plugin "${p.name}": relative source must start with ./`);
      if (p.source.includes("..")) err(rel(mpFile), `plugin "${p.name}": source must not contain ..`);
      const dir = join(root, p.source);
      if (!existsSync(dir)) err(rel(mpFile), `plugin "${p.name}": source ${p.source} does not exist`);
      const pj = join(dir, ".claude-plugin", "plugin.json");
      if (existsSync(pj)) {
        try {
          const m = JSON.parse(readFileSync(pj, "utf8"));
          if (m.name !== p.name) err(rel(pj), `name "${m.name}" must equal the marketplace entry name "${p.name}"`);
        } catch (e) { err(rel(pj), `invalid JSON (${e.message})`); }
      }
    }
  }
} catch (e) {
  err(rel(mpFile), `missing or invalid JSON (${e.message})`);
}

for (const w of warn) console.warn(`warning: ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`ok: ${skillNames.size} skill(s), content valid`);
