import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Custom attributes on entities.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerAttributesTools(server, { client }) {
  server.tool(
    "query_attributes",
    `List all custom attribute definitions.

Returns {items: [{attributeUuid, name, jsonName, description, schema, scopes, pinned, sequence}], total}.`,
    {
      limit: limitParam(100),
      offset: offsetParam,
    },
    async ({ limit, offset }) => {
      const data = await client.queryAttributes({ limit, offset });
      return jsonResult(data);
    }
  );

  server.tool(
    "get_entity_attributes",
    "Get custom attribute values for a location/entity.",
    { entityUuid: z.string() },
    async ({ entityUuid }) => {
      const data = await client.getEntityAttributes(entityUuid);
      return jsonResult(data);
    }
  );

  server.tool(
    "set_entity_attributes",
    "Set custom attribute values for a location/entity. Pass an array of {attributeUuid, data} objects.",
    {
      entityUuid: z.string(),
      attributes: z.array(z.object({
        attributeUuid: z.string(),
        data: z.any(),
      })),
    },
    async ({ entityUuid, attributes }) => {
      const result = await client.setEntityAttributes(entityUuid, attributes);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "query_entity_attributes",
    "Query attribute values across multiple entities.",
    {
      entityUuids: z.array(z.string()).optional(),
      attributeUuids: z.array(z.string()).optional(),
      limit: limitParam(50),
      offset: offsetParam,
    },
    async ({ entityUuids, attributeUuids, limit, offset }) => {
      const body = { limit, offset };
      if (entityUuids?.length) body.entityUuids = entityUuids;
      if (attributeUuids?.length) body.attributeUuids = attributeUuids;
      const data = await client.queryEntityAttributes(body);
      return jsonResult(data);
    }
  );
}
