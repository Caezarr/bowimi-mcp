# Changelog

All notable changes to `bowimi-mcp` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

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
