# bowimi-mcp

[![CI](https://github.com/Caezarr/bowimi-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Caezarr/bowimi-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An MCP server that lets Claude (or any MCP host) query and update the [Bowimi](https://bowimi.com) field-sales CRM in plain language: routes, locations, contacts, orders, products, tasks, surveys and team reports, exposed as 85 tools.

## The problem

Field-sales teams keep their route plans, points of sale, orders and visit history in a CRM built for forms and dashboards, not questions. A rep who wants "which stops on my route haven't been visited in 90 days, and what did they last order?" has to click through several screens, and a manager who wants a weekly recap per rep exports to a spreadsheet. Generic AI assistants cannot help because they have no access to that data. Bowimi has an API, but it uses non-standard HTTP verbs (`QUERY`, `LIST`) and a response envelope that a model cannot call reliably on its own.

## How it solves it

`bowimi-mcp` is a thin, stateless stdio adapter between an MCP host and the Bowimi API. Each tool call maps to one or a few Bowimi requests and returns JSON to the model.

- **One tool per CRM action, typed.** Every tool has a description written for the model and a zod input schema, so bad arguments are rejected before any HTTP call.
- **Composite tools for real questions.** Besides 1:1 endpoint tools, some combine calls into answers reps and managers ask for: `get_weekly_report`, `get_team_overview`, `get_route_stops_with_tasks`, `get_location_full_profile`. One failing rep does not fail a team report.
- **The API's quirks live in one client.** `BowimiClient` wraps the `QUERY` and `LIST` verbs and unwraps the `{ Data }` envelope; errors become `Bowimi API <path> → <status>: <ErrorType>: <Message>` so the model sees what went wrong, never a stack trace.
- **Testable without an account.** `createServer()` takes the client as a parameter, so the test suite drives the real MCP server against a mocked client with the network disabled.
- **API key first.** A static Bearer key is preferred; email and password session login is supported for accounts without one.

```text
MCP host (Claude Desktop, ...) --stdio/JSON-RPC--> index.js -> server.js -> tools/*.js -> BowimiClient --HTTPS--> {subdomain}.bowimi.com/_api/v4.6.1
```

Module map, error handling and how to add a tool: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Try it

Requires Node.js 18+.

### Offline, no Bowimi account (about 2 minutes)

```bash
git clone https://github.com/Caezarr/bowimi-mcp && cd bowimi-mcp
npm ci
npm test
```

Expected output (excerpt):

```text
# tests 21
# pass 21
# fail 0
```

List the tools the server exposes with the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) CLI. Dummy credentials are enough: the server only contacts Bowimi when a tool is called.

```bash
npx -y @modelcontextprotocol/inspector@0.17.2 --cli node src/index.js \
  -e BOWIMI_SUBDOMAIN=demo -e BOWIMI_API_KEY=demo:offline \
  --method tools/list 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).tools;console.log(t.length+" tools");console.log(t.slice(0,4).map(x=>x.name).join("\n")+"\n...")})'
```

```text
85 tools
get_app_info
list_users
get_current_user
invite_user
...
```

Drop the final pipe to see every tool's description and JSON input schema. Without credentials the server refuses to start:

```bash
node src/index.js
# Required: BOWIMI_SUBDOMAIN + (BOWIMI_API_KEY or BOWIMI_EMAIL+BOWIMI_PASSWORD)   (exit 1)
```

### With a real Bowimi account

1. In Bowimi, get an API key: **Settings → Integrations → Zapier → API Key**. Its format is `subdomain:longkey`.
2. Add the server to Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "bowimi": {
      "command": "node",
      "args": ["/absolute/path/to/bowimi-mcp/src/index.js"],
      "env": {
        "BOWIMI_SUBDOMAIN": "yoursubdomain",
        "BOWIMI_API_KEY": "yoursubdomain:yourapikey"
      }
    }
  }
}
```

3. Restart Claude Desktop and ask, for example:

| Prompt | Tools the model typically uses |
|---|---|
| "Show me my route for today" | `get_route`, `get_route_summary` |
| "Which stops haven't been visited since July?" | `get_route` with `notVisitedSince` |
| "Task and order counts this week" | `get_task_summary`, `get_order_summary` |
| "Weekly team performance" | `get_weekly_report`, `get_team_overview` |

Email and password (`BOWIMI_EMAIL`, `BOWIMI_PASSWORD`) also work in place of the API key; the server then holds a session cookie in memory, so use it only on a machine you control. See [SECURITY.md](SECURITY.md).

## How it works

1. `src/index.js` reads the `BOWIMI_*` variables, builds the auth and client, and serves over stdio. It is the only module with side effects.
2. `src/server.js` creates the `McpServer` and calls each domain module's `register*Tools`: account, tags, attributes, locations, companies, tasks, orders, products, surveys, route, analytics, debug.
3. Each tool validates its input with zod, calls `BowimiClient`, and returns pretty-printed JSON via `jsonResult()`.
4. `BowimiClient` (`src/client.js`) has one method per endpoint and handles `QUERY` and `LIST` alongside `GET/POST/PATCH/DELETE`.
5. Non-2xx responses become a `BowimiApiError`; the MCP SDK turns it into a tool result with `isError: true`.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Full tool reference with schemas: [docs/TOOLS.md](docs/TOOLS.md) and [docs/TOOL-CATALOG.md](docs/TOOL-CATALOG.md).

## Proof

- `npm test`: 21 `node:test` cases, no network. `test/server.test.js` builds the real server around a mocked client and checks that exactly the expected 85 tools are registered, each with a description and object schema; that arguments are validated before reaching the client; and that API errors come back as `isError` results carrying Bowimi's message. Other suites cover the `QUERY` and `LIST` request contracts with a mocked `fetch`, error-envelope parsing and success-body unwrapping.
- `npm run typecheck`: `tsc --checkJs` over the JSDoc types.
- [CI](.github/workflows/ci.yml) runs a syntax check, the type check and the tests on every pull request.

## Limits and status

- Nothing in this repository proves behaviour against the live Bowimi API: tests use mocks, and the commands above were verified offline only. Use a test account first.
- 34 of the 85 tools write (create, update, delete, invite, set, add, remove), and `debug_api` sends a raw request to any Bowimi endpoint. There is no read-only mode; the API key's own permissions are the only limit, and the MCP host's tool approval is your safeguard.
- Bowimi's `location/map` and `activity` endpoints returned server errors when last tested, which affects `get_activity` ([issue #1](https://github.com/Caezarr/bowimi-mcp/issues/1), open). Prefer `get_route`, `get_location`, `get_visit_summary` and `get_insights`.
- Role management needs admin permissions and is not available with field-sales API keys.
- On startup the server makes one request to `raw.githubusercontent.com` to check for a newer version; it fails silently offline.
- Not published to npm: run from a clone.

## Development

```bash
npm ci
npm test            # node:test, no network
npm run typecheck   # tsc over JSDoc types
npm run check       # both
npm run dev         # node --watch src/index.js (needs BOWIMI_* env)
```

To add a tool, follow the four steps in [docs/ARCHITECTURE.md#adding-a-tool](docs/ARCHITECTURE.md#adding-a-tool).

See [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), [SECURITY.md](SECURITY.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
