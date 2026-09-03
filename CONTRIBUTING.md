# Contributing to bowimi-mcp

Thanks for helping improve the Bowimi MCP server.

## Setup

```bash
git clone https://github.com/Caezarr/bowimi-mcp
cd bowimi-mcp
npm install
```

Configure Claude Desktop (or another MCP host) with `BOWIMI_SUBDOMAIN` + `BOWIMI_API_KEY` as described in the README. Prefer the API key path over email/password.

## Development

- Server entry: `src/index.js`
- HTTP client: `src/client.js`
- Auth: `src/auth.js`

```bash
npm run dev   # node --watch
npm start
```

## Pull requests

1. Keep changes focused (one tool family or one auth/docs fix per PR).
2. Do not commit credentials, session cookies, or real Bowimi account data.
3. Update `CHANGELOG.md` under `[Unreleased]` when behavior changes.
4. Mention affected MCP tool names in the PR description.

## Security reports

Credential or auth bugs go to **gabriel.rance@ensam.eu** — see `SECURITY.md`. Do not file them as public issues.
