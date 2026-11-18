import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Orders.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerOrdersTools(server, { client }) {
  server.tool(
    "get_order_summary",
    "Get order totals: last month, this month, this week",
    {},
    async () => {
      const data = await client.getOrderSummary();
      return jsonResult(data);
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
      return jsonResult(data);
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
      return jsonResult(data);
    }
  );

  server.tool(
    "query_orders",
    `List orders with filters and pagination.

Returns {items: [{orderUuid, entityUuid, createdAt, orderedAt, items, brandStatus, distributorStatus, origin, distributorName, accountNumber, createdBy}], total}.

Parameters:
- entityUuids: filter by location(s)
- orderUuids: fetch specific orders
- limit: 1–100 (default 50)
- offset: for pagination`,
    {
      entityUuids: z.array(z.string()).optional(),
      orderUuids: z.array(z.string()).optional(),
      limit: limitParam(50),
      offset: offsetParam,
    },
    async ({ entityUuids, orderUuids, limit, offset }) => {
      const body = { limit, offset };
      if (entityUuids?.length) body.entityUuids = entityUuids;
      if (orderUuids?.length) body.orderUuids = orderUuids;
      const data = await client.queryOrders(body);
      return jsonResult(data);
    }
  );

  server.tool(
    "update_order",
    "Update an order (brandStatus, distributorStatus, notes).",
    {
      orderUuid: z.string(),
      brandStatus: z.string().optional(),
      distributorStatus: z.string().optional(),
      brandNotes: z.string().optional(),
      distributorNotes: z.string().optional(),
    },
    async ({ orderUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateOrder(orderUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_order",
    "Delete an order by UUID.",
    { orderUuid: z.string() },
    async ({ orderUuid }) => {
      const result = await client.deleteOrder(orderUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
