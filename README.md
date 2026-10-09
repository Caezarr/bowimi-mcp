# bowimi-mcp

MCP server for [Bowimi](https://bowimi.com) — the field sales CRM. Connect Claude to your Bowimi account to query routes, locations, contacts, orders, products, and more.

## Setup

### 1. Get your API key

In Bowimi: **Settings → Integrations → Zapier → API Key**

The key format is `subdomain:longkey`.

### 2. Install

```bash
git clone https://github.com/Caezarr/bowimi-mcp
cd bowimi-mcp
npm install
```

### 3. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Restart Claude Desktop. The Bowimi tools will appear.

### Alternative: email/password auth

Prefer the API key. Email/password stores a reusable session cookie in the MCP process — use it only on a machine you control, never in a shared config file.

```json
"env": {
  "BOWIMI_SUBDOMAIN": "yoursubdomain",
  "BOWIMI_EMAIL": "you@company.com",
  "BOWIMI_PASSWORD": "yourpassword"
}
```

## Available tools

> **Credential handling:** All tools require authentication. See [SECURITY.md](./SECURITY.md) for best practices on managing API keys and credentials.

### Complete MCP tools catalog

| Tool | Purpose | Required env | Example arg |
|------|---------|--------------|-------------|
| `get_app_info` | Account info, brand details, permission keys | `BOWIMI_SUBDOMAIN` + auth | — |
| `list_users` | All users in the account | `BOWIMI_SUBDOMAIN` + auth | — |
| `get_current_user` | Currently authenticated user | `BOWIMI_SUBDOMAIN` + auth | — |
| `invite_user` | Invite a new user | `BOWIMI_SUBDOMAIN` + auth | `{"email": "rep@company.com", "roleUuid": "abc-123"}` |
| `list_tags` | Tag groups and tags | `BOWIMI_SUBDOMAIN` + auth | `{"intent": "location"}` |
| `create_tag` | Create a tag in a group | `BOWIMI_SUBDOMAIN` + auth | `{"name": "New Tag", "tagGroupUuid": "abc-123"}` |
| `list_surveys` | All surveys and questions | `BOWIMI_SUBDOMAIN` + auth | — |
| `get_location` | Full location details by UUID | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuids": ["abc-123"]}` |
| `get_location_tags` | Tags assigned to locations | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuids": ["abc-123"]}` |
| `get_location_products` | Products at locations | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuids": ["abc-123"]}` |
| `create_location` | Create a new location/outlet | `BOWIMI_SUBDOMAIN` + auth | `{"name": "Cafe", "address": "Main St", "coordinates": {"lat": 50.8, "lng": 4.3}}` |
| `get_task_summary` | Task counts by status | `BOWIMI_SUBDOMAIN` + auth | — |
| `create_task` | Create a task | `BOWIMI_SUBDOMAIN` + auth | `{"title": "Follow up", "entityUuid": "abc-123"}` |
| `get_order_summary` | Order totals by period | `BOWIMI_SUBDOMAIN` + auth | — |
| `get_orders` | Order details by UUID | `BOWIMI_SUBDOMAIN` + auth | `{"orderUuids": ["abc-123"]}` |
| `create_order` | Place a new order | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123", "profileUuid": "def-456", "origin": "field-sales", "items": [{"productUuid": "p1", "quantity": 10}]}` |
| `list_products` | All products | `BOWIMI_SUBDOMAIN` + auth | — |
| `get_product_details` | Product details by UUID | `BOWIMI_SUBDOMAIN` + auth | `{"productUuids": ["abc-123"]}` |
| `create_product` | Create a product | `BOWIMI_SUBDOMAIN` + auth | `{"name": "Widget", "sku": "W-001"}` |
| `list_companies` | Company/RTM UUIDs | `BOWIMI_SUBDOMAIN` + auth | — |
| `create_company` | Create a company/RTM | `BOWIMI_SUBDOMAIN` + auth | `{"name": "Acme Corp"}` |
| `get_contacts` | Contact details by UUID | `BOWIMI_SUBDOMAIN` + auth | `{"contactUuids": ["abc-123"]}` |
| `create_or_update_contact` | Create/update contact | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123", "name": "John Doe", "email": "john@company.com"}` |
| `get_visit_summary` | Today's visit summary | `BOWIMI_SUBDOMAIN` + auth | — |
| `get_route` | Current user's planned stops | `BOWIMI_SUBDOMAIN` + auth | `{"includeDetails": true, "notVisitedSince": "2026-07-01"}` |
| `get_location_contacts` | Contacts for a location | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123"}` |
| `get_location_task_status` | Task status per location | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuids": ["abc-123"]}` |
| `get_insights` | Combined visits/tasks/orders | `BOWIMI_SUBDOMAIN` + auth | `{"userUuid": "abc-123"}` |
| `list_shortcuts` | Saved location shortcuts | `BOWIMI_SUBDOMAIN` + auth | — |
| `get_location_full_profile` | Complete location profile | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123"}` |
| `get_route_summary` | Fast route overview | `BOWIMI_SUBDOMAIN` + auth | — |
| `get_route_stops_with_tasks` | Route stops with pending tasks | `BOWIMI_SUBDOMAIN` + auth | `{"includeCompleted": false}` |
| `find_route_stops_by_tag` | Find stops by tag | `BOWIMI_SUBDOMAIN` + auth | `{"tagName": "horeca"}` |
| `get_team_overview` | Task/order stats per rep | `BOWIMI_SUBDOMAIN` + auth | — |
| `get_visit_counts` | Visit counts by period | `BOWIMI_SUBDOMAIN` + auth | `{"period": "this_week"}` |
| `get_introductions` | Product introductions | `BOWIMI_SUBDOMAIN` + auth | `{"from": "2026-07-01", "to": "2026-07-31"}` |
| `get_weekly_report` | Full weekly recap | `BOWIMI_SUBDOMAIN` + auth | `{"weeksAgo": 0}` |
| `get_activity` | Activity feed (visits/surveys) | `BOWIMI_SUBDOMAIN` + auth | `{"type": "survey", "from": "2026-07-01"}` |
| `get_survey` | Survey definition | `BOWIMI_SUBDOMAIN` + auth | `{"surveyUuid": "abc-123"}` |
| `get_survey_response` | Survey response answers | `BOWIMI_SUBDOMAIN` + auth | `{"responseUuid": "abc-123"}` |
| `list_survey_responses` | Survey responses with filters | `BOWIMI_SUBDOMAIN` + auth | `{"surveyUuids": ["abc-123"], "limit": 50}` |
| `list_locations` | Locations with search | `BOWIMI_SUBDOMAIN` + auth | `{"searchTerm": "cafe", "limit": 50}` |
| `list_tasks` | Tasks with filters | `BOWIMI_SUBDOMAIN` + auth | `{"resolved": false, "limit": 50}` |
| `query_users` | Users with pagination | `BOWIMI_SUBDOMAIN` + auth | `{"limit": 50}` |
| `update_user` | Update user properties | `BOWIMI_SUBDOMAIN` + auth | `{"userUuid": "abc-123", "name": "New Name"}` |
| `delete_user` | Delete a user | `BOWIMI_SUBDOMAIN` + auth | `{"userUuid": "abc-123"}` |
| `query_tags` | Tags with pagination | `BOWIMI_SUBDOMAIN` + auth | `{"limit": 100}` |
| `update_tag` | Update tag properties | `BOWIMI_SUBDOMAIN` + auth | `{"tagUuid": "abc-123", "name": "Updated"}` |
| `delete_tag` | Delete a tag | `BOWIMI_SUBDOMAIN` + auth | `{"tagUuid": "abc-123"}` |
| `query_tag_groups` | Tag groups list | `BOWIMI_SUBDOMAIN` + auth | `{"limit": 100}` |
| `create_tag_group` | Create tag group | `BOWIMI_SUBDOMAIN` + auth | `{"name": "New Group"}` |
| `update_tag_group` | Update tag group | `BOWIMI_SUBDOMAIN` + auth | `{"tagGroupUuid": "abc-123", "name": "Updated"}` |
| `delete_tag_group` | Delete tag group | `BOWIMI_SUBDOMAIN` + auth | `{"tagGroupUuid": "abc-123"}` |
| `query_roles` | Roles with permissions | `BOWIMI_SUBDOMAIN` + auth | `{"limit": 100}` |
| `create_role` | Create a role | `BOWIMI_SUBDOMAIN` + auth | `{"name": "Sales Rep", "permissionKeys": ["read"]}` |
| `update_role` | Update role | `BOWIMI_SUBDOMAIN` + auth | `{"roleUuid": "abc-123", "name": "Updated"}` |
| `delete_role` | Delete a role | `BOWIMI_SUBDOMAIN` + auth | `{"roleUuid": "abc-123"}` |
| `query_teams` | Teams list | `BOWIMI_SUBDOMAIN` + auth | `{"limit": 100}` |
| `create_team` | Create a team | `BOWIMI_SUBDOMAIN` + auth | `{"name": "North Region"}` |
| `update_team` | Update team | `BOWIMI_SUBDOMAIN` + auth | `{"teamUuid": "abc-123", "name": "Updated"}` |
| `delete_team` | Delete a team | `BOWIMI_SUBDOMAIN` + auth | `{"teamUuid": "abc-123"}` |
| `get_team_members` | Team members | `BOWIMI_SUBDOMAIN` + auth | `{"teamUuid": "abc-123"}` |
| `add_team_member` | Add user to team | `BOWIMI_SUBDOMAIN` + auth | `{"teamUuid": "abc-123", "userUuid": "def-456"}` |
| `remove_team_member` | Remove user from team | `BOWIMI_SUBDOMAIN` + auth | `{"teamUuid": "abc-123", "userUuid": "def-456"}` |
| `query_attributes` | Custom attribute definitions | `BOWIMI_SUBDOMAIN` + auth | `{"limit": 100}` |
| `get_entity_attributes` | Attribute values for entity | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123"}` |
| `set_entity_attributes` | Set entity attributes | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123", "attributes": [{"attributeUuid": "a1", "data": "value"}]}` |
| `query_entity_attributes` | Query attributes across entities | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuids": ["abc-123"]}` |
| `query_distribution_profiles` | Distribution profiles | `BOWIMI_SUBDOMAIN` + auth | `{"limit": 100}` |
| `query_surveys` | Surveys with pagination | `BOWIMI_SUBDOMAIN` + auth | `{"limit": 100}` |
| `update_location` | Update location properties | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123", "name": "Updated"}` |
| `delete_location` | Delete a location | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123"}` |
| `update_task` | Update task | `BOWIMI_SUBDOMAIN` + auth | `{"taskUuid": "abc-123", "status": "resolved"}` |
| `delete_task` | Delete a task | `BOWIMI_SUBDOMAIN` + auth | `{"taskUuid": "abc-123"}` |
| `query_orders` | Orders with filters | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuids": ["abc-123"], "limit": 50}` |
| `update_order` | Update order status | `BOWIMI_SUBDOMAIN` + auth | `{"orderUuid": "abc-123", "brandStatus": "confirmed"}` |
| `delete_order` | Delete an order | `BOWIMI_SUBDOMAIN` + auth | `{"orderUuid": "abc-123"}` |
| `query_products` | Products with search | `BOWIMI_SUBDOMAIN` + auth | `{"searchTerm": "widget", "limit": 100}` |
| `update_product` | Update product | `BOWIMI_SUBDOMAIN` + auth | `{"productUuid": "abc-123", "name": "Updated"}` |
| `delete_product` | Delete a product | `BOWIMI_SUBDOMAIN` + auth | `{"productUuid": "abc-123"}` |
| `query_product_cases` | Product cases (pack sizes) | `BOWIMI_SUBDOMAIN` + auth | `{"productUuids": ["abc-123"]}` |
| `query_companies` | Companies with search | `BOWIMI_SUBDOMAIN` + auth | `{"searchTerm": "acme", "limit": 50}` |
| `update_company` | Update company | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123", "name": "Updated"}` |
| `delete_company` | Delete a company | `BOWIMI_SUBDOMAIN` + auth | `{"entityUuid": "abc-123"}` |
| `debug_api` | Probe raw Bowimi endpoint | `BOWIMI_SUBDOMAIN` + auth | `{"method": "GET", "path": "entity-visit"}` |

**Auth options:** `BOWIMI_API_KEY` (preferred) or `BOWIMI_EMAIL` + `BOWIMI_PASSWORD`

## Example prompts

- *"Show me my route for today"*
- *"Which stops haven't been visited in 90+ days?"*
- *"What are the task and order counts this week?"*
- *"Get the contacts for location UUID abc-123"*
- *"List all products and their UUIDs"*

## Architecture

```
src/
  index.js   — MCP server (tool definitions)
  client.js  — Bowimi API client (HTTP methods)
  auth.js    — Auth: API key or email/password session
```

**API base:** `https://{subdomain}.bowimi.com/_api/v4.6.1/`

Bowimi uses non-standard HTTP methods: `QUERY` (read with body) and `LIST` in addition to standard `GET/POST/PATCH/DELETE`.

## Known limitations

- **Location search** (`location/map` endpoint) returns a server error — use `get_route` to get your assigned stops, then `get_location` with specific UUIDs. Tracked in #1.
- **Activity feed** (`activity` endpoint) returns a server error — use `get_visit_summary` and `get_insights` instead. Tracked in #1.
- **Task listing** requires task UUIDs (no filter-based list) — use `get_task_summary` for counts.
- **Roles** endpoint requires admin permissions — not available with field-sales API keys.

## Community

- **Support**: [SUPPORT.md](./SUPPORT.md) — Bug reports and getting help
- **Code of Conduct**: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — Contributor Covenant 2.1
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md) — Guidelines for contributors
- **Security**: [SECURITY.md](./SECURITY.md) — Security policy and vulnerability reporting
- **Funding**: [.github/FUNDING.yml](./.github/FUNDING.yml) — Support this project
- **Tool Reference**: [docs/TOOLS.md](./docs/TOOLS.md) — Complete MCP tools catalog ([operator view](./docs/TOOL-CATALOG.md))

## License

MIT. See [LICENSE](./LICENSE).
