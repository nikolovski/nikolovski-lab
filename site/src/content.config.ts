// Content lives at the repo root, one level above site/. Git is the source of truth.
// Skills and agents live in the main plugin's folder, their only home (see plugins/README.md).
import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const skills = defineCollection({
  loader: glob({
    pattern: "*/SKILL.md",
    base: "../plugins/nikolovski-lab/skills",
    generateId: ({ entry }) => entry.split("/")[0],
  }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
  }),
});

const agents = defineCollection({
  loader: glob({ pattern: ["*.md", "!README.md", "!_*.md"], base: "../plugins/nikolovski-lab/agents" }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    tools: z.union([z.string(), z.array(z.string())]).optional(),
    model: z.string().optional(),
  }),
});

const lessons = defineCollection({
  loader: glob({ pattern: ["*.md", "!_*.md", "!README.md"], base: "../lessons" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    skill: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const resources = defineCollection({
  loader: file("../resources/resources.yaml"),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    url: z.string().url(),
    category: z.string(),
    why: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

// One folder per skill: demos/<skill>/demo.md (metadata and "what changed"),
// plus task.md, without.md and with.md (plain Markdown, no frontmatter).
const demos = defineCollection({
  loader: glob({
    pattern: "*/demo.md",
    base: "../demos",
    generateId: ({ entry }) => entry.split("/")[0],
  }),
  schema: z.object({
    skill: z.string(),
    title: z.string(),
    summary: z.string(),
    generated: z.coerce.date(),
    generated_by: z.string(),
    setup: z.string(),
  }),
});

const demoParts = defineCollection({
  loader: glob({
    pattern: "*/{task,without,with}.md",
    base: "../demos",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
});

export const collections = { skills, agents, lessons, resources, demos, demoParts };
