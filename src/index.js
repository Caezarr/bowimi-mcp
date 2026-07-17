#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BowimiAuth } from "./auth.js";
import { BowimiClient } from "./client.js";

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
  version: "1.0.0",
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
  "Get My Route: current user's planned stops ordered by sequence, with location name, group, and coordinates",
  {
    includeDetails: z.boolean().default(true).describe("Fetch location names for each stop"),
  },
  async ({ includeDetails }) => {
    const stops = await client.getRoute();
    if (!includeDetails || !stops?.length) {
      return { content: [{ type: "text", text: JSON.stringify(stops, null, 2) }] };
    }
    // Enrich stops with entity names (batch, max 50 at a time)
    const uuids = stops.map(s => s.entityUuid);
    const batches = [];
    for (let i = 0; i < uuids.length; i += 50) batches.push(uuids.slice(i, i + 50));
    const entityMap = {};
    for (const batch of batches) {
      const data = await client.getEntities(batch);
      Object.assign(entityMap, data);
    }
    const enriched = stops.map(s => ({
      ...s,
      name: entityMap[s.entityUuid]?.name ?? null,
      address: entityMap[s.entityUuid]?.address ?? null,
      lastContacted: entityMap[s.entityUuid]?.lastContacted ?? null,
    }));
    return { content: [{ type: "text", text: JSON.stringify(enriched, null, 2) }] };
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
  "get_insights",
  "Get insights dashboard: visits, tasks, orders, and recent activity summary",
  {},
  async () => {
    const [visits, tasks, orders] = await Promise.all([
      client.getVisitSummary(),
      client.getTaskSummary(),
      client.getOrderSummary(),
    ]);
    const insights = { visits, tasks, orders };
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
