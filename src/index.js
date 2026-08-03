#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BowimiAuth } from "./auth.js";
import { BowimiClient } from "./client.js";

const LOCAL_VERSION = "1.5.0";
const GITHUB_PKG_URL =
  "https://raw.githubusercontent.com/Caezarr/bowimi-mcp/main/package.json";

// Fire-and-forget update check — never blocks startup
fetch(GITHUB_PKG_URL)
  .then((r) => r.json())
  .then((pkg) => {
    if (pkg.version && pkg.version !== LOCAL_VERSION) {
      console.error(
        `[bowimi-mcp] Update available: ${LOCAL_VERSION} → ${pkg.version}. Run: git pull && npm install`
      );
    }
  })
  .catch(() => {}); // offline or rate-limited — silent

const EMAIL = process.env.BOWIMI_EMAIL;
const PASSWORD = process.env.BOWIMI_PASSWORD;
const SUBDOMAIN = process.env.BOWIMI_SUBDOMAIN;
const API_KEY = process.env.BOWIMI_API_KEY;

if (!SUBDOMAIN || (!API_KEY && (!EMAIL || !PASSWORD))) {
  console.error(
    "Required: BOWIMI_SUBDOMAIN + (BOWIMI_API_KEY or BOWIMI_EMAIL+BOWIMI_PASSWORD)"
  );
  process.exit(1);
}

const auth = new BowimiAuth({ email: EMAIL, password: PASSWORD, subdomain: SUBDOMAIN, apiKey: API_KEY });
const client = new BowimiClient(auth);

const server = new McpServer({
  name: "bowimi",
  version: LOCAL_VERSION,
});

// ── App ────────────────────────────────────────────────────────────────────

