import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Locations (outlets) and their tags, products, contacts and tasks.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerLocationsTools(server, { client }) {
  server.tool(
    "get_location",
    "Get full details for one or more locations by UUID",
    {
      entityUuids: z.array(z.string()).describe("List of entity/location UUIDs"),
    },
    async ({ entityUuids }) => {
      const data = await client.getEntities(entityUuids);
      return jsonResult(data);
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
      return jsonResult(data);
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
      return jsonResult(data);
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
      return jsonResult(data);
    }
  );

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

  server.tool(
    "get_location_task_status",
    "Get task status for one or more locations. Returns pending/overdue task info per location UUID.",
    {
      entityUuids: z.array(z.string()).describe("Location UUIDs to check (from get_route or get_location)"),
    },
    async ({ entityUuids }) => {
      const data = await client.getEntityTaskStatuses(entityUuids);
      return jsonResult(data);
    }
  );

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
      limit: limitParam(50),
      offset: offsetParam,
    },
    async ({ searchTerm, entityUuids, limit, offset }) => {
      const body = { limit, offset };
      if (searchTerm) body.searchTerm = searchTerm;
      if (entityUuids?.length) body.entityUuids = entityUuids;
      const data = await client.queryLocations(body);
      return jsonResult(data);
    }
  );

  server.tool(
    "update_location",
    "Update a location's properties (name, address, notes, tagUuids, etc.).",
    {
      entityUuid: z.string(),
      name: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
      tagUuids: z.array(z.string()).optional(),
      accountNumber: z.string().optional(),
    },
    async ({ entityUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateLocation(entityUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_location",
    "Delete a location/entity by UUID.",
    { entityUuid: z.string() },
    async ({ entityUuid }) => {
      const result = await client.deleteLocation(entityUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
