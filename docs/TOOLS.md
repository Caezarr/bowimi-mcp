# Bowimi MCP Tools Reference

Complete inventory of all tools exposed by this MCP server. This reference is generated from `src/index.js` tool registrations.

## Environment Variables

All tools require authentication via these environment variables:

- **`BOWIMI_SUBDOMAIN`** (required) — Your Bowimi subdomain (e.g., "mycompany" for mycompany.bowimi.com)
- **`BOWIMI_API_KEY`** (recommended) — API key from Bowimi → Settings → Integrations → Zapier → API Key (format: `subdomain:longkey`)

**Alternative authentication** (email/password):
- **`BOWIMI_EMAIL`** — Your Bowimi account email
- **`BOWIMI_PASSWORD`** — Your Bowimi account password

> Use API key authentication when possible. Email/password creates a session cookie that is less secure for shared environments.

---

## Tool Catalog

### Account & App Info

#### `get_app_info`
Get Bowimi account info: brand details and permission keys

---

### Users

#### `list_users`
List all users in the Bowimi account

#### `get_current_user`
Get the currently authenticated user

#### `invite_user`
Invite a new user to the Bowimi account

**Parameters:** `email`, `roleUuid`, `name` (optional)

#### `query_users`
List all users with pagination

**Parameters:** `limit`, `offset`

#### `update_user`
Update a user's properties (name, friendlyName, roleUuids, enabled)

**Parameters:** `userUuid`, `name`, `friendlyName`, `enabled`, `roleUuids`

#### `delete_user`
Delete a user by UUID

**Parameters:** `userUuid`

---

### Tags

#### `list_tags`
List tag groups and their tags. Filter by intent: 'location', 'company', or omit for all

**Parameters:** `intent` (optional, enum: "location" | "company")

#### `create_tag`
Create a new tag within an existing tag group

**Parameters:** `name`, `tagGroupUuid`, `description` (optional), `colour` (optional)

#### `query_tags`
List all tags with pagination

**Parameters:** `limit`, `offset`

#### `update_tag`
Update a tag (name, colour, tagGroupUuid)

**Parameters:** `tagUuid`, `name`, `colour`, `tagGroupUuid`

#### `delete_tag`
Delete a tag by UUID

**Parameters:** `tagUuid`

---

### Tag Groups

#### `query_tag_groups`
List all tag groups

**Parameters:** `limit`, `offset`

#### `create_tag_group`
Create a new tag group

**Parameters:** `name`, `index` (optional), `pipeline` (optional), `scopes` (optional)

#### `update_tag_group`
Update a tag group (name, index, pipeline, scopes)

**Parameters:** `tagGroupUuid`, `name`, `index`, `pipeline`, `scopes`

#### `delete_tag_group`
Delete a tag group by UUID

**Parameters:** `tagGroupUuid`

---

### Surveys

#### `list_surveys`
List all surveys with their questions

#### `query_surveys`
List all surveys with pagination

**Parameters:** `limit`, `offset`

#### `get_survey`
Get survey definition with all questions (text, type, choices). Use to map questionUuid → question text when reading survey responses

**Parameters:** `surveyUuid`

#### `get_survey_response`
Get answers for a survey response by responseUuid

**Parameters:** `responseUuid`

#### `list_survey_responses`
List survey responses with pagination and filters

**Parameters:** `createdAfter`, `createdBefore`, `entityUuids`, `surveyUuids`, `responseUuids`, `limit`, `offset`

---

### Locations (Entities)

#### `get_location`
Get full details for one or more locations by UUID

**Parameters:** `entityUuids` (array)

#### `get_location_tags`
Get tags assigned to locations

**Parameters:** `entityUuids` (array)

#### `get_location_products`
Get products listed at specific locations

**Parameters:** `entityUuids` (array)

#### `get_location_contacts`
Get all contacts for a specific location/entity

**Parameters:** `entityUuid`

#### `get_location_task_status`
Get task status for one or more locations. Returns pending/overdue task info per location UUID

**Parameters:** `entityUuids` (array)

#### `get_location_full_profile`
Get everything about a location in a single call: details, tags, products, contacts, and task status. Combines 5 API calls in parallel

**Parameters:** `entityUuid`

#### `list_locations`
List locations (points of sale) with pagination and optional text search

**Parameters:** `searchTerm` (optional), `entityUuids` (optional), `limit`, `offset`

#### `create_location`
Create a new location/outlet

