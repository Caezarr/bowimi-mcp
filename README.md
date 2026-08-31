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

### Account & users
| Tool | Description |
|------|-------------|
| `get_app_info` | Account info, brand details, permission keys |
| `list_users` | All users in the account |
| `get_current_user` | Currently authenticated user |
| `invite_user` | Invite a new user (requires email + roleUuid) |

### Tags & surveys
| Tool | Description |
|------|-------------|
| `list_tags` | All tag groups and tags (filter: `location` or `company`) |
| `create_tag` | Create a tag in an existing group |
| `list_surveys` | All surveys and their questions |

### Locations (entities)
| Tool | Description |
|------|-------------|
| `get_location` | Full details for one or more locations by UUID |
| `get_location_tags` | Tags assigned to locations |
| `get_location_products` | Products listed at locations |
| `get_location_contacts` | All contacts for a location |
| `create_location` | Create a new location/outlet |

### Route
| Tool | Description |
|------|-------------|
| `get_route` | Current user's planned stops (My Route) with names, addresses, coordinates, last contacted date |

### Tasks
| Tool | Description |
|------|-------------|
| `get_task_summary` | Task counts: available, overdue, today |
| `create_task` | Create a new task (optionally linked to a location) |

### Orders
| Tool | Description |
|------|-------------|
| `get_order_summary` | Order totals: last month, this month, this week |
| `get_orders` | Full order details by UUID |
| `create_order` | Place a new order |

### Products
| Tool | Description |
|------|-------------|
| `list_products` | All products |
| `get_product_details` | Full product details by UUID |
| `create_product` | Create a new product |

### Companies
| Tool | Description |
|------|-------------|
| `list_companies` | All company/RTM UUIDs |
| `create_company` | Create a new company/RTM |

### Contacts
| Tool | Description |
|------|-------------|
| `get_contacts` | Contact details by UUID |
| `create_or_update_contact` | Create or update a contact on a location or company |

### Activity & insights
| Tool | Description |
|------|-------------|
| `get_visit_summary` | Today's visit summary: done/missed yesterday, remaining today |
| `get_insights` | Combined dashboard: visits + tasks + orders |
| `list_shortcuts` | Saved location shortcuts (pre-filtered views) |

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

## License

MIT. See [LICENSE](./LICENSE).
