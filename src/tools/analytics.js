import { z } from "zod";
import { jsonResult } from "../result.js";

/**
 * Visit, introduction and team analytics (composite tools).
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerAnalyticsTools(server, { client }) {
  server.tool(
    "get_visit_summary",
    "Get today's visit summary: done yesterday, missed yesterday, remaining today",
    {},
    async () => {
      const data = await client.getVisitSummary();
      return jsonResult(data);
    }
  );

  server.tool(
    "get_insights",
    "Get combined insights: visits, tasks, and orders. Optionally filter by userUuid to get stats for a specific rep (useful for managers).",
    {
      userUuid: z.string().optional().describe("Filter by rep UUID (from list_users). Omit for current user."),
    },
    async ({ userUuid }) => {
      const [visits, tasks, orders] = await Promise.all([
        client.getVisitSummary(),
        client.getTaskSummary(userUuid),
        client.getOrderSummary(userUuid),
      ]);
      const insights = { userUuid: userUuid ?? "current", visits, tasks, orders };
      return { content: [{ type: "text", text: JSON.stringify(insights, null, 2) }] };
    }
  );

  server.tool(
    "get_team_overview",
    `Get task and order stats for every rep in the team — useful for managers.
Calls list_users, then fetches task summary + order summary per user in parallel.`,
    {},
    async () => {
      const users = await client.listUsers();
      if (!users?.length) {
        return { content: [{ type: "text", text: "No users found." }] };
      }

      const reps = await Promise.all(
        users.map(async (u) => {
          const [tasks, orders] = await Promise.all([
            client.getTaskSummary(u.userUuid).catch(() => null),
            client.getOrderSummary(u.userUuid).catch(() => null),
          ]);
          return {
            userUuid: u.userUuid,
            name: u.name,
            email: u.email ?? null,
            tasks,
            orders,
          };
        })
      );

      return { content: [{ type: "text", text: JSON.stringify(reps, null, 2) }] };
    }
  );

  server.tool(
    "get_visit_counts",
    `Count how many route stops were visited in a given period, based on each location's lastContacted date.
Groups results by route group (proxy for rep, since groups are named by rep/day).
Returns: total visited, breakdown by group, and the list of visited locations with their lastContacted date.

LIMITATION: lastContacted is account-wide — it shows when the location was last visited by anyone, not specifically which rep. Use groupName as a proxy for rep attribution.`,
    {
      period: z.enum(["this_week", "this_month", "last_week", "last_month", "custom"]).default("this_week"),
      from: z.string().optional().describe("ISO date for custom period start (e.g. 2026-07-01)"),
      to: z.string().optional().describe("ISO date for custom period end (e.g. 2026-07-31)"),
    },
    async ({ period, from, to }) => {
      const now = new Date();

      let start, end;
      if (period === "custom") {
        start = new Date(from);
        end = to ? new Date(to) : now;
      } else {
        const dow = now.getDay(); // 0=Sun
        const monday = new Date(now); monday.setDate(now.getDate() - ((dow + 6) % 7)); monday.setHours(0,0,0,0);
        const lastMonday = new Date(monday); lastMonday.setDate(monday.getDate() - 7);
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        if (period === "this_week")   { start = monday; end = now; }
        if (period === "last_week")   { start = lastMonday; end = monday; }
        if (period === "this_month")  { start = firstOfMonth; end = now; }
        if (period === "last_month")  { start = firstOfLastMonth; end = firstOfMonth; }
      }

      // Fetch all route stops + entity details
      const stops = await client.getRoute();
      if (!stops?.length) return { content: [{ type: "text", text: "Route is empty." }] };

      const uuids = stops.map(s => s.entityUuid);
      const entityMap = {};
      for (let i = 0; i < uuids.length; i += 50) {
        Object.assign(entityMap, await client.getEntities(uuids.slice(i, i + 50)));
      }

      // Filter by lastContacted in period
      const visited = [];
      const notVisited = [];
      for (const s of stops) {
        const e = entityMap[s.entityUuid] ?? {};
        const lc = e.lastContacted ? new Date(e.lastContacted) : null;
        const inPeriod = lc && lc >= start && lc <= end;
        const entry = {
          entityUuid: s.entityUuid,
          name: e.name ?? null,
          address: e.address ?? null,
          groupName: s.groupName ?? null,
          lastContacted: e.lastContacted ?? null,
        };
        (inPeriod ? visited : notVisited).push(entry);
      }

      // Group visited by groupName
      const byGroup = {};
      for (const v of visited) {
        const g = v.groupName ?? "(no group)";
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(v);
      }

      const result = {
        period: period === "custom" ? `${start.toISOString().slice(0,10)} → ${end.toISOString().slice(0,10)}` : period,
        total_stops: stops.length,
        visited: visited.length,
        not_visited: notVisited.length,
        visit_rate_pct: Math.round((visited.length / stops.length) * 100),
        by_group: Object.entries(byGroup)
          .sort((a, b) => b[1].length - a[1].length)
          .map(([group, stops]) => ({ group, count: stops.length, stops })),
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_weekly_report",
    `Full recap of the week's field sales activity.
Aggregates: visit counts (from lastContacted), task status, orders, route completion, cold stops.
Groups visits by route group as proxy for rep.
Use this for a weekly overview before a team meeting or to send a summary.`,
    {
      weeksAgo: z.number().int().min(0).max(12).default(0).describe("0 = this week, 1 = last week, etc."),
    },
    async ({ weeksAgo }) => {
      const now = new Date();
      const dow = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dow + 6) % 7) - weeksAgo * 7);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      const weekLabel = weeksAgo === 0
        ? `This week (${monday.toISOString().slice(0,10)} → today)`
        : `Week of ${monday.toISOString().slice(0,10)}`;

      // Fetch everything in parallel
      const [stops, visitSummary, taskSummary, orderSummary, users] = await Promise.all([
        client.getRoute(),
        client.getVisitSummary(),
        client.getTaskSummary(),
        client.getOrderSummary(),
        client.listUsers(),
      ]);

      // Enrich stops with entity details
      const uuids = stops.map(s => s.entityUuid);
      const entityMap = {};
      for (let i = 0; i < uuids.length; i += 50) {
        Object.assign(entityMap, await client.getEntities(uuids.slice(i, i + 50)));
      }

      // Count visits this week per group
      const visitedThisWeek = [];
      const coldStops = []; // not visited in 90+ days
      for (const s of stops) {
        const e = entityMap[s.entityUuid] ?? {};
        const lc = e.lastContacted ? new Date(e.lastContacted) : null;
        const entry = {
          entityUuid: s.entityUuid,
          name: e.name ?? null,
          groupName: s.groupName ?? null,
          lastContacted: e.lastContacted ?? null,
        };
        if (lc && lc >= monday && lc < sunday) visitedThisWeek.push(entry);
        const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);
        if (!lc || lc < ninetyDaysAgo) coldStops.push(entry);
      }

      const visitsByGroup = {};
      for (const v of visitedThisWeek) {
        const g = v.groupName ?? "(no group)";
        if (!visitsByGroup[g]) visitsByGroup[g] = 0;
        visitsByGroup[g]++;
      }

      // Per-user task/order stats
      const repStats = await Promise.all(
        users.map(async u => {
          const [t, o] = await Promise.all([
            client.getTaskSummary(u.userUuid).catch(() => null),
            client.getOrderSummary(u.userUuid).catch(() => null),
          ]);
          return { name: u.name, tasks: t, orders: o };
        })
      );

      const report = {
        week: weekLabel,
        visits: {
          total_route_stops: stops.length,
          visited_this_week: visitedThisWeek.length,
          visit_rate_pct: Math.round((visitedThisWeek.length / stops.length) * 100),
          by_group: Object.entries(visitsByGroup)
            .sort((a, b) => b[1] - a[1])
            .map(([group, count]) => ({ group, count })),
          visited_locations: visitedThisWeek,
          note: "Visit attribution by route group (proxy for rep — exact per-rep tracking requires Bowimi /activity endpoint, currently unavailable server-side)",
        },
        tasks: {
          global: taskSummary,
          per_rep: repStats.map(r => ({ name: r.name, ...r.tasks })),
        },
        orders: {
          global: orderSummary,
          per_rep: repStats.map(r => ({ name: r.name, ...r.orders })),
        },
        cold_stops: {
          count: coldStops.length,
          pct_of_route: Math.round((coldStops.length / stops.length) * 100),
          stops: coldStops,
        },
        today: visitSummary,
      };

      return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
    }
  );

  server.tool(
    "get_introductions",
    `Count product introductions from survey responses.

An "introduction" = a survey answer mentioning one or more product references (not "None").
The tool fetches survey activity for the given period, enriches each response with question/answer details, then aggregates counts by rep, location, and product reference.

Returns:
- summary: total introductions, unique locations, unique reps
- by_rep: [{userUuid, repName, count}]
- by_location: [{entityUuid, locationName, count}]
- by_product: [{product, count}]
- details: [{date, repName, locationName, surveyName, products_introduced}]

Parameters:
- from / to: ISO date range (required)
- userUuid: filter to one rep (optional)
- entityUuid: filter to one location (optional)
- introductionKeywords: keywords to identify "introduction" questions (default: ["introduc", "new product", "nouveau", "nieuw", "geïntroduceerd"])`,
    {
      from: z.string().describe("Start date ISO e.g. 2026-07-01"),
      to: z.string().describe("End date ISO e.g. 2026-07-31"),
      userUuid: z.string().optional(),
      entityUuid: z.string().optional(),
      introductionKeywords: z.array(z.string()).default(["introduc", "new product", "nouveau", "nieuw", "geïntroduceerd"]),
    },
    async ({ from, to, userUuid, entityUuid, introductionKeywords }) => {
      // Step 1: fetch all survey responses via official paginated endpoint
      const body = {
        createdAfter: `${from}T00:00:00Z`,
        createdBefore: `${to}T23:59:59Z`,
        limit: 100,
        offset: 0,
      };
      if (entityUuid) body.entityUuids = [entityUuid];

      // Paginate through all responses
      let responses = [];
      let page = await client.querySurveyResponses(body);
      responses.push(...(page.items || []));
      while (page.next && responses.length < 500) {
        page = await client.querySurveyResponses(page.next);
        responses.push(...(page.items || []));
      }

      // Filter by userUuid client-side (API doesn't support userUuid filter on survey-responses)
      if (userUuid) responses = responses.filter(r => r.userUuid === userUuid);

      if (responses.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ summary: { total_introductions: 0, message: "No survey responses found for this period" } }, null, 2) }] };
      }

      // Step 2: fetch user list for name lookup
      let users = [];
      try { users = await client.listUsers(); } catch {}
      const userMap = {};
      for (const u of (Array.isArray(users) ? users : [])) {
        userMap[u.userUuid || u.uuid] = u.name || u.displayName || u.email || u.userUuid;
      }

      // Step 3: fetch survey questions (cached by surveyUuid)
      const surveyCache = {};
      const getSurveyQuestions = async (surveyUuid) => {
        if (!surveyUuid) return [];
        if (!surveyCache[surveyUuid]) {
          try {
            const def = await client.getSurvey(surveyUuid);
            surveyCache[surveyUuid] = def?.questions || [];
          } catch { surveyCache[surveyUuid] = []; }
        }
        return surveyCache[surveyUuid];
      };

      // Step 4: fetch entity names for locations
      const entityUuids = [...new Set(responses.map(r => r.entityUuid).filter(Boolean))];
      const entityMap = {};
      if (entityUuids.length) {
        try {
          const entities = await client.getEntities(entityUuids);
          for (const e of (Array.isArray(entities) ? entities : [])) {
            entityMap[e.entityUuid || e.uuid] = e.name || e.entityUuid;
          }
        } catch {}
      }

      // Step 5: fetch answers concurrently (10 at a time) then identify introductions
      const details = [];
      const byRep = {};
      const byLocation = {};
      const byProduct = {};
      const kws = introductionKeywords.map(k => k.toLowerCase());
      const CONCURRENCY = 10;

      // Pre-cache all survey question sets
      const surveyUuids = [...new Set(responses.map(r => r.surveyUuid).filter(Boolean))];
      await Promise.all(surveyUuids.map(u => getSurveyQuestions(u)));

      // Batch concurrent fetch of answers
      for (let i = 0; i < responses.length; i += CONCURRENCY) {
        const batch = responses.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(resp =>
          client.getSurveyResponseAnswers(resp.responseUuid)
            .then(a => ({ resp, items: a.items || [] }))
            .catch(() => null)
        ));

        for (const result of batchResults) {
          if (!result) continue;
          const { resp, items } = result;

          const questions = surveyCache[resp.surveyUuid] || [];
          const introQuestionUuids = new Set(
            questions
              .filter(q => kws.some(kw => q.text.toLowerCase().includes(kw)))
              .map(q => q.questionUuid)
          );
          if (introQuestionUuids.size === 0) continue;

          const introducedProducts = [];
          for (const item of items) {
            if (!introQuestionUuids.has(item.questionUuid)) continue;
            const raw = item.value || "";
            const vals = raw.split(",").map(v => v.trim())
              .filter(v => v && !["none", "no", "false", "yes"].includes(v.toLowerCase()));
            introducedProducts.push(...vals);
          }
          if (introducedProducts.length === 0) continue;

          const repUuid = resp.userUuid;
          const locUuid = resp.entityUuid;
          const repName = userMap[repUuid] || repUuid || "Unknown";
          const locName = entityMap[locUuid] || locUuid || "Unknown";

          details.push({
            date: resp.createdAt,
            repName,
            locationName: locName,
            products_introduced: introducedProducts,
          });

          if (!byRep[repUuid]) byRep[repUuid] = { userUuid: repUuid, repName, count: 0 };
          byRep[repUuid].count += introducedProducts.length;

          if (!byLocation[locUuid]) byLocation[locUuid] = { entityUuid: locUuid, locationName: locName, count: 0 };
          byLocation[locUuid].count += introducedProducts.length;

          for (const p of introducedProducts) {
            byProduct[p] = (byProduct[p] || 0) + 1;
          }
        }
      }

      const totalIntroductions = Object.values(byProduct).reduce((s, c) => s + c, 0);

      const result = {
        summary: {
          period: { from, to },
          total_introductions: totalIntroductions,
          unique_locations: Object.keys(byLocation).length,
          unique_reps: Object.keys(byRep).length,
          responses_analyzed: responses.length,
        },
        by_rep: Object.values(byRep).sort((a, b) => b.count - a.count),
        by_location: Object.values(byLocation).sort((a, b) => b.count - a.count),
        by_product: Object.entries(byProduct).map(([product, count]) => ({ product, count })).sort((a, b) => b.count - a.count),
        details: details.sort((a, b) => b.date.localeCompare(a.date)),
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
