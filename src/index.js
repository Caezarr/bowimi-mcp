#!/usr/bin/env node
/**
 * Entry point: reads configuration from the environment, wires auth + client,
 * and serves the MCP server over stdio.
 */
import { readFileSync } from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BowimiAuth } from "./auth.js";
import { BowimiClient } from "./client.js";
import { createServer } from "./server.js";

const LOCAL_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
).version;
const GITHUB_PKG_URL =
  "https://raw.githubusercontent.com/Caezarr/bowimi-mcp/main/package.json";

// Fire-and-forget update check — never blocks startup
fetch(GITHUB_PKG_URL)
  .then((r) => r.json())
  .then((pkg) => {
    if (pkg.version && pkg.version !== LOCAL_VERSION) {
      console.error(
        `[bowimi-mcp] Update available: ${LOCAL_VERSION} → ${pkg.version}. Run: git pull && npm install`
      );
    }
  })
  .catch(() => {}); // offline or rate-limited — silent

const EMAIL = process.env.BOWIMI_EMAIL;
const PASSWORD = process.env.BOWIMI_PASSWORD;
const SUBDOMAIN = process.env.BOWIMI_SUBDOMAIN;
const API_KEY = process.env.BOWIMI_API_KEY;

if (!SUBDOMAIN || (!API_KEY && (!EMAIL || !PASSWORD))) {
  console.error(
    "Required: BOWIMI_SUBDOMAIN + (BOWIMI_API_KEY or BOWIMI_EMAIL+BOWIMI_PASSWORD)"
  );
  process.exit(1);
}

const auth = new BowimiAuth({ email: EMAIL, password: PASSWORD, subdomain: SUBDOMAIN, apiKey: API_KEY });
const client = new BowimiClient(auth);
const server = createServer({ client, auth, version: LOCAL_VERSION });

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Bowimi MCP running (account: ${SUBDOMAIN})`);
