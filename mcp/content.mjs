// Reads skills and published lessons from the repo and searches them.
// Git is the source of truth: this module only reads files, there is no database.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, sep, posix } from "node:path";
import { parse as parseYaml } from "yaml";

export const SITE_URL = "https://nikolovski.ai";
export const REPO = "nikolovski/nikolovski-lab";
export const BRANCH = "main";
// Skills live in the main plugin's folder, their only home in the repo (see plugins/README.md).
export const SKILLS_DIR = "plugins/nikolovski-lab/skills";
const blobUrl = (path) => `https://github.com/${REPO}/blob/${BRANCH}/${path}`;
const rawUrl = (path) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  let data = {};
  try {
    data = parseYaml(m[1]) ?? {};
  } catch {
    data = {};
  }
  return { data, body: text.slice(m[0].length) };
}

const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory()) : []);
const toPosix = (p) => p.split(sep).join(posix.sep);

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const asDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));

/** Loads every skill and every non-draft lesson under `root`. */
export function loadContent(root) {
  const skills = [];
  for (const d of dirs(join(root, SKILLS_DIR)).sort()) {
    const dir = join(root, SKILLS_DIR, d);
    const file = join(dir, "SKILL.md");
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const { data, body } = splitFrontmatter(text);
    const path = `${SKILLS_DIR}/${d}/SKILL.md`;
    const files = listFiles(dir)
      .map((f) => toPosix(relative(dir, f)))
      .filter((f) => f !== "SKILL.md")
      .sort();
    skills.push({
      name: d,
      description: String(data.description ?? ""),
      text,
      body,
      files,
      dir,
      url: `${SITE_URL}/toolkit/#${d}`,
      source: blobUrl(path),
      raw: rawUrl(path),
    });
  }

  const lessons = [];
  const lessonDir = join(root, "lessons");
  const lessonFiles = existsSync(lessonDir)
    ? readdirSync(lessonDir).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md")
    : [];
  for (const f of lessonFiles.sort()) {
    const text = readFileSync(join(lessonDir, f), "utf8");
    const { data, body } = splitFrontmatter(text);
    // Drafts never leave the repo through this server.
    if (data.draft === true) continue;
    const id = f.replace(/\.md$/, "").toLowerCase();
    lessons.push({
      id,
      title: String(data.title ?? id),
      date: asDate(data.date),
      summary: String(data.summary ?? ""),
      skill: data.skill ? String(data.skill) : undefined,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      body: body.trim(),
      url: `${SITE_URL}/lessons/${id}/`,
      source: blobUrl(`lessons/${f}`),
    });
  }
  lessons.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  return { skills, lessons };
}

const tokenize = (s) => (String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1);

function countHits(haystack, token) {
  let n = 0;
  let i = haystack.indexOf(token);
  while (i !== -1 && n < 5) {
    n++;
    i = haystack.indexOf(token, i + token.length);
  }
  return n;
}

function snippet(body, tokens, width = 200) {
  const flat = body.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase();
  let at = -1;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return flat.slice(0, width) + (flat.length > width ? "…" : "");
  const start = Math.max(0, at - 60);
  const piece = flat.slice(start, start + width);
  return (start > 0 ? "…" : "") + piece + (start + width < flat.length ? "…" : "");
}

/**
 * Keyword search. Each query word scores by where it appears:
 * title/name 5, description/summary/tags 2, body up to 2.5.
 * An empty query lists everything.
 */
function rank(items, query, fields) {
  const tokens = tokenize(query ?? "");
  if (tokens.length === 0) return items.map((item) => ({ item, score: 0, tokens }));
  const out = [];
  for (const item of items) {
    const title = fields.title(item).toLowerCase();
    const meta = fields.meta(item).toLowerCase();
    const body = fields.body(item).toLowerCase();
    let score = 0;
    let matched = 0;
    for (const t of tokens) {
      let s = 0;
      if (title.includes(t)) s += 5;
      if (meta.includes(t)) s += 2;
      s += Math.min(countHits(body, t), 5) * 0.5;
      if (s > 0) matched++;
      score += s;
    }
    // Reward results that match more of the query words.
    if (score > 0) out.push({ item, score: score * (matched / tokens.length), tokens });
  }
  return out.sort((a, b) => b.score - a.score);
}

const clampLimit = (n) => Math.max(1, Math.min(Number.isFinite(n) ? Math.floor(n) : 10, 50));

export function searchSkills(content, query, limit = 10) {
  return rank(content.skills, query, {
    title: (s) => s.name,
    meta: (s) => s.description,
    body: (s) => s.body,
  })
    .slice(0, clampLimit(limit))
    .map(({ item, score, tokens }) => ({
      name: item.name,
      description: item.description,
      url: item.url,
      source: item.source,
      ...(tokens.length ? { score: Math.round(score * 10) / 10, snippet: snippet(item.body, tokens) } : {}),
    }));
}

export function searchLessons(content, query, limit = 10) {
  return rank(content.lessons, query, {
    title: (l) => l.title,
    meta: (l) => [l.summary, l.skill ?? "", ...l.tags].join(" "),
    body: (l) => l.body,
  })
    .slice(0, clampLimit(limit))
    .map(({ item, score, tokens }) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      summary: item.summary,
      ...(item.skill ? { skill: item.skill } : {}),
      tags: item.tags,
      url: item.url,
      ...(tokens.length ? { score: Math.round(score * 10) / 10, snippet: snippet(item.body, tokens) } : {}),
    }));
}

export const findSkill = (content, name) =>
  content.skills.find((s) => s.name === String(name ?? "").trim().toLowerCase());

export const findLesson = (content, id) => {
  const key = String(id ?? "").trim().toLowerCase().replace(/\.md$/, "").replace(/\/$/, "");
  return content.lessons.find((l) => l.id === key || l.id.slice(11) === key);
};

/** Reads one supporting file of a skill. Only paths the skill actually lists are allowed. */
export function readSkillFile(skill, file) {
  const wanted = toPosix(String(file ?? "")).replace(/^\.\//, "");
  if (wanted === "SKILL.md") return skill.text;
  if (!skill.files.includes(wanted)) return undefined;
  return readFileSync(join(skill.dir, ...wanted.split("/")), "utf8");
}
