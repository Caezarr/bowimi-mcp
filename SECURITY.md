# Security Policy

## Supported versions

Security fixes land on the latest `main` release of `bowimi-mcp`.

## Credentials

This MCP server talks to Bowimi with either:

1. **API key** (`BOWIMI_SUBDOMAIN` + `BOWIMI_API_KEY`) — preferred
2. **Email/password** (`BOWIMI_EMAIL` + `BOWIMI_PASSWORD`) — stores a session cookie in the MCP process

Rules of thumb:

- Prefer the API key path. Do not put email/password into a shared Claude Desktop config, a committed `.env`, or a CI secret that other jobs can read.
- Never log `BOWIMI_API_KEY`, passwords, or session cookies. If you add debug logging, redact Authorization headers and cookie jars.
- Treat tool arguments that accept free-text notes as potentially sensitive; do not echo them into public issue trackers.
- Rotate the Bowimi API key if it was pasted into chat, a screenshot, or a public gist.

## Reporting a vulnerability

Email **gabriel.rance@ensam.eu** with:

- affected version / commit
- reproduction steps
- impact (credential leak, unauthorized CRM writes, etc.)

Please do **not** open a public GitHub issue for credential or auth bugs.

We aim to acknowledge reports within 5 business days.
