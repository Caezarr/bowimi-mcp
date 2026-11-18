import { z } from "zod";

/**
 * The authenticated rep's route and route-derived views.
 *
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../server.js").ToolContext} ctx
 */
export function registerRouteTools(server, { client }) {
  server.tool(
    "get_route",
    `Get the current user's planned stops (My Route) enriched with location details.

Returns all stops with: name, address, coordinates, group name, completion status, lastContacted date.

Filtering (all optional, applied client-side after fetch):
- groupFilter: partial match on group name (case-insensitive), e.g. "namur", "horeca"
- textFilter: partial match on location name or address
- notVisitedSince: ISO date — only stops where lastContacted is null or before this date
- completedOnly / pendingOnly: filter by completion status

NOTE: This is the primary way to discover locations in Bowimi. The geographic search endpoint is unavailable server-side. If a region is not represented here, those locations have not been added to the current user's route in Bowimi.`,
    {
      includeDetails: z.boolean().default(true).describe("Fetch full location details (name, address, lastContacted). Disable only if you just need UUIDs."),
      groupFilter: z.string().optional().describe("Filter stops by group name (partial, case-insensitive). E.g. 'namur', 'horeca bxl'"),
      textFilter: z.string().optional().describe("Filter stops by location name or address (partial, case-insensitive)"),
      notVisitedSince: z.string().optional().describe("ISO 8601 date — return only stops not contacted since this date (or never)"),
      completedOnly: z.boolean().optional().describe("Only return completed stops"),
      pendingOnly: z.boolean().optional().describe("Only return pending (not yet completed) stops"),
    },
    async ({ includeDetails, groupFilter, textFilter, notVisitedSince, completedOnly, pendingOnly }) => {
      const stops = await client.getRoute();
      if (!stops?.length) {
        return { content: [{ type: "text", text: "Route is empty." }] };
      }

      let result = stops;

      // Apply group filter before fetching details (saves API calls)
      if (groupFilter) {
        const gf = groupFilter.toLowerCase();
        result = result.filter(s => s.groupName?.toLowerCase().includes(gf));
      }
      if (completedOnly) result = result.filter(s => s.complete === true);
      if (pendingOnly) result = result.filter(s => s.complete !== true);

      if (!includeDetails) {
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Enrich with entity details (batch 50 at a time)
      const uuids = result.map(s => s.entityUuid);
      const entityMap = {};
      for (let i = 0; i < uuids.length; i += 50) {
        const batch = uuids.slice(i, i + 50);
        const data = await client.getEntities(batch);
        Object.assign(entityMap, data);
      }

      let enriched = result.map(s => {
        const e = entityMap[s.entityUuid] ?? {};
        return {
          sequence: s.sequence,
          entityUuid: s.entityUuid,
          complete: s.complete,
          groupName: s.groupName ?? null,
          name: e.name ?? null,
          address: e.address ?? null,
          coordinates: e.coordinates ?? null,
          lastContacted: e.lastContacted ?? null,
          phone: e.phone ?? null,
        };
      });

      // Post-enrich filters
      if (textFilter) {
        const tf = textFilter.toLowerCase();
        enriched = enriched.filter(s =>
          s.name?.toLowerCase().includes(tf) || s.address?.toLowerCase().includes(tf)
        );
      }
      if (notVisitedSince) {
        const cutoff = new Date(notVisitedSince);
        enriched = enriched.filter(s =>
          !s.lastContacted || new Date(s.lastContacted) < cutoff
        );
      }

      const summary = {
        total_route_stops: stops.length,
        returned: enriched.length,
        groups: [...new Set(enriched.map(s => s.groupName).filter(Boolean))],
        stops: enriched,
      };

      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.tool(
    "get_route_summary",
    `Fast overview of the current user's route without fetching full location details.
Returns: total stop count, completion rate, breakdown by group, list of all groups.
Use this for a quick status check before deciding which stops to investigate further.`,
    {},
    async () => {
      const stops = await client.getRoute();
      if (!stops?.length) {
        return { content: [{ type: "text", text: JSON.stringify({ total: 0, groups: [] }) }] };
      }

      const groups = {};
      for (const s of stops) {
        const g = s.groupName ?? "(no group)";
        if (!groups[g]) groups[g] = { name: g, total: 0, completed: 0 };
        groups[g].total++;
        if (s.complete) groups[g].completed++;
      }

      const total = stops.length;
      const completed = stops.filter(s => s.complete).length;

      const summary = {
        total_stops: total,
        completed,
        pending: total - completed,
        completion_pct: Math.round((completed / total) * 100),
        groups: Object.values(groups).sort((a, b) => b.total - a.total),
      };

      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.tool(
    "get_route_stops_with_tasks",
    `Return route stops that have at least one pending task.
Fetches the full route, checks task status for all stops in parallel batches, and returns only the ones with active tasks — enriched with location name and address.`,
    {
      includeCompleted: z.boolean().default(false).describe("Also include stops with completed tasks"),
    },
    async ({ includeCompleted }) => {
      const stops = await client.getRoute();
      if (!stops?.length) {
        return { content: [{ type: "text", text: "Route is empty." }] };
      }

      const uuids = stops.map(s => s.entityUuid);

      // Batch task-status and entity details in parallel
      const BATCH = 50;
      const taskMap = {};
      const entityMap = {};

      const batches = [];
      for (let i = 0; i < uuids.length; i += BATCH) batches.push(uuids.slice(i, i + BATCH));

      await Promise.all(
        batches.flatMap(batch => [
          client.getEntityTaskStatuses(batch).then(d => Object.assign(taskMap, d)),
          client.getEntities(batch).then(d => Object.assign(entityMap, d)),
        ])
      );

      const withTasks = stops
        .filter(s => {
          const ts = taskMap[s.entityUuid];
          if (!ts) return false;
          if (includeCompleted) return true;
          return ts.pendingCount > 0 || ts.overdueCount > 0 || (typeof ts === "object" && ts !== null);
        })
        .map(s => {
          const e = entityMap[s.entityUuid] ?? {};
          return {
            sequence: s.sequence,
            entityUuid: s.entityUuid,
            groupName: s.groupName ?? null,
            name: e.name ?? null,
            address: e.address ?? null,
            lastContacted: e.lastContacted ?? null,
            taskStatus: taskMap[s.entityUuid],
          };
        });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ count: withTasks.length, stops: withTasks }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "find_route_stops_by_tag",
    `Find route stops that have a specific tag applied.
Useful for: "show me all Horeca stops", "which stops are tagged High priority?", "find Delhaize locations on my route".
Pass a tag name (partial, case-insensitive, matches tag name OR group name) or an exact tag UUID.
Use list_tags first to see available tag groups and tag names.`,
    {
      tagName: z.string().optional().describe("Tag name or group name to search (partial, case-insensitive). E.g. 'horeca', 'high', 'delhaize', 'retail'"),
      tagUuid: z.string().optional().describe("Exact tag UUID (from list_tags). Takes priority over tagName."),
    },
    async ({ tagName, tagUuid }) => {
      if (!tagName && !tagUuid) {
        return { content: [{ type: "text", text: "Provide tagName or tagUuid." }] };
      }

      // Resolve tagUuid — match on tagName OR groupName
      let resolvedTagUuid = tagUuid;
      let resolvedTagLabel = tagUuid;
      if (!resolvedTagUuid && tagName) {
        const allTags = await client.listTags();
        const needle = tagName.toLowerCase();
        // First try exact tag name match, then group match (returns all tags in group)
        const candidates = [];
        for (const group of (allTags ?? [])) {
          for (const tag of (group.tags ?? [])) {
            if (tag.tagName?.toLowerCase().includes(needle)) {
              candidates.push({ tagUuid: tag.tagUuid, label: `${group.groupName} / ${tag.tagName}` });
            }
          }
        }
        // If no tag-name match, try group-name match (return first tag in group as hint)
        if (!candidates.length) {
          for (const group of (allTags ?? [])) {
            if (group.groupName?.toLowerCase().includes(needle)) {
              for (const tag of (group.tags ?? [])) {
                candidates.push({ tagUuid: tag.tagUuid, label: `${group.groupName} / ${tag.tagName}` });
              }
            }
          }
        }
        if (!candidates.length) {
          return { content: [{ type: "text", text: `No tag found matching "${tagName}". Use list_tags to see all available tags.` }] };
        }
        if (candidates.length > 1) {
          // Return all matching tags so user can pick
          return {
            content: [{
              type: "text",
              text: `Multiple tags match "${tagName}". Specify tagUuid:\n${candidates.map(c => `  ${c.label} → ${c.tagUuid}`).join("\n")}`,
            }],
          };
        }
        resolvedTagUuid = candidates[0].tagUuid;
        resolvedTagLabel = candidates[0].label;
      }

      const stops = await client.getRoute();
      if (!stops?.length) {
        return { content: [{ type: "text", text: "Route is empty." }] };
      }

      const uuids = stops.map(s => s.entityUuid);
      const BATCH = 50;
      const tagsMap = {};
      const entityMap = {};

      const batches = [];
      for (let i = 0; i < uuids.length; i += BATCH) batches.push(uuids.slice(i, i + BATCH));

      await Promise.all(
        batches.flatMap(b => [
          client.getEntityTags(b).then(d => Object.assign(tagsMap, d)),
          client.getEntities(b).then(d => Object.assign(entityMap, d)),
        ])
      );

      const matched = stops
        .filter(s => (tagsMap[s.entityUuid] ?? []).includes(resolvedTagUuid))
        .map(s => {
          const e = entityMap[s.entityUuid] ?? {};
          return {
            sequence: s.sequence,
            entityUuid: s.entityUuid,
            groupName: s.groupName ?? null,
            name: e.name ?? null,
            address: e.address ?? null,
            lastContacted: e.lastContacted ?? null,
          };
        });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ tag: resolvedTagLabel, tagUuid: resolvedTagUuid, count: matched.length, stops: matched }, null, 2),
        }],
      };
    }
  );
}
