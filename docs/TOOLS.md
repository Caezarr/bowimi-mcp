# MCP Tools Reference

Complete list of tools exposed by the Bowimi MCP server. Use this for agent/host discovery.

## Account & Users

- `get_app_info` — Get Bowimi account info: brand details and permission keys
- `list_users` — List all users in the Bowimi account
- `get_current_user` — Get the currently authenticated user
- `invite_user` — Invite a new user to the Bowimi account
- `query_users` — List all users with pagination
- `update_user` — Update a user's properties (name, friendlyName, roleUuids, enabled)
- `delete_user` — Delete a user by UUID

## Tags

- `list_tags` — List tag groups and their tags. Filter by intent: 'location', 'company', or omit for all
- `create_tag` — Create a new tag within an existing tag group
- `query_tags` — List all tags with pagination
- `update_tag` — Update a tag (name, colour, tagGroupUuid)
- `delete_tag` — Delete a tag by UUID

## Tag Groups

- `query_tag_groups` — List all tag groups
- `create_tag_group` — Create a new tag group
- `update_tag_group` — Update a tag group (name, index, pipeline, scopes)
- `delete_tag_group` — Delete a tag group by UUID

## Surveys

- `list_surveys` — List all surveys with their questions
- `query_surveys` — List all surveys with pagination
- `get_survey` — Get survey definition with all questions (text, type, choices)
- `get_survey_response` — Get answers for a survey response by responseUuid
- `list_survey_responses` — List survey responses with pagination and filters

## Locations

- `get_location` — Get full details for one or more locations by UUID
- `list_locations` — List locations (points of sale) with pagination and optional text search
- `get_location_tags` — Get tags assigned to locations
- `get_location_products` — Get products listed at specific locations
- `get_location_contacts` — Get all contacts for a specific location/entity
- `get_location_task_status` — Get task status for one or more locations
- `get_location_full_profile` — Get everything about a location in a single call (details, tags, products, contacts, task status)
- `create_location` — Create a new location/outlet
- `update_location` — Update a location's properties (name, address, notes, tagUuids, etc.)
- `delete_location` — Delete a location/entity by UUID

## Route

- `get_route` — Get the current user's planned stops (My Route) enriched with location details
- `get_route_summary` — Fast overview of the current user's route without fetching full location details
- `get_route_stops_with_tasks` — Return route stops that have at least one pending task
- `find_route_stops_by_tag` — Find route stops that have a specific tag applied

## Tasks

- `get_task_summary` — Get task counts: available, overdue, today
- `list_tasks` — List tasks with filters and pagination
- `create_task` — Create a new task
- `update_task` — Update a task. Use to resolve/close a task or change its properties
- `delete_task` — Delete a task by UUID

## Orders

- `get_order_summary` — Get order totals: last month, this month, this week
- `get_orders` — Get full details for orders by UUID
- `query_orders` — List orders with filters and pagination
- `create_order` — Create a new order (requires knowing entity UUID, profile UUID and product UUIDs)
- `update_order` — Update an order (brandStatus, distributorStatus, notes)
- `delete_order` — Delete an order by UUID

## Products

- `list_products` — List all products
- `query_products` — List products with pagination
- `get_product_details` — Get full product details by UUID
- `create_product` — Create a new product
- `update_product` — Update a product (name, sku, description, tagUuids)
- `delete_product` — Delete a product by UUID
- `query_product_cases` — List product cases (pack sizes / price configurations)

## Companies

- `list_companies` — List all company/RTM UUIDs
- `query_companies` — List companies/distributors with pagination
- `create_company` — Create a new company/RTM
- `update_company` — Update a company/distributor (name, accountNumber, domain, notes, tagUuids)
- `delete_company` — Delete a company by UUID

## Contacts

- `get_contacts` — Get contacts by UUID
- `create_or_update_contact` — Create or update a contact on a location or company

## Activity & Insights

- `get_visit_summary` — Get today's visit summary: done yesterday, missed yesterday, remaining today
- `get_visit_counts` — Count how many route stops were visited in a given period
- `get_insights` — Get combined insights: visits, tasks, and orders
- `get_activity` — Get raw activity feed (visits, survey responses, orders, tasks)
- `get_introductions` — Count product introductions from survey responses

## Team Management

- `get_team_overview` — Get task and order stats for every rep in the team
- `query_teams` — List all teams
- `create_team` — Create a new team
- `update_team` — Update a team (name, shortName, colour)
- `delete_team` — Delete a team by UUID
- `get_team_members` — Get members of a team
- `add_team_member` — Add a user to a team
- `remove_team_member` — Remove a user from a team

## Roles & Permissions

- `query_roles` — List all roles with their permission keys
- `create_role` — Create a new role with a set of permission keys
- `update_role` — Update a role (name, permissionKeys)
- `delete_role` — Delete a role by UUID

## Custom Attributes

- `query_attributes` — List all custom attribute definitions
- `get_entity_attributes` — Get custom attribute values for a location/entity
- `set_entity_attributes` — Set custom attribute values for a location/entity
- `query_entity_attributes` — Query attribute values across multiple entities

## Distribution

- `query_distribution_profiles` — List distribution profiles (price lists / assortment configs)

## Analytics & Reports

- `get_weekly_report` — Full recap of the week's field sales activity
- `list_shortcuts` — List saved location/entity shortcuts (pre-filtered views)

## Debug

- `debug_api` — Probe a raw Bowimi API endpoint for exploration

---

**Total:** 80+ tools covering the full Bowimi API surface

For detailed schemas and parameters, see [src/index.js](../src/index.js).
