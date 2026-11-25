// Tests for the MCP server. Run: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SKILLS_DIR, loadContent, searchSkills, searchLessons, findLesson, findSkill, readSkillFile } from "../mcp/content.mjs";
import { serve } from "../scripts/mcp-dev.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// A small fixture repo: two skills, one published lesson, one draft, one template.
const root = mkdtempSync(join(tmpdir(), "nl-mcp-"));
const put = (path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};
put("plugins/nikolovski-lab/skills/alpha-review/SKILL.md", '---\nname: "alpha-review"\ndescription: "Reviews database schemas for indexing problems."\n---\n\n# Alpha\nCheck every foreign key.\n');
put("plugins/nikolovski-lab/skills/alpha-review/references/checklist.md", "# Checklist\n- indexes\n");
put("plugins/nikolovski-lab/skills/beta-writer/SKILL.md", "---\nname: beta-writer\ndescription: Writes release notes.\n---\n\n# Beta\nMentions schemas once.\n");
put("lessons/2026-01-01-indexes.md", "---\ntitle: What indexes taught me\ndate: 2026-01-01\nsummary: Foreign keys need indexes.\nskill: alpha-review\ntags: [database]\n---\n\nThe body of the published lesson.\n");
put("lessons/2026-01-02-secret.md", "---\ntitle: Secret plans\ndate: 2026-01-02\nsummary: Not ready.\ndraft: true\n---\n\nUnreleased secret body.\n");
put("lessons/_template.md", "---\ntitle: Template\ndate: 2026-01-01\nsummary: x\n---\n");
const content = loadContent(root);

test("loads skills and only published lessons", () => {
  assert.deepEqual(content.skills.map((s) => s.name), ["alpha-review", "beta-writer"]);
  assert.deepEqual(content.lessons.map((l) => l.id), ["2026-01-01-indexes"]);
  assert.deepEqual(findSkill(content, "alpha-review").files, ["references/checklist.md"]);
});

test("search ranks name and description above body mentions", () => {
  const results = searchSkills(content, "schemas");
  assert.equal(results[0].name, "alpha-review");
  assert.equal(results.length, 2);
  assert.equal(searchSkills(content, "").length, 2);
  assert.equal(searchSkills(content, "nothing-matches-this").length, 0);
  assert.equal(searchSkills(content, "", 1).length, 1);
});

test("drafts are never searchable or fetchable", () => {
  assert.equal(searchLessons(content, "secret").length, 0);
  assert.equal(findLesson(content, "2026-01-02-secret"), undefined);
  assert.equal(findLesson(content, "secret"), undefined);
  assert.equal(findLesson(content, "indexes").id, "2026-01-01-indexes");
});

test("skill files are limited to the skill's own folder", () => {
  const skill = findSkill(content, "alpha-review");
  assert.match(readSkillFile(skill, "references/checklist.md"), /Checklist/);
  assert.equal(readSkillFile(skill, "../beta-writer/SKILL.md"), undefined);
  assert.equal(readSkillFile(skill, "/etc/passwd"), undefined);
});

test("the real repo loads every skill and hides every draft lesson", () => {
  const real = loadContent(repoRoot);
  const skillDirs = readdirSync(join(repoRoot, SKILLS_DIR)).sort();
  assert.deepEqual(real.skills.map((s) => s.name), skillDirs);
  for (const f of readdirSync(join(repoRoot, "lessons")).filter((f) => /^\d{4}.*\.md$/.test(f))) {
    const isDraft = /^draft:\s*true\s*$/m.test(readFileSync(join(repoRoot, "lessons", f), "utf8").split(/\n---/)[0]);
    assert.equal(Boolean(findLesson(real, f)), !isDraft, f);
  }
});

let server;
let base;
before(async () => {
  server = await serve({ port: 0, root });
  base = `http://127.0.0.1:${server.address().port}/mcp`;
});
after(() => {
  server?.close();
  rmSync(root, { recursive: true, force: true });
});

test("end to end over Streamable HTTP", async () => {
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(base)));
  const parse = (r) => JSON.parse(r.content[0].text);

  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["get_lesson", "get_skill", "search_lessons", "search_skills"]);
  assert.ok(tools.every((t) => t.annotations?.readOnlyHint === true));

  const found = parse(await client.callTool({ name: "search_skills", arguments: { query: "indexing" } }));
  assert.equal(found.results[0].name, "alpha-review");

  const skill = await client.callTool({ name: "get_skill", arguments: { name: "alpha-review" } });
  assert.match(skill.content[0].text, /^---\nname: "alpha-review"/);
  assert.match(skill.content[1].text, /references\/checklist\.md/);

  const file = await client.callTool({ name: "get_skill", arguments: { name: "alpha-review", file: "references/checklist.md" } });
  assert.match(file.content[0].text, /# Checklist/);

  const missing = await client.callTool({ name: "get_skill", arguments: { name: "nope" } });
  assert.equal(missing.isError, true);

  const lessons = parse(await client.callTool({ name: "search_lessons", arguments: {} }));
  assert.deepEqual(lessons.results.map((l) => l.id), ["2026-01-01-indexes"]);

  const lesson = await client.callTool({ name: "get_lesson", arguments: { id: "2026-01-01-indexes" } });
  assert.match(lesson.content[0].text, /# What indexes taught me[\s\S]*The body of the published lesson/);

  const draft = await client.callTool({ name: "get_lesson", arguments: { id: "2026-01-02-secret" } });
  assert.equal(draft.isError, true);
  assert.doesNotMatch(draft.content[0].text, /Unreleased/);

  await client.close();
});

test("GET explains itself, OPTIONS allows any origin", async () => {
  const get = await fetch(base);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST, OPTIONS");
  assert.equal((await get.json()).transport, "streamable-http");

  const pre = await fetch(base, { method: "OPTIONS" });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-origin"), "*");
});
