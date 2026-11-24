// The Nikolovski Lab MCP server: four read-only tools over the repo's skills and lessons.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchSkills, searchLessons, findSkill, findLesson, readSkillFile, SITE_URL } from "./content.mjs";

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const text = (t) => ({ type: "text", text: t });
const json = (v) => text(JSON.stringify(v, null, 2));
const notFound = (msg) => ({ isError: true, content: [text(msg)] });

const query = z
  .string()
  .max(200)
  .optional()
  .describe("Keywords to match. Leave empty to list everything.");
const limit = z.number().int().min(1).max(50).optional().describe("Most results to return (default 10, max 50).");

export function createServer(content) {
  const server = new McpServer(
    { name: "nikolovski-lab", title: "Nikolovski Lab", version: "1.0.0", websiteUrl: SITE_URL },
    {
      instructions:
        "Skills and lessons from Nikolovski Lab (nikolovski.ai). Use search_skills to find an Agent Skill, " +
        "then get_skill to fetch its SKILL.md; save it as <skills folder>/<name>/SKILL.md to install it. " +
        "Use search_lessons and get_lesson for the write-ups behind each skill.",
    },
  );

  server.registerTool(
    "search_skills",
    {
      title: "Search skills",
      description:
        "Search Nikolovski Lab's Agent Skills (SKILL.md files) by keyword. Returns name, description and a snippet for each match. An empty query lists every skill.",
      inputSchema: { query, limit },
      annotations: readOnly,
    },
    async ({ query, limit }) => {
      const results = searchSkills(content, query, limit);
      return { content: [json({ count: results.length, results })] };
    },
  );

  server.registerTool(
    "get_skill",
    {
      title: "Get skill",
      description:
        "Fetch one skill's full SKILL.md by name (from search_skills). Pass `file` to fetch one of the skill's supporting files instead.",
      inputSchema: {
        name: z.string().min(1).max(64).describe("Skill name, for example architecture-review."),
        file: z.string().max(200).optional().describe("Path of a supporting file inside the skill folder, as listed by get_skill."),
      },
      annotations: readOnly,
    },
    async ({ name, file }) => {
      const skill = findSkill(content, name);
      if (!skill) {
        const names = content.skills.map((s) => s.name).join(", ") || "none";
        return notFound(`No skill named "${name}". Available skills: ${names}.`);
      }
      if (file && file !== "SKILL.md") {
        const body = readSkillFile(skill, file);
        if (body === undefined) {
          return notFound(`"${file}" is not a file of skill "${skill.name}". Its files: ${["SKILL.md", ...skill.files].join(", ")}.`);
        }
        return { content: [text(body)] };
      }
      const about = [
        `Skill: ${skill.name}`,
        `Install: save the SKILL.md above as <your skills folder>/${skill.name}/SKILL.md (Claude Code: ~/.claude/skills/${skill.name}/SKILL.md).`,
        skill.files.length
          ? `Supporting files (fetch each with get_skill and file=<path>, save next to SKILL.md): ${skill.files.join(", ")}`
          : "Supporting files: none.",
        `Source: ${skill.source}`,
      ].join("\n");
      return { content: [text(skill.text), text(about)] };
    },
  );

  server.registerTool(
    "search_lessons",
    {
      title: "Search lessons",
      description:
        "Search Nikolovski Lab's published lessons (dated write-ups, each tied to the skill it produced) by keyword. An empty query lists every published lesson, newest first.",
      inputSchema: { query, limit },
      annotations: readOnly,
    },
    async ({ query, limit }) => {
      const results = searchLessons(content, query, limit);
      return { content: [json({ count: results.length, results })] };
    },
  );

  server.registerTool(
    "get_lesson",
    {
      title: "Get lesson",
      description: "Fetch one published lesson in full by its id (from search_lessons), for example 2026-11-23-architecture-review.",
      inputSchema: {
        id: z.string().min(1).max(120).describe("Lesson id: the file name without .md. The slug without its date also works."),
      },
      annotations: readOnly,
    },
    async ({ id }) => {
      const lesson = findLesson(content, id);
      if (!lesson) return notFound(`No published lesson with id "${id}". Use search_lessons to list them.`);
      const head = [
        `# ${lesson.title}`,
        "",
        `Date: ${lesson.date}`,
        lesson.skill ? `Skill: ${lesson.skill} (get it with get_skill)` : null,
        lesson.tags.length ? `Tags: ${lesson.tags.join(", ")}` : null,
        `URL: ${lesson.url}`,
        "",
        lesson.summary,
        "",
      ].filter((l) => l !== null);
      return { content: [text(`${head.join("\n")}\n${lesson.body}\n`)] };
    },
  );

  return server;
}
