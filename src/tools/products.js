import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Products, product cases and distribution profiles.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerProductsTools(server, { client }) {
  server.tool(
    "list_products",
    "List all products",
    {},
    async () => {
      const data = await client.listProducts();
      return jsonResult(data);
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
      return jsonResult(data);
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
      return jsonResult(data);
    }
  );

  server.tool(
    "query_distribution_profiles",
    `List distribution profiles (price lists / assortment configs).

Returns {items: [{profileUuid, name, entityUuid}], total}.`,
    {
      limit: limitParam(100),
      offset: offsetParam,
    },
    async ({ limit, offset }) => {
      const data = await client.queryDistributionProfiles({ limit, offset });
      return jsonResult(data);
    }
  );

  server.tool(
    "query_products",
    `List products with pagination.

Returns {items: [{productUuid, name, sku, ean, description, rangeIds, tagUuids}], total}.`,
    {
      limit: limitParam(100),
      offset: offsetParam,
      searchTerm: z.string().optional(),
    },
    async ({ limit, offset, searchTerm }) => {
      const body = { limit, offset };
      if (searchTerm) body.searchTerm = searchTerm;
      const data = await client.queryProducts(body);
      return jsonResult(data);
    }
  );

  server.tool(
    "update_product",
    "Update a product (name, sku, description, tagUuids).",
    {
      productUuid: z.string(),
      name: z.string().optional(),
      sku: z.string().optional(),
      description: z.string().optional(),
      tagUuids: z.array(z.string()).optional(),
    },
    async ({ productUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateProduct(productUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_product",
    "Delete a product by UUID.",
    { productUuid: z.string() },
    async ({ productUuid }) => {
      const result = await client.deleteProduct(productUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "query_product_cases",
    `List product cases (pack sizes / price configurations).

Returns {items: [{caseId, name, productUuid, profileUuid, caseSize, price, sku}], total}.`,
    {
      productUuids: z.array(z.string()).optional(),
      profileUuids: z.array(z.string()).optional(),
      limit: limitParam(100),
      offset: offsetParam,
    },
    async ({ productUuids, profileUuids, limit, offset }) => {
      const body = { limit, offset };
      if (productUuids?.length) body.productUuids = productUuids;
      if (profileUuids?.length) body.profileUuids = profileUuids;
      const data = await client.queryProductCases(body);
      return jsonResult(data);
    }
  );
}
