import { z } from "zod";
import { jsonResult } from "../result.js";
import { offsetParam, limitParam } from "../schemas.js";

/**
 * Surveys, survey responses and the activity feed.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerSurveysTools(server, { client }) {
  server.tool(
    "list_surveys",
    "List all surveys with their questions",
    {},
    async () => {
      const data = await client.listSurveys();
      return jsonResult(data);
    }
  );

  server.tool(
    "get_activity",
    `Get raw activity feed. Returns visits, survey responses, orders or tasks logged in Bowimi.

Filter options (all optional):
- type: "all" | "survey" | "order" | "task" (default "all")
- entityUuid: filter by location
- userUuid: filter by rep
- from / to: ISO date strings (e.g. "2026-07-01")
- snowDay: pagination cursor — pass the last snowDay value from a previous call to get older records
- limit: max records to return (default 50, max 200)

Each record has: activityId, date, snowDay, userUuid, entityUuid, details._type, and for surveys: details.responseUuid, details.surveyName.`,
    {
      type: z.enum(["all", "survey", "order", "task"]).default("all"),
      entityUuid: z.string().optional(),
      userUuid: z.string().optional(),
      from: z.string().optional().describe("ISO date e.g. 2026-07-01"),
      to: z.string().optional().describe("ISO date e.g. 2026-07-31"),
      snowDay: z.string().optional().describe("Pagination cursor from previous call"),
      limit: z.number().int().min(1).max(200).default(50),
    },
    async ({ type, entityUuid, userUuid, from, to, snowDay, limit }) => {
      const filter = { _type: type };
      if (entityUuid) filter.entityUuid = entityUuid;
      if (userUuid) filter.userUuid = userUuid;
      if (from) filter.from = from;
      if (to) filter.to = to;
      if (snowDay) filter.snowDay = snowDay;
      filter.limit = limit;

      const data = await client.getActivity(filter);
      return jsonResult(data);
    }
  );

  server.tool(
    "get_survey",
    "Get survey definition with all questions (text, type, choices). Use to map questionUuid → question text when reading survey responses.",
    {
      surveyUuid: z.string().describe("Survey UUID"),
    },
    async ({ surveyUuid }) => {
      const data = await client.getSurvey(surveyUuid);
      return jsonResult(data);
    }
  );

  server.tool(
    "get_survey_response",
    `Get answers for a survey response by responseUuid.

Returns {responseUuid, items: [{questionUuid, value}], total}.
Use get_survey to map questionUuid → question text.

To find responseUuids: use list_survey_responses.`,
    {
      responseUuid: z.string().describe("Response UUID"),
    },
    async ({ responseUuid }) => {
      const data = await client.getSurveyResponseAnswers(responseUuid);
      return jsonResult(data);
    }
  );

  server.tool(
    "list_survey_responses",
    `List survey responses with pagination and filters.

Returns {items: [{createdAt, entityUuid, responseUuid, surveyUuid, userUuid, verified}], total, next, prev}.

Filters (all optional):
- createdAfter / createdBefore: ISO datetime e.g. "2026-07-01T00:00:00Z"
- entityUuids: filter by locations (array)
- surveyUuids: filter by surveys (array)
- responseUuids: fetch specific responses (array)
- limit: 1–100 (default 50)
- offset: for pagination`,
    {
      createdAfter: z.string().optional().describe("ISO datetime e.g. 2026-07-01T00:00:00Z"),
      createdBefore: z.string().optional().describe("ISO datetime e.g. 2026-07-31T23:59:59Z"),
      entityUuids: z.array(z.string()).optional(),
      surveyUuids: z.array(z.string()).optional(),
      responseUuids: z.array(z.string()).optional(),
      limit: limitParam(50),
      offset: offsetParam,
    },
    async ({ createdAfter, createdBefore, entityUuids, surveyUuids, responseUuids, limit, offset }) => {
      const body = { limit, offset };
      if (createdAfter) body.createdAfter = createdAfter;
      if (createdBefore) body.createdBefore = createdBefore;
      if (entityUuids?.length) body.entityUuids = entityUuids;
      if (surveyUuids?.length) body.surveyUuids = surveyUuids;
      if (responseUuids?.length) body.responseUuids = responseUuids;
      const data = await client.querySurveyResponses(body);
      return jsonResult(data);
    }
  );

  server.tool(
    "query_surveys",
    `List all surveys with pagination.

Returns {items: [{surveyUuid, name, active, createdAt, questionUuids}], total}.`,
    {
      limit: limitParam(100),
      offset: offsetParam,
    },
    async ({ limit, offset }) => {
      const data = await client.querySurveys({ limit, offset });
      return jsonResult(data);
    }
  );
}