server.tool(
  "get_app_info",
  "Get Bowimi account info: brand details and permission keys",
  {},
  async () => {
    const data = await client.getAppInfo();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Users ──────────────────────────────────────────────────────────────────

server.tool(
  "list_users",
  "List all users in the Bowimi account",
  {},
  async () => {
    const data = await client.listUsers();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_current_user",
  "Get the currently authenticated user",
  {},
  async () => {
    const data = await client.getCurrentUser();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "invite_user",
  "Invite a new user to the Bowimi account",
  {
    email: z.string().email().describe("User email address"),
    roleUuid: z.string().describe("Role UUID to assign (from list_roles)"),
    name: z.string().optional().describe("Display name"),
  },
  async ({ email, roleUuid, name }) => {
    const data = await client.inviteUser({ email, roleUuid, name });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Tags ───────────────────────────────────────────────────────────────────

server.tool(
  "list_tags",
  "List tag groups and their tags. Filter by intent: 'location', 'company', or omit for all",
  {
    intent: z.enum(["location", "company"]).optional(),
  },
  async ({ intent }) => {
    const data = await client.listTags(intent);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_tag",
  "Create a new tag within an existing tag group",
  {
    name: z.string().describe("Tag name"),
    tagGroupUuid: z.string().describe("Tag group UUID (from list_tags)"),
    description: z.string().optional(),
    colour: z.number().int().optional().describe("Colour as integer (e.g. 16711680 for red)"),
  },
  async (args) => {
    const data = await client.createTag(args);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Surveys ────────────────────────────────────────────────────────────────

server.tool(
  "list_surveys",
  "List all surveys with their questions",
  {},
  async () => {
    const data = await client.listSurveys();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Locations ──────────────────────────────────────────────────────────────

server.tool(
  "get_location",
  "Get full details for one or more locations by UUID",
  {
    entityUuids: z.array(z.string()).describe("List of entity/location UUIDs"),
  },
  async ({ entityUuids }) => {
    const data = await client.getEntities(entityUuids);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_location_tags",
  "Get tags assigned to locations",
  {
    entityUuids: z.array(z.string()).describe("List of entity/location UUIDs"),
  },
  async ({ entityUuids }) => {
    const data = await client.getEntityTags(entityUuids);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_location_products",
  "Get products listed at specific locations",
  {
    entityUuids: z.array(z.string()).describe("List of entity/location UUIDs"),
  },
  async ({ entityUuids }) => {
    const data = await client.getEntityProducts(entityUuids);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_location",
  "Create a new location/outlet",
  {
    name: z.string().describe("Location name"),
    address: z.string().describe("Full address"),
    coordinates: z
      .object({ lat: z.number(), lng: z.number() })
      .describe("GPS coordinates"),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  },
  async (args) => {
    const data = await client.createLocation(args);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Tasks ──────────────────────────────────────────────────────────────────

server.tool(
  "get_task_summary",
  "Get task counts: available, overdue, today",
  {},
  async () => {
    const data = await client.getTaskSummary();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_task",
  "Create a new task",
  {
    title: z.string().describe("Task title"),
    entityUuid: z.string().optional().describe("Location/entity to attach task to"),
    dueDate: z.string().optional().describe("Due date ISO 8601 (e.g. 2026-07-25)"),
    assignedUserUuid: z.string().optional().describe("User UUID to assign to"),
    description: z.string().optional(),
  },
  async (args) => {
    const data = await client.createTask(args);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Orders ─────────────────────────────────────────────────────────────────

server.tool(
  "get_order_summary",
  "Get order totals: last month, this month, this week",
  {},
  async () => {
    const data = await client.getOrderSummary();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_orders",
  "Get full details for orders by UUID",
  {
    orderUuids: z.array(z.string()).describe("List of order UUIDs"),
  },
  async ({ orderUuids }) => {
    const data = await client.getOrders(orderUuids);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_order",
  "Create a new order (requires knowing entity UUID, profile UUID and product UUIDs)",
  {
    entityUuid: z.string().describe("Location/entity UUID to place order for"),
    profileUuid: z.string().describe("Distribution/wholesale profile UUID"),
    origin: z.string().describe("Order origin label (e.g. 'field-sales')"),
    items: z
      .array(
        z.object({
          productUuid: z.string(),
          quantity: z.number().int().positive(),
        })
      )
      .describe("Line items"),
    notes: z.string().optional(),
  },
  async (args) => {
    const data = await client.createOrder(args);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Products ───────────────────────────────────────────────────────────────

server.tool(
  "list_products",
  "List all products",
  {},
  async () => {
    const data = await client.listProducts();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_product_details",
  "Get full product details by UUID",
  {
    productUuids: z.array(z.string()).describe("List of product UUIDs"),
  },
  async ({ productUuids }) => {
    const data = await client.getProductDetails(productUuids);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_product",
  "Create a new product",
  {
    name: z.string(),
    sku: z.string().describe("Product SKU/code"),
    description: z.string().optional(),
    rangeId: z.string().optional().describe("Product range/category ID"),
    price: z.number().optional(),
  },
  async (args) => {
    const data = await client.createProduct(args);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Companies ──────────────────────────────────────────────────────────────

server.tool(
  "list_companies",
  "List all company/RTM UUIDs",
  {},
  async () => {
    const data = await client.listCompanyUuids();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_company",
  "Create a new company/RTM",
  {
    name: z.string().describe("Company name"),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  },
  async (args) => {
    const data = await client.createCompany(args);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Contacts ───────────────────────────────────────────────────────────────

server.tool(
  "get_contacts",
  "Get contacts by UUID",
  {
    contactUuids: z.array(z.string()),
  },
  async ({ contactUuids }) => {
    const data = await client.getContacts(contactUuids);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_or_update_contact",
  "Create or update a contact on a location or company",
  {
    entityUuid: z.string().describe("Location or company UUID"),
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    primary: z.boolean().optional().describe("Set as primary contact"),
  },
  async (args) => {
    const data = await client.createOrUpdateContact(args);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Activity ───────────────────────────────────────────────────────────────

server.tool(
  "get_visit_summary",
  "Get today's visit summary: done yesterday, missed yesterday, remaining today",
  {},
  async () => {
    const data = await client.getVisitSummary();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Route ──────────────────────────────────────────────────────────────────

server.tool(
  "get_route",
  `Get the current user's planned stops (My Route) enriched with location details.

Returns all stops with: name, address, coordinates, group name, completion status, lastContacted date.

Filtering (all optional, applied client-side after fetch):
- groupFilter: partial match on group name (case-insensitive), e.g. "namur", "horeca"
- textFilter: partial match on location name or address
- notVisitedSince: ISO date — only stops where lastContacted is null or before this date
- completedOnly / pendingOnly: filter by completion status

NOTE: This is the primary way to discover locations in Bowimi. The geographic search endpoint is unavailable server-side. If a region is not represented here, those locations have not been added to the current user's route in Bowimi.`,
  {
    includeDetails: z.boolean().default(true).describe("Fetch full location details (name, address, lastContacted). Disable only if you just need UUIDs."),
    groupFilter: z.string().optional().describe("Filter stops by group name (partial, case-insensitive). E.g. 'namur', 'horeca bxl'"),
    textFilter: z.string().optional().describe("Filter stops by location name or address (partial, case-insensitive)"),
    notVisitedSince: z.string().optional().describe("ISO 8601 date — return only stops not contacted since this date (or never)"),
    completedOnly: z.boolean().optional().describe("Only return completed stops"),
    pendingOnly: z.boolean().optional().describe("Only return pending (not yet completed) stops"),
  },
  async ({ includeDetails, groupFilter, textFilter, notVisitedSince, completedOnly, pendingOnly }) => {
    const stops = await client.getRoute();
    if (!stops?.length) {
      return { content: [{ type: "text", text: "Route is empty." }] };
    }

    let result = stops;

    // Apply group filter before fetching details (saves API calls)
    if (groupFilter) {
      const gf = groupFilter.toLowerCase();
      result = result.filter(s => s.groupName?.toLowerCase().includes(gf));
    }
    if (completedOnly) result = result.filter(s => s.complete === true);
    if (pendingOnly) result = result.filter(s => s.complete !== true);

    if (!includeDetails) {
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // Enrich with entity details (batch 50 at a time)
    const uuids = result.map(s => s.entityUuid);
    const entityMap = {};
    for (let i = 0; i < uuids.length; i += 50) {
      const batch = uuids.slice(i, i + 50);
      const data = await client.getEntities(batch);
      Object.assign(entityMap, data);
    }

    let enriched = result.map(s => {
      const e = entityMap[s.entityUuid] ?? {};
      return {
        sequence: s.sequence,
        entityUuid: s.entityUuid,
        complete: s.complete,
        groupName: s.groupName ?? null,
        name: e.name ?? null,
        address: e.address ?? null,
        coordinates: e.coordinates ?? null,
        lastContacted: e.lastContacted ?? null,
        phone: e.phone ?? null,
      };
    });

    // Post-enrich filters
    if (textFilter) {
      const tf = textFilter.toLowerCase();
      enriched = enriched.filter(s =>
        s.name?.toLowerCase().includes(tf) || s.address?.toLowerCase().includes(tf)
      );
    }
    if (notVisitedSince) {
      const cutoff = new Date(notVisitedSince);
      enriched = enriched.filter(s =>
        !s.lastContacted || new Date(s.lastContacted) < cutoff
      );
    }

    const summary = {
      total_route_stops: stops.length,
      returned: enriched.length,
      groups: [...new Set(enriched.map(s => s.groupName).filter(Boolean))],
      stops: enriched,
    };

    return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
  }
);

// ── Contacts ───────────────────────────────────────────────────────────────

server.tool(
  "get_location_contacts",
  "Get all contacts for a specific location/entity",
  {
    entityUuid: z.string().describe("Location UUID"),
  },
  async ({ entityUuid }) => {
    const contactUuids = await client.getEntityContactUuids(entityUuid);
    if (!contactUuids?.length) {
      return { content: [{ type: "text", text: "No contacts found" }] };
    }
    const details = await client.getContactDetails(contactUuids);
    return { content: [{ type: "text", text: JSON.stringify(details, null, 2) }] };
  }
);

// ── Insights ───────────────────────────────────────────────────────────────

server.tool(
  "get_location_task_status",
  "Get task status for one or more locations. Returns pending/overdue task info per location UUID.",
  {
    entityUuids: z.array(z.string()).describe("Location UUIDs to check (from get_route or get_location)"),
  },
  async ({ entityUuids }) => {
    const data = await client.getEntityTaskStatuses(entityUuids);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_insights",
  "Get combined insights: visits, tasks, and orders. Optionally filter by userUuid to get stats for a specific rep (useful for managers).",
  {
    userUuid: z.string().optional().describe("Filter by rep UUID (from list_users). Omit for current user."),
  },
  async ({ userUuid }) => {
    const [visits, tasks, orders] = await Promise.all([
      client.getVisitSummary(),
      client.getTaskSummary(userUuid),
      client.getOrderSummary(userUuid),
    ]);
    const insights = { userUuid: userUuid ?? "current", visits, tasks, orders };
    return { content: [{ type: "text", text: JSON.stringify(insights, null, 2) }] };
  }
);

// ── Shortcuts ──────────────────────────────────────────────────────────────

server.tool(
  "list_shortcuts",
  "List saved location/entity shortcuts (pre-filtered views)",
  {},
  async () => {
    const data = await client.listShortcuts();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Composite tools ────────────────────────────────────────────────────────

server.tool(
  "get_location_full_profile",
  `Get everything about a location in a single call: details, tags, products, contacts, and task status.
Combines 5 API calls in parallel. Use this instead of calling get_location + get_location_tags + get_location_products + get_location_contacts + get_location_task_status separately.`,
  {
    entityUuid: z.string().describe("Location UUID (from get_route or get_location)"),
  },
  async ({ entityUuid }) => {
    const [entityMap, tagsMap, productsMap, taskMap, contactUuids] = await Promise.all([
      client.getEntities([entityUuid]),
      client.getEntityTags([entityUuid]),
      client.getEntityProducts([entityUuid]),
      client.getEntityTaskStatuses([entityUuid]),
      client.getEntityContactUuids(entityUuid),
    ]);

    const entity = entityMap?.[entityUuid] ?? {};
    const tagUuids = tagsMap?.[entityUuid] ?? [];

    // Resolve tag names from the tag list
    let tagDetails = [];
    if (tagUuids.length) {
      const allTags = await client.listTags();
      const tagMap = {};
      for (const group of (allTags ?? [])) {
        for (const tag of (group.tags ?? [])) {
          tagMap[tag.tagUuid] = { name: tag.tagName, group: group.groupName };
        }
      }
      tagDetails = tagUuids.map(uuid => tagMap[uuid] ?? { uuid });
    }

    let contacts = [];
    if (contactUuids?.length) {
      const contactDetails = await client.getContactDetails(contactUuids);
      contacts = Object.values(contactDetails ?? {});
    }

    const profile = {
      entityUuid,
      name: entity.name ?? null,
      address: entity.address ?? null,
      coordinates: entity.coordinates ?? null,
      phone: entity.phone ?? null,
      lastContacted: entity.lastContacted ?? null,
      tags: tagDetails,
      products: productsMap?.[entityUuid] ?? null,
      taskStatus: taskMap?.[entityUuid] ?? null,
      contacts,
    };

    return { content: [{ type: "text", text: JSON.stringify(profile, null, 2) }] };
  }
);

server.tool(
  "get_route_summary",
  `Fast overview of the current user's route without fetching full location details.
Returns: total stop count, completion rate, breakdown by group, list of all groups.
Use this for a quick status check before deciding which stops to investigate further.`,
  {},
  async () => {
    const stops = await client.getRoute();
    if (!stops?.length) {
      return { content: [{ type: "text", text: JSON.stringify({ total: 0, groups: [] }) }] };
    }

    const groups = {};
    for (const s of stops) {
      const g = s.groupName ?? "(no group)";
      if (!groups[g]) groups[g] = { name: g, total: 0, completed: 0 };
      groups[g].total++;
      if (s.complete) groups[g].completed++;
    }

    const total = stops.length;
    const completed = stops.filter(s => s.complete).length;

    const summary = {
      total_stops: total,
      completed,
      pending: total - completed,
      completion_pct: Math.round((completed / total) * 100),
      groups: Object.values(groups).sort((a, b) => b.total - a.total),
    };

    return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
  }
);

server.tool(
  "get_route_stops_with_tasks",
  `Return route stops that have at least one pending task.
Fetches the full route, checks task status for all stops in parallel batches, and returns only the ones with active tasks — enriched with location name and address.`,
  {
    includeCompleted: z.boolean().default(false).describe("Also include stops with completed tasks"),
  },
  async ({ includeCompleted }) => {
    const stops = await client.getRoute();
    if (!stops?.length) {
      return { content: [{ type: "text", text: "Route is empty." }] };
    }

    const uuids = stops.map(s => s.entityUuid);

    // Batch task-status and entity details in parallel
    const BATCH = 50;
    const taskMap = {};
    const entityMap = {};

    const batches = [];
    for (let i = 0; i < uuids.length; i += BATCH) batches.push(uuids.slice(i, i + BATCH));

    await Promise.all(
      batches.flatMap(batch => [
        client.getEntityTaskStatuses(batch).then(d => Object.assign(taskMap, d)),
        client.getEntities(batch).then(d => Object.assign(entityMap, d)),
      ])
    );

    const withTasks = stops
      .filter(s => {
        const ts = taskMap[s.entityUuid];
        if (!ts) return false;
        if (includeCompleted) return true;
        return ts.pendingCount > 0 || ts.overdueCount > 0 || (typeof ts === "object" && ts !== null);
      })
      .map(s => {
        const e = entityMap[s.entityUuid] ?? {};
        return {
          sequence: s.sequence,
          entityUuid: s.entityUuid,
          groupName: s.groupName ?? null,
          name: e.name ?? null,
          address: e.address ?? null,
          lastContacted: e.lastContacted ?? null,
          taskStatus: taskMap[s.entityUuid],
        };
      });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ count: withTasks.length, stops: withTasks }, null, 2),
      }],
    };
  }
);

server.tool(
  "find_route_stops_by_tag",
  `Find route stops that have a specific tag applied.
Useful for: "show me all Horeca stops", "which stops are tagged High priority?", "find Delhaize locations on my route".
Pass a tag name (partial, case-insensitive, matches tag name OR group name) or an exact tag UUID.
Use list_tags first to see available tag groups and tag names.`,
  {
    tagName: z.string().optional().describe("Tag name or group name to search (partial, case-insensitive). E.g. 'horeca', 'high', 'delhaize', 'retail'"),
    tagUuid: z.string().optional().describe("Exact tag UUID (from list_tags). Takes priority over tagName."),
  },
  async ({ tagName, tagUuid }) => {
    if (!tagName && !tagUuid) {
      return { content: [{ type: "text", text: "Provide tagName or tagUuid." }] };
    }

    // Resolve tagUuid — match on tagName OR groupName
    let resolvedTagUuid = tagUuid;
    let resolvedTagLabel = tagUuid;
    if (!resolvedTagUuid && tagName) {
      const allTags = await client.listTags();
      const needle = tagName.toLowerCase();
      // First try exact tag name match, then group match (returns all tags in group)
      const candidates = [];
      for (const group of (allTags ?? [])) {
        for (const tag of (group.tags ?? [])) {
          if (tag.tagName?.toLowerCase().includes(needle)) {
            candidates.push({ tagUuid: tag.tagUuid, label: `${group.groupName} / ${tag.tagName}` });
          }
        }
      }
      // If no tag-name match, try group-name match (return first tag in group as hint)
      if (!candidates.length) {
        for (const group of (allTags ?? [])) {
          if (group.groupName?.toLowerCase().includes(needle)) {
            for (const tag of (group.tags ?? [])) {
              candidates.push({ tagUuid: tag.tagUuid, label: `${group.groupName} / ${tag.tagName}` });
            }
          }
        }
      }
      if (!candidates.length) {
        return { content: [{ type: "text", text: `No tag found matching "${tagName}". Use list_tags to see all available tags.` }] };
      }
      if (candidates.length > 1) {
        // Return all matching tags so user can pick
        return {
          content: [{
            type: "text",
            text: `Multiple tags match "${tagName}". Specify tagUuid:\n${candidates.map(c => `  ${c.label} → ${c.tagUuid}`).join("\n")}`,
          }],
        };
      }
      resolvedTagUuid = candidates[0].tagUuid;
      resolvedTagLabel = candidates[0].label;
    }

    const stops = await client.getRoute();
    if (!stops?.length) {
      return { content: [{ type: "text", text: "Route is empty." }] };
    }

    const uuids = stops.map(s => s.entityUuid);
    const BATCH = 50;
    const tagsMap = {};
    const entityMap = {};

    const batches = [];
    for (let i = 0; i < uuids.length; i += BATCH) batches.push(uuids.slice(i, i + BATCH));

    await Promise.all(
      batches.flatMap(b => [
        client.getEntityTags(b).then(d => Object.assign(tagsMap, d)),
        client.getEntities(b).then(d => Object.assign(entityMap, d)),
      ])
    );

    const matched = stops
      .filter(s => (tagsMap[s.entityUuid] ?? []).includes(resolvedTagUuid))
      .map(s => {
        const e = entityMap[s.entityUuid] ?? {};
        return {
          sequence: s.sequence,
          entityUuid: s.entityUuid,
          groupName: s.groupName ?? null,
          name: e.name ?? null,
          address: e.address ?? null,
          lastContacted: e.lastContacted ?? null,
        };
      });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ tag: resolvedTagLabel, tagUuid: resolvedTagUuid, count: matched.length, stops: matched }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_team_overview",
  `Get task and order stats for every rep in the team — useful for managers.
Calls list_users, then fetches task summary + order summary per user in parallel.`,
  {},
  async () => {
    const users = await client.listUsers();
    if (!users?.length) {
      return { content: [{ type: "text", text: "No users found." }] };
    }

    const reps = await Promise.all(
      users.map(async (u) => {
        const [tasks, orders] = await Promise.all([
          client.getTaskSummary(u.userUuid).catch(() => null),
          client.getOrderSummary(u.userUuid).catch(() => null),
        ]);
        return {
          userUuid: u.userUuid,
          name: u.name,
          email: u.email ?? null,
          tasks,
          orders,
        };
      })
    );

    return { content: [{ type: "text", text: JSON.stringify(reps, null, 2) }] };
  }
);

// ── Visit & activity analytics ────────────────────────────────────────────

server.tool(
  "get_visit_counts",
  `Count how many route stops were visited in a given period, based on each location's lastContacted date.
Groups results by route group (proxy for rep, since groups are named by rep/day).
Returns: total visited, breakdown by group, and the list of visited locations with their lastContacted date.

LIMITATION: lastContacted is account-wide — it shows when the location was last visited by anyone, not specifically which rep. Use groupName as a proxy for rep attribution.`,
  {
    period: z.enum(["this_week", "this_month", "last_week", "last_month", "custom"]).default("this_week"),
    from: z.string().optional().describe("ISO date for custom period start (e.g. 2026-07-01)"),
    to: z.string().optional().describe("ISO date for custom period end (e.g. 2026-07-31)"),
  },
  async ({ period, from, to }) => {
    const now = new Date();

    let start, end;
    if (period === "custom") {
      start = new Date(from);
      end = to ? new Date(to) : now;
    } else {
      const dow = now.getDay(); // 0=Sun
      const monday = new Date(now); monday.setDate(now.getDate() - ((dow + 6) % 7)); monday.setHours(0,0,0,0);
      const lastMonday = new Date(monday); lastMonday.setDate(monday.getDate() - 7);
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      if (period === "this_week")   { start = monday; end = now; }
      if (period === "last_week")   { start = lastMonday; end = monday; }
      if (period === "this_month")  { start = firstOfMonth; end = now; }
      if (period === "last_month")  { start = firstOfLastMonth; end = firstOfMonth; }
    }

    // Fetch all route stops + entity details
    const stops = await client.getRoute();
    if (!stops?.length) return { content: [{ type: "text", text: "Route is empty." }] };

    const uuids = stops.map(s => s.entityUuid);
    const entityMap = {};
    for (let i = 0; i < uuids.length; i += 50) {
      Object.assign(entityMap, await client.getEntities(uuids.slice(i, i + 50)));
    }

    // Filter by lastContacted in period
    const visited = [];
    const notVisited = [];
    for (const s of stops) {
      const e = entityMap[s.entityUuid] ?? {};
      const lc = e.lastContacted ? new Date(e.lastContacted) : null;
      const inPeriod = lc && lc >= start && lc <= end;
      const entry = {
        entityUuid: s.entityUuid,
        name: e.name ?? null,
        address: e.address ?? null,
        groupName: s.groupName ?? null,
        lastContacted: e.lastContacted ?? null,
      };
      (inPeriod ? visited : notVisited).push(entry);
    }

    // Group visited by groupName
    const byGroup = {};
    for (const v of visited) {
      const g = v.groupName ?? "(no group)";
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(v);
    }

    const result = {
      period: period === "custom" ? `${start.toISOString().slice(0,10)} → ${end.toISOString().slice(0,10)}` : period,
      total_stops: stops.length,
      visited: visited.length,
      not_visited: notVisited.length,
      visit_rate_pct: Math.round((visited.length / stops.length) * 100),
      by_group: Object.entries(byGroup)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([group, stops]) => ({ group, count: stops.length, stops })),
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_introductions",
  `Get product introductions (new listings) per location.

Returns the stocked and proposed product UUIDs per route stop, enriched with product names and location names.

IMPORTANT LIMITATION: The Bowimi activity feed endpoint (QUERY /activity) returns a server-side error for all request formats — this is a confirmed Bowimi API bug. As a result, it is impossible to retrieve introduction events (visit outcomes) or filter introductions by date, rep, or period via this API.

What this tool CAN show: the current product listing state per location (stocked / proposed products), which reflects cumulative introductions to date. It cannot show when a product was introduced or by whom.

To get historical introduction data, Bowimi support must fix the /activity endpoint or expose a dedicated introductions endpoint.`,
  {
    groupFilter: z.string().optional().describe("Filter by route group name (partial match). E.g. 'horeca', 'namur'"),
    onlyWithProducts: z.boolean().default(false).describe("Only return locations that have at least one product listed"),
  },
  async ({ groupFilter, onlyWithProducts }) => {
    let stops = await client.getRoute();
    if (!stops?.length) return { content: [{ type: "text", text: "Route is empty." }] };

    if (groupFilter) {
      const gf = groupFilter.toLowerCase();
      stops = stops.filter(s => s.groupName?.toLowerCase().includes(gf));
    }

    const uuids = stops.map(s => s.entityUuid);
    const entityMap = {};
    const productsMap = {};

    for (let i = 0; i < uuids.length; i += 50) {
      const batch = uuids.slice(i, i + 50);
      await Promise.all([
        client.getEntities(batch).then(d => Object.assign(entityMap, d)),
        client.getEntityProducts(batch).then(d => Object.assign(productsMap, d)),
      ]);
    }

    // Get product catalog to resolve names
    const catalog = await client.listProducts();
    const productNames = {};
    for (const range of (catalog ?? [])) {
      for (const uuid of (range.productUuids ?? [])) {
        productNames[uuid] = range.name ?? uuid;
      }
    }

    // Get full product details for any UUIDs found
    const allProductUuids = new Set();
    for (const p of Object.values(productsMap)) {
      for (const uuid of [...(p?.stocked ?? []), ...(p?.proposed ?? [])]) {
        allProductUuids.add(uuid);
      }
    }
    let productDetails = {};
    if (allProductUuids.size > 0) {
      productDetails = await client.getProductDetails([...allProductUuids]).catch(() => ({}));
    }

    const locations = stops
      .map(s => {
        const e = entityMap[s.entityUuid] ?? {};
        const p = productsMap[s.entityUuid] ?? {};
        const stocked = (p.stocked ?? []).map(uuid => ({
          productUuid: uuid,
          name: productDetails[uuid]?.name ?? productNames[uuid] ?? uuid,
        }));
        const proposed = (p.proposed ?? []).map(uuid => ({
          productUuid: uuid,
          name: productDetails[uuid]?.name ?? productNames[uuid] ?? uuid,
        }));
        return {
          entityUuid: s.entityUuid,
          name: e.name ?? null,
          address: e.address ?? null,
          groupName: s.groupName ?? null,
          lastContacted: e.lastContacted ?? null,
          stocked_count: stocked.length,
          proposed_count: proposed.length,
          stocked,
          proposed,
        };
      })
      .filter(l => !onlyWithProducts || l.stocked_count > 0 || l.proposed_count > 0);

    // Summary by product
    const byProduct = {};
    for (const l of locations) {
      for (const p of l.stocked) {
        if (!byProduct[p.productUuid]) byProduct[p.productUuid] = { name: p.name, stocked_at: [], proposed_at: [] };
        byProduct[p.productUuid].stocked_at.push({ entityUuid: l.entityUuid, name: l.name, groupName: l.groupName });
      }
      for (const p of l.proposed) {
        if (!byProduct[p.productUuid]) byProduct[p.productUuid] = { name: p.name, stocked_at: [], proposed_at: [] };
        byProduct[p.productUuid].proposed_at.push({ entityUuid: l.entityUuid, name: l.name, groupName: l.groupName });
      }
    }

    const result = {
      api_limitation: "Historical introduction events unavailable — Bowimi /activity endpoint has a server-side bug. Showing current product listing state only.",
      total_locations: locations.length,
      locations_with_stocked_products: locations.filter(l => l.stocked_count > 0).length,
      locations_with_proposed_products: locations.filter(l => l.proposed_count > 0).length,
      by_product: Object.values(byProduct).sort((a, b) =>
        (b.stocked_at.length + b.proposed_at.length) - (a.stocked_at.length + a.proposed_at.length)
      ),
      locations,
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_weekly_report",
  `Full recap of the week's field sales activity.
Aggregates: visit counts (from lastContacted), task status, orders, route completion, cold stops.
Groups visits by route group as proxy for rep.
Use this for a weekly overview before a team meeting or to send a summary.`,
  {
    weeksAgo: z.number().int().min(0).max(12).default(0).describe("0 = this week, 1 = last week, etc."),
  },
  async ({ weeksAgo }) => {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dow + 6) % 7) - weeksAgo * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);

    const weekLabel = weeksAgo === 0
      ? `This week (${monday.toISOString().slice(0,10)} → today)`
      : `Week of ${monday.toISOString().slice(0,10)}`;

    // Fetch everything in parallel
    const [stops, visitSummary, taskSummary, orderSummary, users] = await Promise.all([
      client.getRoute(),
      client.getVisitSummary(),
      client.getTaskSummary(),
      client.getOrderSummary(),
      client.listUsers(),
    ]);

    // Enrich stops with entity details
    const uuids = stops.map(s => s.entityUuid);
    const entityMap = {};
    for (let i = 0; i < uuids.length; i += 50) {
      Object.assign(entityMap, await client.getEntities(uuids.slice(i, i + 50)));
    }

    // Count visits this week per group
    const visitedThisWeek = [];
    const coldStops = []; // not visited in 90+ days
    for (const s of stops) {
      const e = entityMap[s.entityUuid] ?? {};
      const lc = e.lastContacted ? new Date(e.lastContacted) : null;
      const entry = {
        entityUuid: s.entityUuid,
        name: e.name ?? null,
        groupName: s.groupName ?? null,
        lastContacted: e.lastContacted ?? null,
      };
      if (lc && lc >= monday && lc < sunday) visitedThisWeek.push(entry);
      const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);
      if (!lc || lc < ninetyDaysAgo) coldStops.push(entry);
    }

    const visitsByGroup = {};
    for (const v of visitedThisWeek) {
      const g = v.groupName ?? "(no group)";
      if (!visitsByGroup[g]) visitsByGroup[g] = 0;
      visitsByGroup[g]++;
    }

    // Per-user task/order stats
    const repStats = await Promise.all(
      users.map(async u => {
        const [t, o] = await Promise.all([
          client.getTaskSummary(u.userUuid).catch(() => null),
          client.getOrderSummary(u.userUuid).catch(() => null),
        ]);
        return { name: u.name, tasks: t, orders: o };
      })
    );

    const report = {
      week: weekLabel,
      visits: {
        total_route_stops: stops.length,
        visited_this_week: visitedThisWeek.length,
        visit_rate_pct: Math.round((visitedThisWeek.length / stops.length) * 100),
        by_group: Object.entries(visitsByGroup)
          .sort((a, b) => b[1] - a[1])
          .map(([group, count]) => ({ group, count })),
        visited_locations: visitedThisWeek,
        note: "Visit attribution by route group (proxy for rep — exact per-rep tracking requires Bowimi /activity endpoint, currently unavailable server-side)",
      },
      tasks: {
        global: taskSummary,
        per_rep: repStats.map(r => ({ name: r.name, ...r.tasks })),
      },
      orders: {
        global: orderSummary,
        per_rep: repStats.map(r => ({ name: r.name, ...r.orders })),
      },
      cold_stops: {
        count: coldStops.length,
        pct_of_route: Math.round((coldStops.length / stops.length) * 100),
        stops: coldStops,
      },
      today: visitSummary,
    };

    return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
  }
);

// ── Survey & Activity ─────────────────────────────────────────────────────

server.tool(
  "get_activity",
  `Get raw activity feed. Returns visits, survey responses, orders or tasks logged in Bowimi.

Filter options (all optional):
- type: "all" | "survey" | "order" | "task" (default "all")
- entityUuid: filter by location
- userUuid: filter by rep
- from / to: ISO date strings (e.g. "2026-07-01")
- snowDay: pagination cursor — pass the last snowDay value from a previous call to get older records
- limit: max records to return (default 50, max 200)

Each record has: activityId, date, snowDay, userUuid, entityUuid, details._type, and for surveys: details.responseUuid, details.surveyName.`,
  {
    type: z.enum(["all", "survey", "order", "task"]).default("all"),
    entityUuid: z.string().optional(),
    userUuid: z.string().optional(),
    from: z.string().optional().describe("ISO date e.g. 2026-07-01"),
    to: z.string().optional().describe("ISO date e.g. 2026-07-31"),
    snowDay: z.string().optional().describe("Pagination cursor from previous call"),
    limit: z.number().int().min(1).max(200).default(50),
  },
  async ({ type, entityUuid, userUuid, from, to, snowDay, limit }) => {
    const filter = { _type: type };
    if (entityUuid) filter.entityUuid = entityUuid;
    if (userUuid) filter.userUuid = userUuid;
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (snowDay) filter.snowDay = snowDay;
    filter.limit = limit;

    const data = await client.getActivity(filter);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_survey",
  "Get survey definition with all questions (text, type, choices). Use to map questionUuid → question text when reading survey responses.",
  {
    surveyUuid: z.string().describe("Survey UUID"),
  },
  async ({ surveyUuid }) => {
    const data = await client.getSurvey(surveyUuid);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_survey_response",
  `Get answers for a survey response by responseUuid.

Returns {responseUuid, items: [{questionUuid, value}], total}.
Use get_survey to map questionUuid → question text.

To find responseUuids: use list_survey_responses.`,
  {
    responseUuid: z.string().describe("Response UUID"),
  },
  async ({ responseUuid }) => {
    const data = await client.getSurveyResponseAnswers(responseUuid);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_survey_responses",
  `List survey responses with pagination and filters.

Returns {items: [{createdAt, entityUuid, responseUuid, surveyUuid, userUuid, verified}], total, next, prev}.

Filters (all optional):
- createdAfter / createdBefore: ISO datetime e.g. "2026-07-01T00:00:00Z"
- entityUuids: filter by locations (array)
- surveyUuids: filter by surveys (array)
- responseUuids: fetch specific responses (array)
- limit: 1–100 (default 50)
- offset: for pagination`,
  {
    createdAfter: z.string().optional().describe("ISO datetime e.g. 2026-07-01T00:00:00Z"),
    createdBefore: z.string().optional().describe("ISO datetime e.g. 2026-07-31T23:59:59Z"),
    entityUuids: z.array(z.string()).optional(),
    surveyUuids: z.array(z.string()).optional(),
    responseUuids: z.array(z.string()).optional(),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
  },
  async ({ createdAfter, createdBefore, entityUuids, surveyUuids, responseUuids, limit, offset }) => {
    const body = { limit, offset };
    if (createdAfter) body.createdAfter = createdAfter;
    if (createdBefore) body.createdBefore = createdBefore;
    if (entityUuids?.length) body.entityUuids = entityUuids;
    if (surveyUuids?.length) body.surveyUuids = surveyUuids;
    if (responseUuids?.length) body.responseUuids = responseUuids;
    const data = await client.querySurveyResponses(body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_introductions",
  `Count product introductions from survey responses.

An "introduction" = a survey answer mentioning one or more product references (not "None").
The tool fetches survey activity for the given period, enriches each response with question/answer details, then aggregates counts by rep, location, and product reference.

Returns:
- summary: total introductions, unique locations, unique reps
- by_rep: [{userUuid, repName, count}]
- by_location: [{entityUuid, locationName, count}]
- by_product: [{product, count}]
- details: [{date, repName, locationName, surveyName, products_introduced}]

Parameters:
- from / to: ISO date range (required)
- userUuid: filter to one rep (optional)
- entityUuid: filter to one location (optional)
- introductionKeywords: keywords to identify "introduction" questions (default: ["introduc", "new product", "nouveau", "nieuw", "geïntroduceerd"])`,
  {
    from: z.string().describe("Start date ISO e.g. 2026-07-01"),
    to: z.string().describe("End date ISO e.g. 2026-07-31"),
    userUuid: z.string().optional(),
    entityUuid: z.string().optional(),
    introductionKeywords: z.array(z.string()).default(["introduc", "new product", "nouveau", "nieuw", "geïntroduceerd"]),
  },
  async ({ from, to, userUuid, entityUuid, introductionKeywords }) => {
    // Step 1: fetch all survey responses via official paginated endpoint
    const body = {
      createdAfter: `${from}T00:00:00Z`,
      createdBefore: `${to}T23:59:59Z`,
      limit: 100,
      offset: 0,
    };
    if (entityUuid) body.entityUuids = [entityUuid];

    // Paginate through all responses
    let responses = [];
    let page = await client.querySurveyResponses(body);
    responses.push(...(page.items || []));
    while (page.next && responses.length < 500) {
      page = await client.querySurveyResponses(page.next);
      responses.push(...(page.items || []));
    }

    // Filter by userUuid client-side (API doesn't support userUuid filter on survey-responses)
    if (userUuid) responses = responses.filter(r => r.userUuid === userUuid);

    if (responses.length === 0) {
      return { content: [{ type: "text", text: JSON.stringify({ summary: { total_introductions: 0, message: "No survey responses found for this period" } }, null, 2) }] };
    }

    // Step 2: fetch user list for name lookup
    let users = [];
    try { users = await client.listUsers(); } catch {}
    const userMap = {};
    for (const u of (Array.isArray(users) ? users : [])) {
      userMap[u.userUuid || u.uuid] = u.name || u.displayName || u.email || u.userUuid;
    }

    // Step 3: fetch survey questions (cached by surveyUuid)
    const surveyCache = {};
    const getSurveyQuestions = async (surveyUuid) => {
      if (!surveyUuid) return [];
      if (!surveyCache[surveyUuid]) {
        try {
          const def = await client.getSurvey(surveyUuid);
          surveyCache[surveyUuid] = def?.questions || [];
        } catch { surveyCache[surveyUuid] = []; }
      }
      return surveyCache[surveyUuid];
    };

    // Step 4: fetch entity names for locations
    const entityUuids = [...new Set(responses.map(r => r.entityUuid).filter(Boolean))];
    const entityMap = {};
    if (entityUuids.length) {
      try {
        const entities = await client.getEntities(entityUuids);
        for (const e of (Array.isArray(entities) ? entities : [])) {
          entityMap[e.entityUuid || e.uuid] = e.name || e.entityUuid;
        }
      } catch {}
    }

    // Step 5: for each response, fetch answers and identify introductions
    const details = [];
    const byRep = {};
    const byLocation = {};
    const byProduct = {};
    const kws = introductionKeywords.map(k => k.toLowerCase());

    for (const resp of responses) {
      // Get question definitions to find intro questions
      const questions = await getSurveyQuestions(resp.surveyUuid);
      const introQuestionUuids = new Set(
        questions
          .filter(q => kws.some(kw => q.text.toLowerCase().includes(kw)))
          .map(q => q.questionUuid)
      );
      if (introQuestionUuids.size === 0) continue;

      // Fetch answers via official endpoint
      let answersData;
      try { answersData = await client.getSurveyResponseAnswers(resp.responseUuid); } catch { continue; }

      const introducedProducts = [];
      for (const item of (answersData.items || [])) {
        if (!introQuestionUuids.has(item.questionUuid)) continue;
        const raw = item.value || "";
        // multichoice comes as comma-separated string
        const vals = raw.split(",").map(v => v.trim()).filter(v => v && v.toLowerCase() !== "none");
        introducedProducts.push(...vals);
      }

      if (introducedProducts.length === 0) continue;

      const repUuid = resp.userUuid;
      const locUuid = resp.entityUuid;
      const repName = userMap[repUuid] || repUuid || "Unknown";
      const locName = entityMap[locUuid] || locUuid || "Unknown";

      details.push({
        date: resp.createdAt,
        repName,
        locationName: locName,
        products_introduced: introducedProducts,
      });

      if (!byRep[repUuid]) byRep[repUuid] = { userUuid: repUuid, repName, count: 0 };
      byRep[repUuid].count += introducedProducts.length;

      if (!byLocation[locUuid]) byLocation[locUuid] = { entityUuid: locUuid, locationName: locName, count: 0 };
      byLocation[locUuid].count += introducedProducts.length;

      for (const p of introducedProducts) {
        byProduct[p] = (byProduct[p] || 0) + 1;
      }
    }

    const totalIntroductions = Object.values(byProduct).reduce((s, c) => s + c, 0);

    const result = {
      summary: {
        period: { from, to },
        total_introductions: totalIntroductions,
        unique_locations: Object.keys(byLocation).length,
        unique_reps: Object.keys(byRep).length,
        responses_analyzed: responses.length,
      },
      by_rep: Object.values(byRep).sort((a, b) => b.count - a.count),
      by_location: Object.values(byLocation).sort((a, b) => b.count - a.count),
      by_product: Object.entries(byProduct).map(([product, count]) => ({ product, count })).sort((a, b) => b.count - a.count),
      details: details.sort((a, b) => b.date.localeCompare(a.date)),
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_locations",
  `List locations (points of sale) with pagination and optional text search.

Returns {items: [{entityUuid, name, address}], total, next, prev}.

Use this to discover locations without needing the route. Supports full-text search and pagination.

Parameters:
- searchTerm: partial name or address search (optional)
- entityUuids: fetch specific locations by UUID (optional)
- limit: 1–100 (default 50)
- offset: for pagination`,
  {
    searchTerm: z.string().optional().describe("Partial name or address search"),
    entityUuids: z.array(z.string()).optional().describe("Fetch specific locations"),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
  },
  async ({ searchTerm, entityUuids, limit, offset }) => {
    const body = { limit, offset };
    if (searchTerm) body.searchTerm = searchTerm;
    if (entityUuids?.length) body.entityUuids = entityUuids;
    const data = await client.queryLocations(body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_tasks",
  `List tasks with filters and pagination.

Returns {items: [{taskUuid, title, status, dueDate, entityUuid, allocatedUserUuids, description, resolvedAt, createdAt, source}], total, next, prev}.

Parameters:
- entityUuids: filter by locations (optional)
- taskUuids: fetch specific tasks (optional)
- resolved: true = resolved only, false = open only, omit = all
- limit: 1–100 (default 50)
- offset: for pagination`,
  {
    entityUuids: z.array(z.string()).optional(),
    taskUuids: z.array(z.string()).optional(),
    resolved: z.boolean().optional().describe("true = resolved, false = open, omit = all"),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
  },
  async ({ entityUuids, taskUuids, resolved, limit, offset }) => {
    const body = { limit, offset };
    if (entityUuids?.length) body.entityUuids = entityUuids;
    if (taskUuids?.length) body.taskUuids = taskUuids;
    if (resolved !== undefined) body.resolved = resolved;
    const data = await client.queryTasks(body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Debug (temp) ───────────────────────────────────────────────────────────

server.tool(
  "debug_api",
  "Probe a raw Bowimi API endpoint for exploration. method: GET|POST|QUERY|LIST|PATCH. path: e.g. 'entity-visit'. body: optional JSON string.",
  {
    method: z.string().default("GET"),
    path: z.string(),
    body: z.string().optional(),
    params: z.record(z.string()).optional(),
  },
  async ({ method, path, body, params }) => {
    const base = `${auth.apiBase}/${client.version}`;
    const url = new URL(`${base}/${path}`);
    if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const opts = { method: method.toUpperCase() };
    if (body) opts.body = body;
    let res;
    try {
      res = await auth.fetch(url.toString(), opts);
    } catch (e) {
      return { content: [{ type: "text", text: `Fetch error: ${e.message}` }] };
    }
    const text = await res.text();
    return { content: [{ type: "text", text: `HTTP ${res.status}\n${text.slice(0, 3000)}` }] };
  }
);

// ── Bootstrap ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Bowimi MCP running (account: ${SUBDOMAIN})`);
