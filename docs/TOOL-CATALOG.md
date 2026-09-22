# Bowimi MCP — tool catalog (operator view)

High-level map of tools exposed by `src/index.js` so operators know what Claude can touch. Not a substitute for reading the source when adding tools.

## Read / overview

- `get_app_info`, `get_current_user`, `list_users`, `query_users`
- `get_team_overview`, `get_activity`, `get_insights`, `get_weekly_report`
- `list_shortcuts`

## Locations & routes

- `list_locations`, `get_location`, `get_location_full_profile`, `create_location`, `update_location`, `delete_location`
- `get_location_tags`, `get_location_products`, `get_location_contacts`, `get_location_task_status`
- `get_route`, `get_route_summary`, `get_route_stops_with_tasks`, `find_route_stops_by_tag`
- `get_visit_summary`, `get_visit_counts`, `get_introductions`

## Tasks, orders, products

- Tasks: `list_tasks`, `get_task_summary`, `create_task`, `update_task`, `delete_task`
- Orders: `get_orders`, `query_orders`, `get_order_summary`, `create_order`, `update_order`, `delete_order`
- Products: `list_products`, `query_products`, `get_product_details`, `create_product`, `update_product`

## CRM-ish entities

- Companies / contacts: `list_companies`, `create_company`, `get_contacts`, `create_or_update_contact`
- Tags: `list_tags`, `query_tags`, `create_tag`, `update_tag`, `delete_tag` + tag groups CRUD
- Surveys: `list_surveys`, `query_surveys`, `get_survey`, `get_survey_response`, `list_survey_responses`
- Teams / roles / attributes: query + CRUD helpers under `query_*` / `create_*` / `update_*` / `delete_*`

## Write caution

Destructive tools (`delete_*`, user invite/update) should only run with explicit operator intent. Prefer read tools when debugging auth (see Zod 3 vs 4 spike in #15).

## Keeping this file honest

When adding/removing a `server.tool(...)` in `src/index.js`, update this catalog in the same PR.
