#!/usr/bin/env node
// Runs the MCP endpoint locally at http://localhost:3333/mcp, with the same handler Vercel runs.
// Usage: npm run mcp:dev  (PORT=4000 npm run mcp:dev to change the port)
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../mcp/content.mjs";
import { createHandler } from "../mcp/handler.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Starts a local HTTP server for the MCP handler. Resolves to the node http.Server once listening. */
export function serve({ port = 3333, root = repoRoot } = {}) {
  const content = loadContent(root);
  const handle = createHandler(() => content);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname !== "/mcp" && url.pathname !== "/mcp/") {
      res.writeHead(404).end("Not found. The MCP endpoint is /mcp.\n");
      return;
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    const request = new Request(url, {
      method: req.method,
      headers,
      body: chunks.length && req.method !== "GET" && req.method !== "HEAD" ? Buffer.concat(chunks) : undefined,
    });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3333);
  await serve({ port });
  console.log(`MCP server at http://localhost:${port}/mcp`);
}
