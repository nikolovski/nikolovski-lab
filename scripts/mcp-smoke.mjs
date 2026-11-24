#!/usr/bin/env node
// Smoke-tests a running MCP endpoint with the official MCP client.
// Usage: npm run mcp:smoke -- https://nikolovski.ai/mcp   (default: http://localhost:3333/mcp)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = new URL(process.argv[2] ?? "http://localhost:3333/mcp");
const client = new Client({ name: "nikolovski-lab-smoke", version: "1.0.0" });
const ok = (msg) => console.log(`ok   ${msg}`);
const fail = (msg) => {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
};
const parse = (res) => JSON.parse(res.content[0].text);

await client.connect(new StreamableHTTPClientTransport(url));
ok(`connected to ${url} (${client.getServerVersion()?.name} ${client.getServerVersion()?.version})`);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
const expected = ["get_lesson", "get_skill", "search_lessons", "search_skills"];
JSON.stringify(names) === JSON.stringify(expected) ? ok(`tools: ${names.join(", ")}`) : fail(`tools: ${names.join(", ")}`);

const all = parse(await client.callTool({ name: "search_skills", arguments: {} }));
all.count > 0 ? ok(`search_skills lists ${all.count} skill(s)`) : fail("search_skills returned no skills");

if (all.count > 0) {
  const first = all.results[0].name;
  const hit = parse(await client.callTool({ name: "search_skills", arguments: { query: first } }));
  hit.results[0]?.name === first ? ok(`search_skills "${first}" ranks it first`) : fail(`search_skills "${first}"`);
  const skill = await client.callTool({ name: "get_skill", arguments: { name: first } });
  !skill.isError && skill.content[0].text.startsWith("---") ? ok(`get_skill ${first} returns SKILL.md`) : fail(`get_skill ${first}`);
}

const missing = await client.callTool({ name: "get_skill", arguments: { name: "no-such-skill" } });
missing.isError ? ok("get_skill unknown name is an error") : fail("get_skill unknown name");

const lessons = parse(await client.callTool({ name: "search_lessons", arguments: {} }));
ok(`search_lessons lists ${lessons.count} published lesson(s)`);
if (lessons.count > 0) {
  const lesson = await client.callTool({ name: "get_lesson", arguments: { id: lessons.results[0].id } });
  !lesson.isError ? ok(`get_lesson ${lessons.results[0].id}`) : fail("get_lesson");
}

await client.close();
if (process.exitCode) console.error("\nsmoke test failed");
else console.log("\nsmoke test passed");
