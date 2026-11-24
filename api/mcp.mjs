// Vercel Function behind https://nikolovski.ai/mcp (vercel.json rewrites /mcp here).
// skills/ and lessons/ ship with the function (vercel.json includeFiles), so the content
// is frozen at deploy time and indexed once per cold start. No database.
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../mcp/content.mjs";
import { createHandler } from "../mcp/handler.mjs";

function repoRoot() {
  const candidates = [process.cwd(), join(dirname(fileURLToPath(import.meta.url)), "..")];
  return candidates.find((p) => existsSync(join(p, "skills"))) ?? candidates[0];
}

let content;
const handle = createHandler(() => (content ??= loadContent(repoRoot())));

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = handle;