**Parameters:** `name`, `address`, `coordinates` (object: {lat, lng}), `phone` (optional), `email` (optional), `notes` (optional)

#### `update_location`
Update a location's properties (name, address, notes, tagUuids, etc.)

**Parameters:** `entityUuid`, `name`, `address`, `notes`, `tagUuids`, `accountNumber`

#### `delete_location`
Delete a location/entity by UUID

**Parameters:** `entityUuid`

---

### Route

#### `get_route`
Get the current user's planned stops (My Route) enriched with location details. Returns all stops with: name, address, coordinates, group name, completion status, lastContacted date

**Parameters:** `includeDetails` (default true), `groupFilter` (optional), `textFilter` (optional), `notVisitedSince` (optional), `completedOnly` (optional), `pendingOnly` (optional)

#### `get_route_summary`
Fast overview of the current user's route without fetching full location details. Returns: total stop count, completion rate, breakdown by group, list of all groups

#### `get_route_stops_with_tasks`
Return route stops that have at least one pending task. Fetches the full route, checks task status for all stops in parallel batches, and returns only the ones with active tasks — enriched with location name and address

**Parameters:** `includeCompleted` (default false)

#### `find_route_stops_by_tag`
Find route stops that have a specific tag applied. Useful for: "show me all Horeca stops", "which stops are tagged High priority?", "find Delhaize locations on my route"

**Parameters:** `tagName` (optional), `tagUuid` (optional)

---

### Tasks

#### `get_task_summary`
Get task counts: available, overdue, today

#### `list_tasks`
List tasks with filters and pagination

**Parameters:** `entityUuids` (optional), `taskUuids` (optional), `resolved` (optional), `limit`, `offset`

#### `create_task`
Create a new task

**Parameters:** `title`, `entityUuid` (optional), `dueDate` (optional), `assignedUserUuid` (optional), `description` (optional)

#### `update_task`
Update a task. Use to resolve/close a task or change its properties. To resolve: set status to "resolved" or set resolvedAt to current ISO timestamp

**Parameters:** `taskUuid`, `title`, `description`, `status`, `dueDate`, `allocatedUserUuids`

#### `delete_task`
Delete a task by UUID

**Parameters:** `taskUuid`

---

### Orders

#### `get_order_summary`
Get order totals: last month, this month, this week

#### `get_orders`
Get full details for orders by UUID

**Parameters:** `orderUuids` (array)

#### `query_orders`
List orders with filters and pagination

**Parameters:** `entityUuids` (optional), `orderUuids` (optional), `limit`, `offset`

#### `create_order`
Create a new order (requires knowing entity UUID, profile UUID and product UUIDs)

**Parameters:** `entityUuid`, `profileUuid`, `origin`, `items` (array of {productUuid, quantity}), `notes` (optional)

#### `update_order`
Update an order (brandStatus, distributorStatus, notes)

**Parameters:** `orderUuid`, `brandStatus`, `distributorStatus`, `brandNotes`, `distributorNotes`

#### `delete_order`
Delete an order by UUID

**Parameters:** `orderUuid`

---

### Products

#### `list_products`
List all products

#### `get_product_details`
Get full product details by UUID

**Parameters:** `productUuids` (array)

#### `query_products`
List products with pagination

**Parameters:** `limit`, `offset`, `searchTerm` (optional)

#### `create_product`
Create a new product

**Parameters:** `name`, `sku`, `description` (optional), `rangeId` (optional), `price` (optional)

#### `update_product`
Update a product (name, sku, description, tagUuids)

**Parameters:** `productUuid`, `name`, `sku`, `description`, `tagUuids`

#### `delete_product`
Delete a product by UUID

**Parameters:** `productUuid`

#### `query_product_cases`
List product cases (pack sizes / price configurations)

**Parameters:** `productUuids` (optional), `profileUuids` (optional), `limit`, `offset`

---

### Companies

#### `list_companies`
List all company/RTM UUIDs

#### `query_companies`
List companies/distributors with pagination

**Parameters:** `searchTerm` (optional), `limit`, `offset`

#### `create_company`
Create a new company/RTM

**Parameters:** `name`, `address` (optional), `phone` (optional), `email` (optional), `notes` (optional)

#### `update_company`
Update a company/distributor (name, accountNumber, domain, notes, tagUuids)

**Parameters:** `entityUuid`, `name`, `accountNumber`, `domain`, `notes`, `tagUuids`

#### `delete_company`
Delete a company by UUID

