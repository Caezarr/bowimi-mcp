#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BowimiAuth } from "./auth.js";
import { BowimiClient } from "./client.js";

const LOCAL_VERSION = "1.1.0";
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

// ── Bootstrap ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Bowimi MCP running (account: ${SUBDOMAIN})`);
