import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Account, users, roles, teams and shortcuts.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerAccountTools(server, { client }) {
  server.tool(
    "get_app_info",
    "Get Bowimi account info: brand details and permission keys",
    {},
    async () => {
      const data = await client.getAppInfo();
      return jsonResult(data);
    }
  );

  server.tool(
    "list_users",
    "List all users in the Bowimi account",
    {},
    async () => {
      const data = await client.listUsers();
      return jsonResult(data);
    }
  );

  server.tool(
    "get_current_user",
    "Get the currently authenticated user",
    {},
    async () => {
      const data = await client.getCurrentUser();
      return jsonResult(data);
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
      return jsonResult(data);
    }
  );

  server.tool(
    "list_shortcuts",
    "List saved location/entity shortcuts (pre-filtered views)",
    {},
    async () => {
      const data = await client.listShortcuts();
      return jsonResult(data);
    }
  );

  server.tool(
    "query_users",
    `List all users with pagination.

Returns {items: [{userUuid, name, friendlyName, emailAddress, enabled, roleUuids, owner}], total}.

Parameters:
- limit: 1–100 (default 50)
- offset: for pagination`,
    {
      limit: limitParam(50),
      offset: offsetParam,
    },
    async ({ limit, offset }) => {
      const data = await client.queryUsers({ limit, offset });
      return jsonResult(data);
    }
  );

  server.tool(
    "update_user",
    "Update a user's properties (name, friendlyName, roleUuids, enabled).",
    {
      userUuid: z.string().describe("User UUID"),
      name: z.string().optional(),
      friendlyName: z.string().optional(),
      enabled: z.boolean().optional(),
      roleUuids: z.array(z.string()).optional(),
    },
    async ({ userUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateUser(userUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_user",
    "Delete a user by UUID.",
    { userUuid: z.string() },
    async ({ userUuid }) => {
      const result = await client.deleteUser(userUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "query_roles",
    "List all roles with their permission keys.",
    {
      limit: limitParam(100),
      offset: offsetParam,
    },
    async ({ limit, offset }) => {
      const data = await client.queryRoles({ limit, offset });
      return jsonResult(data);
    }
  );

  server.tool(
    "create_role",
    "Create a new role with a set of permission keys.",
    {
      name: z.string(),
      permissionKeys: z.array(z.string()).optional(),
    },
    async (data) => {
      const result = await client.createRole(data);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "update_role",
    "Update a role (name, permissionKeys).",
    {
      roleUuid: z.string(),
      name: z.string().optional(),
      permissionKeys: z.array(z.string()).optional(),
    },
    async ({ roleUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateRole(roleUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_role",
    "Delete a role by UUID.",
    { roleUuid: z.string() },
    async ({ roleUuid }) => {
      const result = await client.deleteRole(roleUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "query_teams",
    "List all teams.",
    {
      limit: limitParam(100),
      offset: offsetParam,
    },
    async ({ limit, offset }) => {
      const data = await client.queryTeams({ limit, offset });
      return jsonResult(data);
    }
  );

  server.tool(
    "create_team",
    "Create a new team.",
    {
      name: z.string(),
      shortName: z.string().optional(),
      colour: z.string().optional(),
    },
    async (data) => {
      const result = await client.createTeam(data);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "update_team",
    "Update a team (name, shortName, colour).",
    {
      teamUuid: z.string(),
      name: z.string().optional(),
      shortName: z.string().optional(),
      colour: z.string().optional(),
    },
    async ({ teamUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateTeam(teamUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_team",
    "Delete a team by UUID.",
    { teamUuid: z.string() },
    async ({ teamUuid }) => {
      const result = await client.deleteTeam(teamUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_team_members",
    "Get members of a team.",
    { teamUuid: z.string() },
    async ({ teamUuid }) => {
      const data = await client.getTeamMembers(teamUuid);
      return jsonResult(data);
    }
  );

  server.tool(
    "add_team_member",
    "Add a user to a team.",
    {
      teamUuid: z.string(),
      userUuid: z.string(),
    },
    async ({ teamUuid, userUuid }) => {
      const result = await client.addTeamMember(teamUuid, userUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "remove_team_member",
    "Remove a user from a team.",
    {
      teamUuid: z.string(),
      userUuid: z.string(),
    },
    async ({ teamUuid, userUuid }) => {
      const result = await client.removeTeamMember(teamUuid, userUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
