import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Companies and contacts.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerCompaniesTools(server, { client }) {
  server.tool(
    "list_companies",
    "List all company/RTM UUIDs",
    {},
    async () => {
      const data = await client.listCompanyUuids();
      return jsonResult(data);
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
      return jsonResult(data);
    }
  );

  server.tool(
    "get_contacts",
    "Get contacts by UUID",
    {
      contactUuids: z.array(z.string()),
    },
    async ({ contactUuids }) => {
      const data = await client.getContacts(contactUuids);
      return jsonResult(data);
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
      return jsonResult(data);
    }
  );

  server.tool(
    "query_companies",
    `List companies/distributors with pagination.

Returns {items: [{entityUuid, name, accountNumber, domain, isDistributor, isPrimaryCompany, tagUuids}], total}.`,
    {
      searchTerm: z.string().optional(),
      limit: limitParam(50),
      offset: offsetParam,
    },
    async ({ searchTerm, limit, offset }) => {
      const body = { limit, offset };
      if (searchTerm) body.searchTerm = searchTerm;
      const data = await client.queryCompanies(body);
      return jsonResult(data);
    }
  );

  server.tool(
    "update_company",
    "Update a company/distributor (name, accountNumber, domain, notes, tagUuids).",
    {
      entityUuid: z.string(),
      name: z.string().optional(),
      accountNumber: z.string().optional(),
      domain: z.string().optional(),
      notes: z.string().optional(),
      tagUuids: z.array(z.string()).optional(),
    },
    async ({ entityUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateCompany(entityUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_company",
    "Delete a company by UUID.",
    { entityUuid: z.string() },
    async ({ entityUuid }) => {
      const result = await client.deleteCompany(entityUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