**Parameters:** `entityUuid`

---

### Contacts

#### `get_contacts`
Get contacts by UUID

**Parameters:** `contactUuids` (array)

#### `create_or_update_contact`
Create or update a contact on a location or company

**Parameters:** `entityUuid`, `name`, `email` (optional), `phone` (optional), `jobTitle` (optional), `primary` (optional)

---

### Activity & Insights

#### `get_visit_summary`
Get today's visit summary: done yesterday, missed yesterday, remaining today

#### `get_visit_counts`
Count how many route stops were visited in a given period, based on each location's lastContacted date

**Parameters:** `period` (enum: "this_week" | "this_month" | "last_week" | "last_month" | "custom", default "this_week"), `from` (optional), `to` (optional)

#### `get_insights`
Get combined insights: visits, tasks, and orders. Optionally filter by userUuid to get stats for a specific rep (useful for managers)

**Parameters:** `userUuid` (optional)

#### `get_activity`
Get raw activity feed. Returns visits, survey responses, orders or tasks logged in Bowimi

**Parameters:** `type` (enum: "all" | "survey" | "order" | "task", default "all"), `entityUuid` (optional), `userUuid` (optional), `from` (optional), `to` (optional), `snowDay` (optional), `limit` (default 50)

#### `get_introductions`
Count product introductions from survey responses. An "introduction" = a survey answer mentioning one or more product references (not "None")

**Parameters:** `from`, `to`, `userUuid` (optional), `entityUuid` (optional), `introductionKeywords` (default: ["introduc", "new product", "nouveau", "nieuw", "geïntroduceerd"])

---

### Team Management

#### `get_team_overview`
Get task and order stats for every rep in the team — useful for managers. Calls list_users, then fetches task summary + order summary per user in parallel

#### `query_teams`
List all teams

**Parameters:** `limit`, `offset`

#### `create_team`
Create a new team

**Parameters:** `name`, `shortName` (optional), `colour` (optional)

#### `update_team`
Update a team (name, shortName, colour)

**Parameters:** `teamUuid`, `name`, `shortName`, `colour`

#### `delete_team`
Delete a team by UUID

**Parameters:** `teamUuid`

#### `get_team_members`
Get members of a team

**Parameters:** `teamUuid`

#### `add_team_member`
Add a user to a team

**Parameters:** `teamUuid`, `userUuid`

#### `remove_team_member`
Remove a user from a team

**Parameters:** `teamUuid`, `userUuid`

---

### Roles & Permissions

#### `query_roles`
List all roles with their permission keys

**Parameters:** `limit`, `offset`

#### `create_role`
Create a new role with a set of permission keys

**Parameters:** `name`, `permissionKeys` (optional)

#### `update_role`
Update a role (name, permissionKeys)

**Parameters:** `roleUuid`, `name`, `permissionKeys`

#### `delete_role`
Delete a role by UUID

**Parameters:** `roleUuid`

---

### Custom Attributes

#### `query_attributes`
List all custom attribute definitions

**Parameters:** `limit`, `offset`

#### `get_entity_attributes`
Get custom attribute values for a location/entity

**Parameters:** `entityUuid`

#### `set_entity_attributes`
Set custom attribute values for a location/entity. Pass an array of {attributeUuid, data} objects

**Parameters:** `entityUuid`, `attributes` (array)

#### `query_entity_attributes`
Query attribute values across multiple entities

**Parameters:** `entityUuids` (optional), `attributeUuids` (optional), `limit`, `offset`

---

### Distribution

#### `query_distribution_profiles`
List distribution profiles (price lists / assortment configs)

**Parameters:** `limit`, `offset`

---

### Analytics & Reports

#### `get_weekly_report`
Full recap of the week's field sales activity. Aggregates: visit counts (from lastContacted), task status, orders, route completion, cold stops

**Parameters:** `weeksAgo` (default 0)

#### `list_shortcuts`
List saved location/entity shortcuts (pre-filtered views)

---

### Debug

#### `debug_api`
Probe a raw Bowimi API endpoint for exploration

**Parameters:** `method` (default "GET"), `path`, `body` (optional), `params` (optional)

---

## Tool Count

**Total:** 86 tools

## Source Code

For detailed parameter schemas and implementation, see:
- Tool definitions: [src/index.js](../src/index.js)
- API client methods: [src/client.js](../src/client.js)
- Authentication logic: [src/auth.js](../src/auth.js)
