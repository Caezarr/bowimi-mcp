import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Tasks.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerTasksTools(server, { client }) {
  server.tool(
    "get_task_summary",
    "Get task counts: available, overdue, today",
    {},
    async () => {
      const data = await client.getTaskSummary();
      return jsonResult(data);
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
      return jsonResult(data);
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
      limit: limitParam(50),
      offset: offsetParam,
    },
    async ({ entityUuids, taskUuids, resolved, limit, offset }) => {
      const body = { limit, offset };
      if (entityUuids?.length) body.entityUuids = entityUuids;
      if (taskUuids?.length) body.taskUuids = taskUuids;
      if (resolved !== undefined) body.resolved = resolved;
      const data = await client.queryTasks(body);
      return jsonResult(data);
    }
  );

  server.tool(
    "update_task",
    `Update a task. Use to resolve/close a task or change its properties.

To resolve: set status to "resolved" or set resolvedAt to current ISO timestamp.`,
    {
      taskUuid: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional().describe('"open" or "resolved"'),
      dueDate: z.string().optional().describe("ISO 8601 date"),
      allocatedUserUuids: z.array(z.string()).optional(),
    },
    async ({ taskUuid, ...data }) => {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const result = await client.updateTask(taskUuid, payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "delete_task",
    "Delete a task by UUID.",
    { taskUuid: z.string() },
    async ({ taskUuid }) => {
      const result = await client.deleteTask(taskUuid);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
