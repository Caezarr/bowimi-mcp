import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Tags and tag groups.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerTagsTools(server, { client }) {
  server.tool(
    "list_tags",
    "List tag groups and their tags. Filter by intent: 'location', 'company', or omit for all",
    {
      intent: z.enum(["location", "company"]).optional(),
    },
    async ({ intent }) => {
      const data = await client.listTags(intent);
      return jsonResult(data);
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
      return jsonResult(data);
    }
  );

  server.tool(
    "query_tags",
    `List all tags with pagination.

Returns {items: [{tagUuid, name, colour, groupName, tagGroupUuid, tagIndex}], total}.

Parameters:
- limit: 1–100 (default 100)
- offset: for pagination`,
    {
      limit: limitParam(100),
      offset: offsetParam,
    },
    async ({ limit, offset }) => {
      const data = await client.queryTags({ limit, offset });
      return jsonResult(data);
    }
  );

  server.tool(
    "update_tag",
    "Update a tag (name, colour, tagGroupUuid).",
    {
      tagUuid: z.string(),
      name: z.string().optional(),
      colour: z.string().optional(),
      tagGroupUuid: z.string().optional(),
    },
    async ({ tagUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateTag(tagUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_tag",
    "Delete a tag by UUID.",
    { tagUuid: z.string() },
    async ({ tagUuid }) => {
      const result = await client.deleteTag(tagUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "query_tag_groups",
    `List all tag groups.

Returns {items: [{tagGroupUuid, name, index, pipeline, scopes}], total}.`,
    {
      limit: limitParam(100),
      offset: offsetParam,
    },
    async ({ limit, offset }) => {
      const data = await client.queryTagGroups({ limit, offset });
      return jsonResult(data);
    }
  );

  server.tool(
    "create_tag_group",
    "Create a new tag group.",
    {
      name: z.string(),
      index: z.number().int().optional(),
      pipeline: z.boolean().optional(),
      scopes: z.array(z.string()).optional(),
    },
    async (data) => {
      const result = await client.createTagGroup(data);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "update_tag_group",
    "Update a tag group (name, index, pipeline, scopes).",
    {
      tagGroupUuid: z.string(),
      name: z.string().optional(),
      index: z.number().int().optional(),
      pipeline: z.boolean().optional(),
      scopes: z.array(z.string()).optional(),
    },
    async ({ tagGroupUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateTagGroup(tagGroupUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_tag_group",
    "Delete a tag group by UUID.",
    { tagGroupUuid: z.string() },
    async ({ tagGroupUuid }) => {
      const result = await client.deleteTagGroup(tagGroupUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
