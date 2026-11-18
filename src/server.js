/**
 * MCP server factory: builds a server with every Bowimi tool registered.
 *
 * Kept free of side effects (no env reads, no network, no transport) so tests
 * can build a server around a mocked client.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAccountTools } from "./tools/account.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerAttributesTools } from "./tools/attributes.js";
import { registerCompaniesTools } from "./tools/companies.js";
import { registerDebugTools } from "./tools/debug.js";
import { registerLocationsTools } from "./tools/locations.js";
import { registerOrdersTools } from "./tools/orders.js";
import { registerProductsTools } from "./tools/products.js";
import { registerRouteTools } from "./tools/route.js";
import { registerSurveysTools } from "./tools/surveys.js";
import { registerTagsTools } from "./tools/tags.js";
import { registerTasksTools } from "./tools/tasks.js";

/**
 * Dependencies handed to every tool module.
 *
 * @typedef {object} ToolContext
 * @property {import("./client.js").BowimiClient} client Bowimi API client.
 * @property {import("./auth.js").BowimiAuth} auth Authenticated fetch (used by `debug_api` only).
 */

/** Tool modules, registered in this order. */
export const toolModules = [
  registerAccountTools,
  registerTagsTools,
  registerAttributesTools,
  registerLocationsTools,
  registerCompaniesTools,
  registerTasksTools,
  registerOrdersTools,
  registerProductsTools,
  registerSurveysTools,
  registerRouteTools,
  registerAnalyticsTools,
  registerDebugTools,
];

/**
 * @param {ToolContext & { version: string }} options
 * @returns {McpServer}
 */
export function createServer({ client, auth, version }) {
  const server = new McpServer({ name: "bowimi", version });
  for (const register of toolModules) register(server, { client, auth });
  return server;
}
