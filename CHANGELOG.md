# Changelog

All notable changes to `bowimi-mcp` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `llms.txt`: index of the docs, protocol and code for AI assistants and LLM crawlers ([llmstxt.org](https://llmstxt.org)).

### Fixed
- Server no longer crashes at startup with "Tool get_introductions is already registered"; the superseded listing-based variant was removed and the documented survey-based `get_introductions` kept.
- Reported server version and update check now read the version from `package.json` (was hard-coded to 1.5.1).

### Changed
- `src/index.js` split into `server.js`, `tools/<domain>.js`, `schemas.js`, `result.js` and `errors.js`. Tool names, descriptions, inputs and outputs are unchanged.
- CI now runs the test suite and a `tsc --checkJs` type check.

## [1.6.1] — 2026-09-02

### Changed
- Documentation and package metadata polish for clearer install and auth guidance.

## [1.6.0] — 2026-08

### Added
- MCP tools for routes, locations, contacts, orders, products, companies, tasks, visits, and insights.
- Dual auth: API key (`BOWIMI_SUBDOMAIN` + `BOWIMI_API_KEY`) or email/password session.
- `SECURITY.md` with credential handling rules and private vulnerability reporting.

### Known limitations
- `location/map` and `activity` Bowimi endpoints still return server errors; prefer `get_route`, `get_location`, `get_visit_summary`, and `get_insights`.

## [1.0.0] — 2026

### Added
- Initial public MCP server for Bowimi field sales CRM.
