import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, summaryForList, toolResult, toolError } from "../util.js";
import type { Tag } from "../types.js";

/** Registers the list_tags tool for retrieving category tags. */
export function registerTagsTool(server: McpServer, client: PeecApiClient) {
  server.tool(
    "list_tags",
    "List category tags for a Peec.ai project. Returns tag IDs and names.",
    {
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      limit: z.number().min(1).max(10000).default(1000).describe("Max results (1-10000)").optional(),
      offset: z.number().min(0).default(0).describe("Results to skip").optional(),
    },
    async ({ project_id, limit, offset }) => {
      try {
        const data = await client.get<Tag[]>("/tags", {
          project_id: requireProjectId(project_id),
          limit,
          offset,
        });
        return toolResult({ _summary: summaryForList("tags", data), tags: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
