/**
 * Test: MCP server wiring.
 *
 * Builds the real server around a mocked BowimiClient (no network) and talks
 * to it through an in-memory MCP client, so tool registration, input
 * validation, result shape and error mapping are covered end to end.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { BowimiApiError } from "../src/errors.js";

/** Snapshot of the public tool surface. Update deliberately when adding tools. */
const EXPECTED_TOOLS = [
  "add_team_member", "create_company", "create_location", "create_or_update_contact",
  "create_order", "create_product", "create_role", "create_tag", "create_tag_group",
  "create_task", "create_team", "debug_api", "delete_company", "delete_location",
  "delete_order", "delete_product", "delete_role", "delete_tag", "delete_tag_group",
  "delete_task", "delete_team", "delete_user", "find_route_stops_by_tag", "get_activity",
  "get_app_info", "get_contacts", "get_current_user", "get_entity_attributes",
  "get_insights", "get_introductions", "get_location", "get_location_contacts",
  "get_location_full_profile", "get_location_products", "get_location_tags",
  "get_location_task_status", "get_order_summary", "get_orders", "get_product_details",
  "get_route", "get_route_stops_with_tasks", "get_route_summary", "get_survey",
  "get_survey_response", "get_task_summary", "get_team_members", "get_team_overview",
  "get_visit_counts", "get_visit_summary", "get_weekly_report", "invite_user",
  "list_companies", "list_locations", "list_products", "list_shortcuts",
  "list_survey_responses", "list_surveys", "list_tags", "list_tasks", "list_users",
  "query_attributes", "query_companies", "query_distribution_profiles",
  "query_entity_attributes", "query_orders", "query_product_cases", "query_products",
  "query_roles", "query_surveys", "query_tag_groups", "query_tags", "query_teams",
  "query_users", "remove_team_member", "set_entity_attributes", "update_company",
  "update_location", "update_order", "update_product", "update_role", "update_tag",
  "update_tag_group", "update_task", "update_team", "update_user",
];

/**
 * A stand-in BowimiClient: every method records its call and resolves to a
 * canned value, unless a per-method override is installed.
 */
function createMockClient() {
  const calls = [];
  const overrides = new Map();
  const target = { version: "v4.6.1" };
  const client = new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop];
      if (typeof prop !== "string") return undefined;
      return async (...args) => {
        calls.push({ method: prop, args });
        const impl = overrides.get(prop);
        return impl ? impl(...args) : { ok: true, method: prop };
      };
    },
  });
  return { client, calls, overrides };
}

describe("MCP server", () => {
  let mcp;
  let mock;

  before(async () => {
    mock = createMockClient();
    const auth = { apiBase: "https://test.invalid/_api", fetch: async () => { throw new Error("network disabled in tests"); } };
    const server = createServer({ client: mock.client, auth, version: "0.0.0-test" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcp = new Client({ name: "test", version: "0.0.0" });
    await Promise.all([server.connect(serverTransport), mcp.connect(clientTransport)]);
  });

  after(async () => {
    await mcp.close();
  });

  it("registers exactly the expected tools, each with a description and object schema", async () => {
    const { tools } = await mcp.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepStrictEqual(names, [...EXPECTED_TOOLS].sort());
    for (const tool of tools) {
      assert.ok(tool.description && tool.description.length > 10, `${tool.name} needs a description`);
      assert.strictEqual(tool.inputSchema.type, "object", `${tool.name} input schema`);
    }
  });

  it("returns client data as pretty-printed JSON text", async () => {
    mock.overrides.set("listUsers", async () => [{ userUuid: "u1", name: "Alice" }]);
    const res = await mcp.callTool({ name: "list_users", arguments: {} });
    assert.ok(!res.isError);
    assert.deepStrictEqual(res.content, [
      { type: "text", text: JSON.stringify([{ userUuid: "u1", name: "Alice" }], null, 2) },
    ]);
  });

  it("forwards validated arguments to the client", async () => {
    mock.calls.length = 0;
    await mcp.callTool({ name: "list_tags", arguments: { intent: "company" } });
    assert.deepStrictEqual(mock.calls, [{ method: "listTags", args: ["company"] }]);
  });

  it("rejects invalid arguments before reaching the client", async () => {
    mock.calls.length = 0;
    const res = await mcp.callTool({ name: "list_tags", arguments: { intent: "nope" } });
    assert.strictEqual(res.isError, true);
    assert.strictEqual(mock.calls.length, 0);
  });

  it("maps a Bowimi API error to an isError result carrying the API message", async () => {
    mock.overrides.set("getAppInfo", async () => {
      throw new BowimiApiError("app", 403, "Forbidden: Missing permission", "Forbidden");
    });
    const res = await mcp.callTool({ name: "get_app_info", arguments: {} });
    assert.strictEqual(res.isError, true);
    const text = res.content.map((c) => c.text).join("\n");
    assert.match(text, /Bowimi API app → 403: Forbidden: Missing permission/);
    assert.doesNotMatch(text, /\n\s+at /, "must not leak a stack trace");
  });
});
