// Web-standard request handler for the MCP endpoint (Streamable HTTP, stateless, JSON responses).
// Each POST gets a fresh server and transport, so nothing is shared between requests.
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./server.mjs";

// Public, read-only, no auth: any origin may call it.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

const withCors = (res) => {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};

export function createHandler(getContent) {
  return async function handle(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (request.method !== "POST") {
      // Stateless server: no standalone SSE stream and no sessions to delete.
      return withCors(
        Response.json(
          {
            name: "nikolovski-lab",
            transport: "streamable-http",
            message: "This is an MCP server. Add it to your agent; it speaks JSON-RPC over POST.",
            docs: "https://nikolovski.ai/toolkit/#mcp",
          },
          { status: 405, headers: { Allow: "POST, OPTIONS" } },
        ),
      );
    }

    const server = createServer(getContent());
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: 64 * 1024,
    });
    try {
      await server.connect(transport);
      return withCors(await transport.handleRequest(request));
    } catch (e) {
      console.error("mcp handler error", e);
      return withCors(
        Response.json(
          { jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null },
          { status: 500 },
        ),
      );
    } finally {
      // JSON responses are fully built by now, so closing here is safe.
      await transport.close().catch(() => {});
      await server.close().catch(() => {});
    }
  };
}
