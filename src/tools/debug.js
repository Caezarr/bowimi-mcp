import { z } from "zod";

/**
 * Raw API probe for exploration.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerDebugTools(server, { client, auth }) {
  server.tool(
    "debug_api",
    "Probe a raw Bowimi API endpoint for exploration. method: GET|POST|QUERY|LIST|PATCH. path: e.g. 'entity-visit'. body: optional JSON string.",
    {
      method: z.string().default("GET"),
      path: z.string(),
      body: z.string().optional(),
      params: z.record(z.string()).optional(),
    },
    async ({ method, path, body, params }) => {
      const base = `${auth.apiBase}/${client.version}`;
      const url = new URL(`${base}/${path}`);
      if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      const opts = { method: method.toUpperCase() };
      if (body) opts.body = body;
      let res;
      try {
        res = await auth.fetch(url.toString(), opts);
      } catch (e) {
        return { content: [{ type: "text", text: `Fetch error: ${e.message}` }] };
      }
      const text = await res.text();
      return { content: [{ type: "text", text: `HTTP ${res.status}\n${text.slice(0, 3000)}` }] };
    }
  );
}
